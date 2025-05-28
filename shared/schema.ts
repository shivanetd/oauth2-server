import { z } from "zod";
import { ObjectId } from "mongodb";

// Schema definitions for validation
export const insertUserSchema = z.object({
  // Required basic fields
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required").optional(),
  
  // User profile information
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  phoneNumber: z.string().optional(),
  
  // Account metadata
  isAdmin: z.boolean().default(false),
  isActive: z.boolean().default(true),
  lastLogin: z.date().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().optional(),
  
  // Profile preferences
  preferredLanguage: z.string().default("en"),
  theme: z.enum(["light", "dark", "system"] as const).default("system"),
  timezone: z.string().default("UTC"),
  
  // Security related
  mfaEnabled: z.boolean().default(false),
  challenge: z.string().optional(), // For WebAuthn registration
  
  // User organization/team related
  organizationId: z.string().optional(),
  role: z.string().optional(), // Role within the organization
});

export const insertWebAuthnCredentialSchema = z.object({
  userId: z.string(),
  credentialID: z.string(),
  credentialPublicKey: z.string(),
  counter: z.number(),
  credentialDeviceType: z.string(),
  credentialBackedUp: z.boolean(),
  transports: z.array(z.string()).optional(),
  createdAt: z.date().default(() => new Date()),
});

export const insertClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  redirectUris: z.array(z.string().url("Invalid redirect URI")),
  userId: z.string().optional(),
  allowedScopes: z.array(z.string()).default(['read']), // Default to basic read scope
});

export const insertAuthCodeSchema = z.object({
  code: z.string(),
  clientId: z.string(),
  userId: z.string(),
  scope: z.array(z.string()).optional(),
  expiresAt: z.date(),
});

export const insertJwtKeysSchema = z.object({
  privateKey: z.string(),
  publicKey: z.string(),
  algorithm: z.string(),
  createdAt: z.date(),
  isActive: z.boolean(),
});

export const insertTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  clientId: z.string(),
  userId: z.string(),
  scope: z.array(z.string()).optional(),
  expiresAt: z.date(),
  revoked: z.boolean().optional(),
  revokedAt: z.date().optional(),
});

// Types for the application
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = InsertUser & { _id: ObjectId };

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = InsertClient & {
  _id: ObjectId;
  clientId: string;
  clientSecret: string;
  createdAt: Date;
};

export type InsertAuthCode = z.infer<typeof insertAuthCodeSchema>;
export type AuthCode = InsertAuthCode & { _id: ObjectId };

export type InsertJwtKeys = z.infer<typeof insertJwtKeysSchema>;
export type JwtKeys = InsertJwtKeys & { _id: ObjectId };

export type InsertToken = z.infer<typeof insertTokenSchema>;
export type Token = InsertToken & { _id: ObjectId };

export type InsertWebAuthnCredential = z.infer<typeof insertWebAuthnCredentialSchema>;
export type WebAuthnCredential = InsertWebAuthnCredential & { _id: ObjectId };

// Available scopes
export const AVAILABLE_SCOPES = ['read', 'write', 'admin'] as const;
export type Scope = typeof AVAILABLE_SCOPES[number];