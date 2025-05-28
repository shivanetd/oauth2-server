import { Express, Request, Response } from 'express';
import crypto from 'crypto';
import { storage } from './storage';
import { User } from '@shared/schema';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticatorTransportFuture,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
  type WebAuthnCredential,
  type Base64URLString
} from '@simplewebauthn/server';

// Add WebAuthn to session type
declare module 'express-session' {
  interface SessionData {
    webauthn?: {
      username?: string;
    };
  }
}
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON
} from '@simplewebauthn/browser';

// Best practice is to use a unique identifier for your app
const RP_NAME = 'OAuth2 Authorization Server';
// This should be the domain name of your app
const RP_ID = process.env.RPID || 'localhost';
// If using in a development environment, get the domain from the environment
const ORIGIN = process.env.ORIGIN || `https://${RP_ID}`;

export function setupWebAuthn(app: Express) {
  // Endpoint to begin registration
  app.post('/api/webauthn/registration/options', async (req: Request, res: Response) => {
    try {
      // Ensure the user is already authenticated to link a passkey
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'User must be authenticated to register a passkey' });
      }

      const user = req.user as User;
      
      // Get existing authenticators for this user
      const userAuthenticators = await storage.getWebAuthnCredentialsByUserId(user._id.toString());
      
      // Generate a new challenge for this registration
      const challenge = crypto.randomBytes(32).toString('base64url');
      
      // Store the challenge with the user
      await storage.updateUserChallenge(user._id.toString(), challenge);
      
      // Generate registration options for the user
      // Convert the user ID string to a Uint8Array (using SHA-256 hash of the ID)
      const userIDBytes = crypto.createHash('sha256').update(user._id.toString()).digest();
      
      const options = generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userID: userIDBytes,
        userName: user.username,
        // Prevent users from re-registering the same device
        excludeCredentials: userAuthenticators.map(authenticator => ({
          id: authenticator.credentialID, // Already base64url encoded string
          type: 'public-key',
          transports: authenticator.transports as AuthenticatorTransportFuture[] || [],
        })),
        authenticatorSelection: {
          // Defaults
          residentKey: 'preferred',
          userVerification: 'preferred',
          // Optional: you can restrict key types
          // authenticatorAttachment: 'platform', // only allow platform authenticators (TouchID, FaceID)
        },
        challenge,
      });
      
      res.status(200).json(options);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to generate registration options' });
    }
  });

  // Endpoint to verify registration
  app.post('/api/webauthn/registration/verify', async (req: Request, res: Response) => {
    try {
      // Ensure the user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'User must be authenticated to verify registration' });
      }

      const user = req.user as User;
      
      // Get the response from the client
      const response = req.body as RegistrationResponseJSON;
      
      // Get the stored challenge
      const expectedChallenge = user.challenge;
      if (!expectedChallenge) {
        return res.status(400).json({ error: 'No challenge found for this user' });
      }
      
      // Verify the response
      let verification: VerifiedRegistrationResponse;
      try {
        verification = await verifyRegistrationResponse({
          response,
          expectedChallenge,
          expectedOrigin: ORIGIN,
          expectedRPID: RP_ID,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: 'Failed to verify registration' });
      }
      
      // Check if verification was successful
      if (!verification.verified || !verification.registrationInfo) {
        return res.status(400).json({ error: 'Registration verification failed' });
      }
      
      // Extract credential data from the verification.registrationInfo
      const regInfo = verification.registrationInfo;
      
      if (!regInfo || !regInfo.credential) {
        return res.status(400).json({ error: 'Missing credential information in verification' });
      }
      
      // Create new authenticator record
      const newAuthenticator = {
        userId: user._id.toString(),
        credentialID: regInfo.credential.id, // Already Base64URL encoded
        credentialPublicKey: Buffer.from(regInfo.credential.publicKey).toString('base64url'),
        counter: regInfo.credential.counter,
        credentialDeviceType: regInfo.credentialDeviceType || 'single_device',
        credentialBackedUp: regInfo.credentialBackedUp || false,
        transports: response.response.transports || [],
        createdAt: new Date(),
      };
      
      await storage.createWebAuthnCredential(newAuthenticator);
      
      // Clear the challenge
      await storage.updateUserChallenge(user._id.toString(), '');
      
      res.status(200).json({ 
        status: 'success', 
        message: 'Passkey registered successfully'
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to register passkey' });
    }
  });

  // Endpoint to begin authentication
  app.post('/api/webauthn/authentication/options', async (req: Request, res: Response) => {
    try {
      const { username } = req.body;
      
      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }
      
      // Find the user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }
      
      // Get the user's authenticators
      const userAuthenticators = await storage.getWebAuthnCredentialsByUserId(user._id.toString());
      if (userAuthenticators.length === 0) {
        return res.status(400).json({ error: 'No passkeys registered for this user' });
      }
      
      // Generate a new challenge
      const challenge = crypto.randomBytes(32).toString('base64url');
      
      // Store it with the user
      await storage.updateUserChallenge(user._id.toString(), challenge);
      
      // Generate authentication options
      const options = generateAuthenticationOptions({
        rpID: RP_ID,
        allowCredentials: userAuthenticators.map(authenticator => ({
          id: authenticator.credentialID, // Already base64url encoded string
          type: 'public-key',
          transports: authenticator.transports as AuthenticatorTransportFuture[] || [],
        })),
        userVerification: 'preferred',
        challenge,
      });
      
      // Store the username in the session so we can find the user during verification
      if (!req.session.webauthn) {
        req.session.webauthn = {};
      }
      req.session.webauthn.username = username;
      
      res.status(200).json(options);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to generate authentication options' });
    }
  });

  // Endpoint to verify authentication
  app.post('/api/webauthn/authentication/verify', async (req: Request, res: Response) => {
    try {
      // Get the username from session
      const username = req.session?.webauthn?.username;
      if (!username) {
        return res.status(400).json({ error: 'No username found in session' });
      }
      
      // Get the user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }
      
      // Get the response from the client
      const response = req.body as AuthenticationResponseJSON;
      
      // Get the stored challenge
      const expectedChallenge = user.challenge;
      if (!expectedChallenge) {
        return res.status(400).json({ error: 'No challenge found for this user' });
      }
      
      // Get the credential ID from the response
      const credentialID = response.id;
      
      // Find the credential
      const credential = await storage.getWebAuthnCredentialByCredentialId(credentialID);
      if (!credential) {
        return res.status(400).json({ error: 'Authenticator not found' });
      }
      
      // Verify the assertion
      let verification: VerifiedAuthenticationResponse;
      try {
        // Create a proper WebAuthnCredential object
        const webauthnCredential: WebAuthnCredential = {
          id: credential.credentialID, // Base64URL string
          publicKey: Buffer.from(credential.credentialPublicKey, 'base64url'),
          counter: credential.counter,
          transports: credential.transports as AuthenticatorTransportFuture[] || undefined,
        };
        
        verification = await verifyAuthenticationResponse({
          response,
          expectedChallenge,
          expectedOrigin: ORIGIN,
          expectedRPID: RP_ID,
          requireUserVerification: true,
          credential: webauthnCredential,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: 'Failed to verify authentication' });
      }
      
      // Check if verification was successful
      if (!verification.verified) {
        return res.status(400).json({ error: 'Authentication verification failed' });
      }
      
      // Update the counter
      await storage.updateWebAuthnCredentialCounter(credentialID, verification.authenticationInfo.newCounter);
      
      // Clear the challenge
      await storage.updateUserChallenge(user._id.toString(), '');
      
      // Login the user
      req.login(user, (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Failed to login' });
        }
        
        // Check if there's a return URL in the session (for OAuth flow)
        const returnTo = req.session?.returnTo;
        delete req.session.webauthn;
        
        res.status(200).json({
          status: 'success',
          user,
          ...(returnTo && { redirect: returnTo })
        });
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to authenticate with passkey' });
    }
  });
}