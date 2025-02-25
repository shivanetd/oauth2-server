import { Express, Request, Response } from "express";
import { storage } from "./storage";
import crypto from "crypto";
import { z } from "zod";

const authorizationSchema = z.object({
  response_type: z.literal("code"),
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

export function setupOAuth(app: Express) {
  // Authorization endpoint
  app.get("/oauth/authorize", async (req, res) => {
    try {
      // For implicit flow, check response_type === "token"
      const responseType = req.query.response_type as string;

      if (responseType === "token") {
        // Handle implicit flow
        if (!req.isAuthenticated()) {
          return res.redirect(`/auth?return_to=${encodeURIComponent(req.url)}`);
        }

        const params = authorizationSchema.parse({
          ...req.query,
          response_type: "code" // Temporary parse as code for validation
        });

        const client = await storage.getClientByClientId(params.client_id);
        if (!client) {
          return res.status(400).send("Invalid client_id");
        }

        if (!client.redirectUris.includes(params.redirect_uri)) {
          return res.status(400).send("Invalid redirect_uri");
        }

        // Generate token directly for implicit flow
        const accessToken = crypto.randomBytes(32).toString("hex");
        await storage.createToken({
          accessToken,
          refreshToken: crypto.randomBytes(32).toString("hex"), // Optional for implicit
          clientId: client._id.toString(),
          userId: req.user!._id.toString(),
          scope: params.scope?.split(" "),
          expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
        });

        // Redirect with token in fragment
        const redirectUrl = new URL(params.redirect_uri);
        redirectUrl.hash = `access_token=${accessToken}&token_type=Bearer&expires_in=3600`;
        if (params.state) {
          redirectUrl.hash += `&state=${params.state}`;
        }
        return res.redirect(redirectUrl.toString());
      }

      // Handle authorization code flow
      if (!req.isAuthenticated()) {
        return res.redirect(`/auth?return_to=${encodeURIComponent(req.url)}`);
      }

      const params = authorizationSchema.parse(req.query);
      const client = await storage.getClientByClientId(params.client_id);

      if (!client) {
        return res.status(400).send("Invalid client_id");
      }

      if (!client.redirectUris.includes(params.redirect_uri)) {
        return res.status(400).send("Invalid redirect_uri");
      }

      const code = crypto.randomBytes(32).toString("hex");

      await storage.createAuthCode({
        code,
        clientId: client._id.toString(),
        userId: req.user!._id.toString(),
        scope: params.scope?.split(" "),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      });

      const redirectUrl = new URL(params.redirect_uri);
      redirectUrl.searchParams.set("code", code);
      if (params.state) {
        redirectUrl.searchParams.set("state", params.state);
      }

      res.redirect(redirectUrl.toString());
    } catch (error) {
      res.status(400).send(error instanceof Error ? error.message : "Invalid request");
    }
  });

  // Token endpoint
  app.post("/oauth/token", async (req, res) => {
    try {
      const params = tokenSchema.parse(req.body);
      const client = await storage.getClientByClientId(params.client_id);

      // Validate client credentials
      if (!client || (params.grant_type !== "implicit" && client.clientSecret !== params.client_secret)) {
        return res.status(401).send("Invalid client credentials");
      }

      let userId: string;
      let scope: string[] | undefined;

      switch (params.grant_type) {
        case "authorization_code":
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

        case "refresh_token":
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

        case "client_credentials":
          // For client credentials, no user is involved
          userId = client._id.toString(); // Use client ID as user ID
          scope = params.scope?.split(" ");
          break;

        case "implicit":
          //Implicit flow handled in /oauth/authorize
          return res.status(400).send("Invalid grant type for /oauth/token");

        default:
          return res.status(400).send("Invalid grant type");
      }

      const accessToken = crypto.randomBytes(32).toString("hex");
      const refreshToken = crypto.randomBytes(32).toString("hex");

      const token = await storage.createToken({
        accessToken,
        refreshToken,
        clientId: client._id.toString(),
        userId,
        scope,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      });

      res.json({
        access_token: token.accessToken,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: token.refreshToken,
        scope: token.scope?.join(" "),
      });
    } catch (error) {
      res.status(400).send(error instanceof Error ? error.message : "Invalid request");
    }
  });
}