import { z } from "zod";
import { ObjectId } from "mongodb";

/**
 * Core Schema Definitions for OAuth2 Authorization Server
 * 
 * This file contains all the data validation schemas using Zod for type safety
 * and runtime validation. It defines the structure for users, OAuth clients,
 * tokens, and other core entities in the system.
 * 
 * Features:
 * - User profile management with extended attributes
 * - OAuth2 client registration and management
 * - WebAuthn credential storage for passwordless authentication
 * - JWT key rotation and token management
 * - Scope-based attribute access control
 */

/**
 * Tenant Schema Definition
 * 
 * Defines the organization/tenant structure for multi-tenancy support.
 * Each tenant represents an isolated organization with their own users,
 * clients, and settings while sharing the same infrastructure.
 */
export const insertTenantSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  domain: z.string().min(1, "Domain is required").regex(/^[a-zA-Z0-9-]+$/, "Domain must contain only letters, numbers, and hyphens"),
  displayName: z.string().optional(),
  description: z.string().optional(),
  
  // Tenant settings
  settings: z.object({
    allowUserRegistration: z.boolean().default(true),
    requireEmailVerification: z.boolean().default(false),
    sessionTimeoutMinutes: z.number().min(5).max(1440).default(60),
    maxUsersAllowed: z.number().min(1).default(1000),
    enableMFA: z.boolean().default(true),
    enablePasskeys: z.boolean().default(true),
    
    // Branding
    logoUrl: z.string().url().optional(),
    primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).default("#000000"),
    companyUrl: z.string().url().optional(),
  }).default({}),
  
  // Contact information
  adminEmail: z.string().email(),
  supportEmail: z.string().email().optional(),
  
  // Status
  isActive: z.boolean().default(true),
  isPremium: z.boolean().default(false),
  
  // Billing (for SaaS)
  billingPlan: z.enum(["free", "starter", "professional", "enterprise"]).default("free"),
  billingEmail: z.string().email().optional(),
  
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

/**
 * User Schema Definition
 * 
 * Enhanced with tenant isolation - all users belong to a specific tenant.
 * Defines the complete user profile structure with comprehensive attributes
 * for enterprise-grade user management including personal information,
 * security settings, preferences, and organizational data.
 */
export const insertUserSchema = z.object({
  // Tenant association - REQUIRED for multi-tenancy
  tenantId: z.string().min(1, "Tenant ID is required"),
  // === Core Authentication Fields ===
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required").optional(),
  
  // === Personal Information ===
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  phoneNumber: z.string().optional(),
  
  // === Account Management ===
  isAdmin: z.boolean().default(false), // Administrative privileges
  isActive: z.boolean().default(true), // Account status (enabled/disabled)
  lastLogin: z.date().optional(), // Track user activity
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().optional(),
  
  // === User Preferences ===
  preferredLanguage: z.string().default("en"), // Localization support
  theme: z.enum(["light", "dark", "system"] as const).default("system"), // UI theme preference
  timezone: z.string().default("UTC"), // User's timezone for date/time display
  
  // === Security Configuration ===
  mfaEnabled: z.boolean().default(false), // Multi-factor authentication status
  challenge: z.string().optional(), // WebAuthn registration challenge storage
  
  // === Organizational Data ===
  organizationId: z.string().optional(), // Link to organization/company
  role: z.string().optional(), // User's role within the organization (e.g., "Manager", "Developer")
});

/**
 * WebAuthn Credential Schema
 * 
 * Stores WebAuthn (FIDO2) credentials for passwordless authentication.
 * Each credential represents a registered authenticator device (like a security key,
 * fingerprint reader, or platform authenticator) associated with a user account.
 */
export const insertWebAuthnCredentialSchema = z.object({
  userId: z.string(), // Reference to the user who owns this credential
  credentialID: z.string(), // Unique identifier for this credential
  credentialPublicKey: z.string(), // Public key for signature verification
  counter: z.number(), // Signature counter to prevent replay attacks
  credentialDeviceType: z.string(), // Type of authenticator device
  credentialBackedUp: z.boolean(), // Whether the credential is backed up
  transports: z.array(z.string()).optional(), // Available transport methods (usb, ble, nfc, etc.)
  createdAt: z.date().default(() => new Date()),
});

/**
 * OAuth2 Client Application Schema
 * 
 * Enhanced with tenant isolation - all clients belong to a specific tenant.
 * Defines the structure for OAuth2 client applications that can request
 * authorization to access user data. Each client has specific permissions
 * (scopes) and trusted redirect URIs for security.
 */
export const insertClientSchema = z.object({
  // Tenant association - REQUIRED for multi-tenancy
  tenantId: z.string().min(1, "Tenant ID is required"),
  name: z.string().min(1, "Name is required"), // Human-readable client name
  description: z.string().optional(), // Optional description of the client application
  redirectUris: z.array(z.string().url("Invalid redirect URI")), // Allowed callback URLs after authorization
  userId: z.string().optional(), // Optional owner/creator of this client
  allowedScopes: z.array(z.string()).default(['read']), // Scopes this client is permitted to request
});

/**
 * OAuth2 Authorization Code Schema
 * 
 * Enhanced with tenant isolation for multi-tenant OAuth flows.
 * Represents temporary authorization codes issued during the OAuth2 authorization
 * code flow. These codes are exchanged for access tokens and have short lifespans
 * for security purposes.
 */
export const insertAuthCodeSchema = z.object({
  // Tenant association - REQUIRED for multi-tenancy
  tenantId: z.string().min(1, "Tenant ID is required"),
  code: z.string(), // The authorization code value
  clientId: z.string(), // Client that requested this authorization
  userId: z.string(), // User who granted authorization
  scope: z.array(z.string()).optional(), // Granted scopes for this authorization
  expiresAt: z.date(), // When this code expires (typically 10 minutes)
});

/**
 * JWT Key Pair Schema
 * 
 * Stores RSA key pairs used for signing and verifying JWT access tokens.
 * Supports key rotation for enhanced security - multiple keys can exist
 * with only one being active for signing new tokens.
 */
export const insertJwtKeysSchema = z.object({
  privateKey: z.string(), // RSA private key for signing tokens
  publicKey: z.string(), // RSA public key for verifying tokens
  algorithm: z.string(), // Signing algorithm (e.g., "RS256")
  createdAt: z.date(), // When this key pair was generated
  isActive: z.boolean(), // Whether this key is currently used for signing
});

/**
 * OAuth2 Token Schema
 * 
 * Enhanced with tenant isolation for multi-tenant token management.
 * Represents issued access and refresh token pairs. Access tokens grant
 * API access, while refresh tokens allow obtaining new access tokens
 * without re-authentication.
 */
export const insertTokenSchema = z.object({
  // Tenant association - REQUIRED for multi-tenancy
  tenantId: z.string().min(1, "Tenant ID is required"),
  accessToken: z.string(), // The access token (JWT format)
  refreshToken: z.string(), // The refresh token (opaque string)
  clientId: z.string(), // Client that owns this token
  userId: z.string(), // User this token represents
  scope: z.array(z.string()).optional(), // Scopes granted to this token
  expiresAt: z.date(), // When the access token expires
  revoked: z.boolean().optional(), // Whether this token has been revoked
  revokedAt: z.date().optional(), // When this token was revoked
});

// ===================================================================
// TYPE DEFINITIONS
// ===================================================================

/**
 * TypeScript type definitions derived from Zod schemas
 * These provide compile-time type safety throughout the application
 */

/** User types for database operations */
/** Tenant types */
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = InsertTenant & {
  _id: ObjectId;
  domain: string; // Unique domain identifier for the tenant
  createdAt: Date;
  updatedAt: Date;
};

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = InsertUser & { _id: ObjectId };

/** OAuth2 client types */
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = InsertClient & {
  _id: ObjectId;
  clientId: string; // Auto-generated unique identifier
  clientSecret: string; // Auto-generated secret for authentication
  createdAt: Date; // When the client was registered
};

/** Authorization code types */
export type InsertAuthCode = z.infer<typeof insertAuthCodeSchema>;
export type AuthCode = InsertAuthCode & { _id: ObjectId };

/** JWT key management types */
export type InsertJwtKeys = z.infer<typeof insertJwtKeysSchema>;
export type JwtKeys = InsertJwtKeys & { _id: ObjectId };

/** Token management types */
export type InsertToken = z.infer<typeof insertTokenSchema>;
export type Token = InsertToken & { _id: ObjectId };

/** WebAuthn credential types */
export type InsertWebAuthnCredential = z.infer<typeof insertWebAuthnCredentialSchema>;
export type WebAuthnCredential = InsertWebAuthnCredential & { _id: ObjectId };

// ===================================================================
// OAUTH2 SCOPE SYSTEM
// ===================================================================

/**
 * OAuth2 Scopes with Granular Profile Data Access Control
 * 
 * This system implements fine-grained permission control over user profile
 * attributes. Each scope grants access to specific user data fields, enabling
 * clients to request only the minimum necessary permissions.
 * 
 * Design principles:
 * - Principle of least privilege: clients only get what they need
 * - Granular control: separate scopes for different data categories
 * - Standards compliance: follows OpenID Connect patterns
 * - User privacy: clear data access boundaries
 */
export const AVAILABLE_SCOPES = [
  'read',           // Basic account access - minimal data exposure
  'write',          // Write permissions for user's own data
  'admin',          // Full administrative access (all attributes)
  'profile',        // Basic profile info (name, username, creation date)
  'email',          // Email address access
  'phone',          // Phone number access
  'preferences',    // User preferences (theme, language, timezone)
  'organization',   // Organization and role information
  'security'        // Security-related data (MFA status, login history)
] as const;

/** Type definition for OAuth2 scopes */
export type Scope = typeof AVAILABLE_SCOPES[number];

/**
 * Scope-to-Attribute Mapping Configuration
 * 
 * This mapping defines exactly which user profile attributes each OAuth2 scope
 * provides access to. It serves as the authorization matrix for the UserInfo
 * endpoint and other profile data access points.
 * 
 * Special handling:
 * - 'admin' scope uses '*' wildcard for all attributes
 * - 'write' scope grants modification rights but no additional read access
 * - Each scope is additive - clients can request multiple scopes
 */
export const SCOPE_TO_ATTRIBUTES: Record<Scope, string[]> = {
  'read': ['username'], 
  'write': [], // Grants modification rights only, no additional data access
  'admin': ['*'], // Wildcard grants access to all user attributes
  'profile': ['username', 'firstName', 'lastName', 'createdAt'],
  'email': ['email'],
  'phone': ['phoneNumber'],
  'preferences': ['preferredLanguage', 'theme', 'timezone'],
  'organization': ['organizationId', 'role'],
  'security': ['mfaEnabled', 'lastLogin', 'isActive']
};

/**
 * Scope Resolution Utilities
 * 
 * These helper functions implement the core logic for translating OAuth2 scopes
 * into specific user attribute access permissions. They are used throughout
 * the authorization server to enforce data access controls.
 */

/**
 * Get Allowed Attributes from OAuth2 Scopes
 * 
 * Resolves a list of OAuth2 scopes into the specific user attributes that
 * those scopes grant access to. Handles scope combination and admin wildcard.
 * 
 * @param scopes - Array of OAuth2 scope strings
 * @returns Array of user attribute names that are accessible
 * 
 * @example
 * getAllowedAttributes(['profile', 'email']) 
 * // Returns: ['username', 'firstName', 'lastName', 'createdAt', 'email']
 */
export function getAllowedAttributes(scopes: string[]): string[] {
  const allowedAttributes = new Set<string>();
  
  for (const scope of scopes) {
    if (scope in SCOPE_TO_ATTRIBUTES) {
      const attributes = SCOPE_TO_ATTRIBUTES[scope as Scope];
      
      // Handle admin scope with wildcard access
      if (attributes.includes('*')) {
        // Return all available user attributes for admin scope
        return [
          'username', 'firstName', 'lastName', 'email', 'phoneNumber',
          'isAdmin', 'isActive', 'lastLogin', 'createdAt', 'updatedAt',
          'preferredLanguage', 'theme', 'timezone', 'mfaEnabled',
          'organizationId', 'role'
        ];
      }
      
      // Add all attributes for this scope to the set
      attributes.forEach(attr => allowedAttributes.add(attr));
    }
  }
  
  return Array.from(allowedAttributes);
}

/**
 * Filter User Data by OAuth2 Scopes
 * 
 * Creates a filtered version of user data containing only the attributes
 * that the provided OAuth2 scopes grant access to. This is the primary
 * data filtering mechanism for the UserInfo endpoint.
 * 
 * @param user - Complete user object from database
 * @param scopes - Array of granted OAuth2 scopes
 * @returns Filtered user object with only accessible attributes
 * 
 * @example
 * const filteredUser = filterUserByScopes(user, ['profile', 'email']);
 * // Returns user object with only profile and email fields
 */
export function filterUserByScopes(user: User, scopes: string[]): Partial<User> {
  const allowedAttributes = getAllowedAttributes(scopes);
  const filteredUser: Partial<User> = { _id: user._id }; // Always include ID for identification
  
  // Copy only the attributes that the scopes allow access to
  for (const attr of allowedAttributes) {
    if (attr in user) {
      (filteredUser as any)[attr] = (user as any)[attr];
    }
  }
  
  return filteredUser;
}