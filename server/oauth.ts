import { Express } from "express";
import { storage } from "./storage";
import { z } from "zod";
import { jwtService } from "./jwt";
import crypto from "crypto";
import { SessionData } from "express-session";
import { filterUserByScopes, getAllowedAttributes } from "@shared/schema";

// Extend the Session type to include returnTo
declare module "express-session" {
  interface SessionData {
    returnTo?: string;
  }
}

// Store pending OAuth requests with a temporary key
const pendingAuthorizations = new Map<string, {
  clientId: string;
  redirectUri: string;
  responseType: string;
  scope?: string;
  state?: string;
}>();

const authorizationSchema = z.object({
  response_type: z.enum(["code", "token"]),
  client_id: z.string(),
  redirect_uri: z.string().url(),
  scope: z.string().optional(),
  state: z.string().optional(),
});

const tokenSchema = z.object({
  grant_type: z.enum(["authorization_code", "refresh_token", "client_credentials", "implicit"]),
  code: z.string().optional(),
  refresh_token: z.string().optional(),
  redirect_uri: z.string().url().optional(),
  client_id: z.string(),
  client_secret: z.string().optional(), // Optional for implicit flow
  scope: z.string().optional(),
});

function validateScopes(requestedScopes: string[] | undefined, allowedScopes: string[]): string[] {
  if (!requestedScopes || requestedScopes.length === 0) {
    // If no scopes requested, grant minimum 'read' scope if allowed
    return allowedScopes.includes('read') ? ['read'] : [];
  }
  // Only grant scopes that are allowed for the client
  return requestedScopes.filter(scope => allowedScopes.includes(scope));
}

// Schema for token introspection requests
const introspectionSchema = z.object({
  token: z.string(),
  token_type_hint: z.enum(["access_token", "refresh_token"]).optional(),
});

// Schema for token revocation requests
const revocationSchema = z.object({
  token: z.string(),
  token_type_hint: z.enum(["access_token", "refresh_token"]).optional(),
});

export function setupOAuth(app: Express) {
  // Add OAuth2 Metadata endpoint
  app.get("/.well-known/oauth-authorization-server", (_req, res) => {
    const baseUrl = process.env.BASE_URL || `http://localhost:5000`;

    res.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      jwks_uri: `${baseUrl}/.well-known/jwks.json`,
      response_types_supported: ["code", "token"],
      grant_types_supported: [
        "authorization_code",
        "client_credentials",
        "refresh_token",
        "implicit"
      ],
      token_endpoint_auth_methods_supported: [
        "client_secret_basic",
        "client_secret_post"
      ],
      scopes_supported: ["read", "write", "admin"],
      claims_supported: ["sub", "iss", "exp", "iat", "client_id", "scope"],
      id_token_signing_alg_values_supported: ["RS256"],
      service_documentation: `${baseUrl}/docs`,
      ui_locales_supported: ["en-US"],
      op_tos_uri: `${baseUrl}/terms`,
      op_policy_uri: `${baseUrl}/privacy`,
      code_challenge_methods_supported: ["S256", "plain"],
      introspection_endpoint: `${baseUrl}/oauth/introspect`,
      revocation_endpoint: `${baseUrl}/oauth/revoke`,
    });
  });

  // Add JWKS endpoint
  app.get("/.well-known/jwks.json", async (req, res) => {
    try {
      const publicKey = await jwtService.getPublicKey();
      if (!publicKey) {
        return res.status(500).send("No active key pair found");
      }

      // Convert PEM to JWK format
      const jwk = await jwtService.getJWKS();
      res.json({
        keys: [jwk]
      });
    } catch (error) {
      res.status(500).send("Error retrieving public key");
    }
  });

  // Authorization endpoint
  app.get("/oauth/authorize", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        // Generate a temporary state key
        const tempState = crypto.randomBytes(16).toString('hex');

        // Store the OAuth request parameters
        pendingAuthorizations.set(tempState, {
          clientId: req.query.client_id as string,
          redirectUri: req.query.redirect_uri as string,
          responseType: req.query.response_type as string,
          scope: req.query.scope as string,
          state: req.query.state as string,
        });

        // Save the return URL in the session - important for redirects to work properly
        req.session.returnTo = `/api/oauth/complete/${tempState}`;
        
        // Redirect to login with the temporary state
        return res.redirect(`/auth?oauth_state=${tempState}`);
      }

      const params = authorizationSchema.parse(req.query);
      const client = await storage.getClientByClientId(params.client_id);

      if (!client) {
        return res.status(400).send("Invalid client_id");
      }

      if (!client.redirectUris.includes(params.redirect_uri)) {
        return res.status(400).send("Invalid redirect_uri");
      }

      // Validate and filter requested scopes
      const requestedScopes = params.scope?.split(" ");
      const validScopes = validateScopes(requestedScopes, client.allowedScopes);

      if (requestedScopes && validScopes.length === 0) {
        return res.status(400).send("Invalid or insufficient scopes requested");
      }

      // Handle implicit flow
      if (params.response_type === "token") {
        const tokenPayload = {
          sub: req.user!._id.toString(),
          client_id: client._id.toString(),
          scope: validScopes,
          type: "access_token"
        };

        const accessToken = await jwtService.generateAccessToken(tokenPayload);

        // Redirect with token in fragment
        const redirectUrl = new URL(params.redirect_uri);
        redirectUrl.hash = `access_token=${accessToken}&token_type=Bearer&expires_in=3600&scope=${validScopes.join(" ")}`;
        if (params.state) {
          redirectUrl.hash += `&state=${params.state}`;
        }
        return res.redirect(redirectUrl.toString());
      }

      // Handle authorization code flow
      const code = crypto.randomBytes(32).toString("hex");
      await storage.createAuthCode({
        code,
        clientId: client._id.toString(),
        userId: req.user!._id.toString(),
        scope: validScopes,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      });

      const redirectUrl = new URL(params.redirect_uri);
      redirectUrl.searchParams.set("code", code);
      if (params.state) {
        redirectUrl.searchParams.set("state", params.state);
      }
      redirectUrl.searchParams.set("scope", validScopes.join(" "));

      res.redirect(redirectUrl.toString());
    } catch (error) {
      res.status(400).send(error instanceof Error ? error.message : "Invalid request");
    }
  });

  // Add endpoint to check stored OAuth state
  app.get("/api/oauth/check-state/:state", (req, res) => {
    const storedRequest = pendingAuthorizations.get(req.params.state);
    if (!storedRequest) {
      return res.status(404).json({ error: "No pending authorization request" });
    }
    res.json(storedRequest);
  });

  // Add endpoint to complete OAuth flow after authentication
  app.get("/api/oauth/complete/:state", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Authentication required");
    }

    const storedRequest = pendingAuthorizations.get(req.params.state);
    if (!storedRequest) {
      return res.status(404).json({ error: "No pending authorization request" });
    }

    // Clean up the stored request
    pendingAuthorizations.delete(req.params.state);

    // Redirect back to the authorization endpoint with the original parameters
    const url = new URL("/oauth/authorize", req.protocol + "://" + req.get("host"));
    url.searchParams.set("response_type", storedRequest.responseType);
    url.searchParams.set("client_id", storedRequest.clientId);
    url.searchParams.set("redirect_uri", storedRequest.redirectUri);
    if (storedRequest.scope) {
      url.searchParams.set("scope", storedRequest.scope);
    }
    if (storedRequest.state) {
      url.searchParams.set("state", storedRequest.state);
    }

    res.json({ redirect: url.toString() });
  });

  // Token endpoint
  app.post("/oauth/token", async (req, res) => {
    try {
      const params = tokenSchema.parse(req.body);
      const client = await storage.getClientByClientId(params.client_id);

      if (!client || (params.grant_type !== "implicit" && client.clientSecret !== params.client_secret)) {
        return res.status(401).send("Invalid client credentials");
      }

      let userId: string;
      let scope: string[] | undefined;

      switch (params.grant_type) {
        case "authorization_code": {
          if (!params.code || !params.redirect_uri) {
            return res.status(400).send("Missing required parameters");
          }

          const authCode = await storage.getAuthCodeByCode(params.code);
          if (!authCode || authCode.expiresAt < new Date() ||
              authCode.clientId !== client._id.toString()) {
            return res.status(400).send("Invalid authorization code");
          }

          userId = authCode.userId;
          scope = authCode.scope;
          await storage.invalidateAuthCode(params.code);
          break;
        }

        case "refresh_token": {
          if (!params.refresh_token) {
            return res.status(400).send("Missing refresh token");
          }

          const token = await storage.getTokenByRefreshToken(params.refresh_token);
          if (!token || token.expiresAt < new Date() ||
              token.clientId !== client._id.toString()) {
            return res.status(400).send("Invalid refresh token");
          }

          userId = token.userId;
          scope = token.scope;
          break;
        }

        case "client_credentials": {
          userId = client._id.toString();
          scope = params.scope?.split(" ");
          break;
        }

        case "implicit":
          return res.status(400).send("Invalid grant type for /oauth/token");

        default:
          return res.status(400).send("Invalid grant type");
      }

      // Generate access token as JWT
      const accessTokenPayload = {
        sub: userId,
        client_id: client._id.toString(),
        scope,
        type: "access_token"
      };

      const accessToken = await jwtService.generateAccessToken(accessTokenPayload);

      // Generate refresh token as a secure random string
      const refreshToken = crypto.randomBytes(32).toString("hex");

      // Store tokens in database for reference
      await storage.createToken({
        accessToken,
        refreshToken,
        clientId: client._id.toString(),
        userId,
        scope,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      });

      res.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: refreshToken,
        scope: scope?.join(" "),
      });
    } catch (error) {
      res.status(400).send(error instanceof Error ? error.message : "Invalid request");
    }
  });

  // Token introspection endpoint (RFC 7662)
  app.post("/oauth/introspect", async (req, res) => {
    try {
      // Validate request parameters
      const params = introspectionSchema.parse(req.body);
      
      // Extract client authentication from Basic Auth header
      const authHeader = req.headers.authorization;
      let clientId: string | undefined;
      let clientSecret: string | undefined;
      
      if (authHeader && authHeader.startsWith('Basic ')) {
        const base64Credentials = authHeader.slice('Basic '.length);
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
        const [id, secret] = credentials.split(':');
        clientId = id;
        clientSecret = secret;
      } else {
        // Allow client credentials in request body as well (less secure, but allowed by spec)
        clientId = req.body.client_id;
        clientSecret = req.body.client_secret;
      }
      
      // Verify client authentication
      if (!clientId || !clientSecret) {
        return res.status(401).json({
          active: false,
          error: "invalid_client",
          error_description: "Client authentication required"
        });
      }
      
      const client = await storage.getClientByClientId(clientId);
      if (!client || client.clientSecret !== clientSecret) {
        return res.status(401).json({
          active: false,
          error: "invalid_client",
          error_description: "Invalid client credentials"
        });
      }
      
      // Verify the token
      let isAccessToken = params.token_type_hint !== "refresh_token";
      let tokenInfo: any = null;
      
      if (isAccessToken) {
        try {
          // Attempt to validate as JWT access token
          tokenInfo = await jwtService.verifyToken(params.token);
          
          // Make sure we include standard claims described in RFC 7662
          const response = {
            active: true,
            client_id: tokenInfo.client_id,
            username: tokenInfo.sub,
            scope: Array.isArray(tokenInfo.scope) ? tokenInfo.scope.join(' ') : tokenInfo.scope,
            sub: tokenInfo.sub,
            aud: tokenInfo.client_id,
            iss: process.env.BASE_URL || 'http://localhost:5000',
            exp: tokenInfo.exp,
            iat: tokenInfo.iat,
            token_type: "access_token"
          };
          
          return res.json(response);
        } catch (error) {
          // Not a valid JWT token, might be a refresh token instead
          isAccessToken = false;
        }
      }
      
      if (!isAccessToken) {
        // Look up refresh token in database
        const token = await storage.getTokenByRefreshToken(params.token);
        
        if (token && token.expiresAt > new Date()) {
          // Convert token expiration to epoch time
          const exp = Math.floor(token.expiresAt.getTime() / 1000);
          
          const response = {
            active: true,
            client_id: token.clientId,
            username: token.userId,
            scope: Array.isArray(token.scope) ? token.scope.join(' ') : token.scope,
            sub: token.userId,
            aud: token.clientId,
            iss: process.env.BASE_URL || 'http://localhost:5000',
            exp,
            token_type: "refresh_token"
          };
          
          return res.json(response);
        }
      }
      
      // Token is not active
      return res.json({ active: false });
    } catch (error) {
      res.status(400).json({
        active: false,
        error: "invalid_request",
        error_description: error instanceof Error ? error.message : "Invalid request"
      });
    }
  });

  // Token revocation endpoint (RFC 7009)
  app.post("/oauth/revoke", async (req, res) => {
    try {
      // Validate request parameters
      const params = revocationSchema.parse(req.body);
      
      // Extract client authentication from Basic Auth header
      const authHeader = req.headers.authorization;
      let clientId: string | undefined;
      let clientSecret: string | undefined;
      
      if (authHeader && authHeader.startsWith('Basic ')) {
        const base64Credentials = authHeader.slice('Basic '.length);
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
        const [id, secret] = credentials.split(':');
        clientId = id;
        clientSecret = secret;
      } else {
        // Allow client credentials in request body as well (less secure, but allowed by spec)
        clientId = req.body.client_id;
        clientSecret = req.body.client_secret;
      }
      
      // Verify client authentication
      if (!clientId || !clientSecret) {
        return res.status(401).json({
          error: "invalid_client",
          error_description: "Client authentication required"
        });
      }
      
      const client = await storage.getClientByClientId(clientId);
      if (!client || client.clientSecret !== clientSecret) {
        return res.status(401).json({
          error: "invalid_client",
          error_description: "Invalid client credentials"
        });
      }
      
      // Just like token_type_hint from introspection endpoint
      const isRefreshToken = params.token_type_hint === "refresh_token";
      
      if (isRefreshToken) {
        // Try to revoke refresh token
        await storage.revokeRefreshToken(params.token);
      } else {
        // Try to revoke access token - we can't actually revoke JWTs, but we can mark them as revoked
        // in the database so they'll be rejected during validation
        await storage.revokeAccessToken(params.token);
      }
      
      // RFC 7009 requires always returning 200 OK even if token was not found
      return res.status(200).end();
    } catch (error) {
      // Return error according to OAuth2 spec
      res.status(400).json({
        error: "invalid_request",
        error_description: error instanceof Error ? error.message : "Invalid request"
      });
    }
  });

  // OAuth 2.0 UserInfo endpoint (RFC 7662 compliant)
  app.get("/oauth/userinfo", async (req, res) => {
    try {
      // Extract bearer token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: "invalid_token",
          error_description: "Bearer token required"
        });
      }

      const accessToken = authHeader.slice('Bearer '.length);
      
      try {
        // Verify the JWT access token
        const tokenPayload = await jwtService.verifyToken(accessToken);
        
        // Get the user from the database
        const user = await storage.getUser(tokenPayload.sub);
        if (!user) {
          return res.status(401).json({
            error: "invalid_token",
            error_description: "User not found"
          });
        }

        // Parse the scopes from the token
        const scopes = Array.isArray(tokenPayload.scope) 
          ? tokenPayload.scope 
          : (tokenPayload.scope || "").split(' ').filter(Boolean);

        // Filter user data based on scopes
        const filteredUserData = filterUserByScopes(user, scopes);

        // Transform to standard OpenID Connect UserInfo format
        const userInfo: any = {
          sub: user._id.toString()
        };

        // Map our user attributes to standard claims based on allowed scopes
        const allowedAttributes = getAllowedAttributes(scopes);
        
        if (allowedAttributes.includes('username')) {
          userInfo.preferred_username = user.username;
        }
        
        if (allowedAttributes.includes('firstName') || allowedAttributes.includes('lastName')) {
          if (user.firstName) userInfo.given_name = user.firstName;
          if (user.lastName) userInfo.family_name = user.lastName;
          if (user.firstName && user.lastName) {
            userInfo.name = `${user.firstName} ${user.lastName}`;
          }
        }
        
        if (allowedAttributes.includes('email') && user.email) {
          userInfo.email = user.email;
          userInfo.email_verified = true; // Assume verified for now
        }
        
        if (allowedAttributes.includes('phoneNumber') && user.phoneNumber) {
          userInfo.phone_number = user.phoneNumber;
          userInfo.phone_number_verified = false; // Default to unverified
        }

        // Add custom claims for extended profile data
        if (allowedAttributes.includes('preferredLanguage') && user.preferredLanguage) {
          userInfo.locale = user.preferredLanguage;
        }

        if (allowedAttributes.includes('timezone') && user.timezone) {
          userInfo.zoneinfo = user.timezone;
        }

        // Include creation time if allowed
        if (allowedAttributes.includes('createdAt') && user.createdAt) {
          userInfo.updated_at = Math.floor(new Date(user.createdAt).getTime() / 1000);
        }

        // Add custom namespace claims for non-standard attributes
        if (allowedAttributes.includes('organizationId') && user.organizationId) {
          userInfo['https://oauth.example.com/organization_id'] = user.organizationId;
        }

        if (allowedAttributes.includes('role') && user.role) {
          userInfo['https://oauth.example.com/role'] = user.role;
        }

        if (allowedAttributes.includes('mfaEnabled')) {
          userInfo['https://oauth.example.com/mfa_enabled'] = user.mfaEnabled || false;
        }

        if (allowedAttributes.includes('isActive')) {
          userInfo['https://oauth.example.com/active'] = user.isActive !== false;
        }

        if (allowedAttributes.includes('lastLogin') && user.lastLogin) {
          userInfo['https://oauth.example.com/last_login'] = Math.floor(new Date(user.lastLogin).getTime() / 1000);
        }

        if (allowedAttributes.includes('theme') && user.theme) {
          userInfo['https://oauth.example.com/theme'] = user.theme;
        }

        return res.json(userInfo);

      } catch (jwtError) {
        return res.status(401).json({
          error: "invalid_token",
          error_description: "Invalid or expired token"
        });
      }

    } catch (error) {
      console.error('UserInfo endpoint error:', error);
      return res.status(500).json({
        error: "server_error",
        error_description: "Internal server error"
      });
    }
  });

  // Add endpoint to get available scopes and their descriptions
  app.get("/oauth/scopes", (req, res) => {
    const scopeDescriptions = {
      'read': 'Basic read access to your account',
      'write': 'Permission to update your account information',
      'admin': 'Administrative access (full permissions)',
      'profile': 'Access to your basic profile information (name, username)',
      'email': 'Access to your email address',
      'phone': 'Access to your phone number',
      'preferences': 'Access to your user preferences (language, theme, timezone)',
      'organization': 'Access to your organization and role information',
      'security': 'Access to security-related information (MFA status, login history)'
    };

    const scopeMapping = Object.entries(scopeDescriptions).map(([scope, description]) => ({
      scope,
      description,
      attributes: scope === 'admin' ? ['All user attributes'] : getAllowedAttributes([scope])
    }));

    res.json({
      available_scopes: scopeMapping,
      scope_to_attributes: Object.fromEntries(
        Object.entries(scopeDescriptions).map(([scope]) => [
          scope, 
          scope === 'admin' ? ['*'] : getAllowedAttributes([scope])
        ])
      )
    });
  });
}