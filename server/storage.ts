import { db, client } from "./db";
import session from "express-session";
import MongoStore from "connect-mongo";
import crypto from "crypto";
import { 
  Tenant, InsertTenant,
  User, InsertUser, 
  Client, InsertClient, 
  AuthCode, InsertAuthCode,
  Token, InsertToken,
  WebAuthnCredential, InsertWebAuthnCredential
} from "@shared/schema";
import { ObjectId } from "mongodb";

export interface IStorage {
  // Tenant operations
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantByDomain(domain: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(tenantId: string, tenantData: Partial<Omit<Tenant, '_id'>>): Promise<Tenant | undefined>;
  deleteTenant(tenantId: string): Promise<boolean>;
  listTenants(): Promise<Tenant[]>;

  // User operations (now tenant-scoped)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string, tenantId?: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(userId: string, userData: Partial<Omit<User, '_id'>>): Promise<User | undefined>;
  deleteUser(userId: string): Promise<boolean>;
  updateUserChallenge(userId: string, challenge: string): Promise<void>;
  listUsersByTenant(tenantId: string): Promise<User[]>;

  // WebAuthn operations
  createWebAuthnCredential(credential: InsertWebAuthnCredential): Promise<WebAuthnCredential>;
  getWebAuthnCredentialsByUserId(userId: string): Promise<WebAuthnCredential[]>;
  getWebAuthnCredentialByCredentialId(credentialId: string): Promise<WebAuthnCredential | undefined>;
  updateWebAuthnCredentialCounter(credentialId: string, newCounter: number): Promise<void>;

  // Client operations (now tenant-scoped)
  createClient(client: Omit<InsertClient, "clientId" | "clientSecret">): Promise<Client>;
  updateClient(id: string, clientData: Partial<Omit<Client, "_id" | "clientId" | "clientSecret">>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  getClientById(id: string): Promise<Client | undefined>;
  getClientByClientId(clientId: string): Promise<Client | undefined>;
  listClientsByUser(userId: string): Promise<Client[]>;
  listClientsByTenant(tenantId: string): Promise<Client[]>;

  // OAuth operations
  createAuthCode(code: InsertAuthCode): Promise<AuthCode>;
  getAuthCodeByCode(code: string): Promise<AuthCode | undefined>;
  invalidateAuthCode(code: string): Promise<void>;

  createToken(token: InsertToken): Promise<Token>;
  getTokenByAccessToken(token: string): Promise<Token | undefined>;
  getTokenByRefreshToken(token: string): Promise<Token | undefined>;
  revokeAccessToken(token: string): Promise<void>;
  revokeRefreshToken(token: string): Promise<void>;

  sessionStore: session.Store;

  // Admin operations
  listUsers(): Promise<User[]>;
  listAllClients(): Promise<Client[]>;
}

export class MongoStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = MongoStore.create({
      clientPromise: client.connect(),
      collectionName: 'sessions',
      ttl: 24 * 60 * 60, // 1 day in seconds,
      crypto: {
        secret: process.env.SESSION_SECRET ?? "dev-secret-key"
      }
    });
  }

  // Tenant operations
  async getTenant(id: string): Promise<Tenant | undefined> {
    try {
      const tenant = await db.collection("tenants").findOne({ _id: new ObjectId(id) });
      return tenant as Tenant | undefined;
    } catch (error) {
      console.error("Error getting tenant:", error);
      return undefined;
    }
  }

  async getTenantByDomain(domain: string): Promise<Tenant | undefined> {
    try {
      const tenant = await db.collection("tenants").findOne({ domain });
      return tenant as Tenant | undefined;
    } catch (error) {
      console.error("Error getting tenant by domain:", error);
      return undefined;
    }
  }

  async createTenant(tenantData: InsertTenant): Promise<Tenant> {
    const tenant = {
      ...tenantData,
      _id: new ObjectId(),
      domain: tenantData.domain,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection("tenants").insertOne(tenant);
    return tenant as Tenant;
  }

  async updateTenant(tenantId: string, tenantData: Partial<Omit<Tenant, '_id'>>): Promise<Tenant | undefined> {
    try {
      const result = await db.collection("tenants").findOneAndUpdate(
        { _id: new ObjectId(tenantId) },
        { 
          $set: { 
            ...tenantData, 
            updatedAt: new Date() 
          } 
        },
        { returnDocument: "after" }
      );
      return result as Tenant | undefined;
    } catch (error) {
      console.error("Error updating tenant:", error);
      return undefined;
    }
  }

  async deleteTenant(tenantId: string): Promise<boolean> {
    try {
      const result = await db.collection("tenants").deleteOne({ _id: new ObjectId(tenantId) });
      return result.deletedCount > 0;
    } catch (error) {
      console.error("Error deleting tenant:", error);
      return false;
    }
  }

  async listTenants(): Promise<Tenant[]> {
    try {
      const tenants = await db.collection("tenants").find({}).toArray();
      return tenants as Tenant[];
    } catch (error) {
      console.error("Error listing tenants:", error);
      return [];
    }
  }

  async listUsersByTenant(tenantId: string): Promise<User[]> {
    try {
      const users = await db.collection("users").find({ tenantId }).toArray();
      return users as User[];
    } catch (error) {
      console.error("Error listing users by tenant:", error);
      return [];
    }
  }

  async listClientsByTenant(tenantId: string): Promise<Client[]> {
    try {
      const clients = await db.collection("clients").find({ tenantId }).toArray();
      return clients as Client[];
    } catch (error) {
      console.error("Error listing clients by tenant:", error);
      return [];
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    return user as User | undefined;
  }

  async getUserByUsername(username: string, tenantId?: string): Promise<User | undefined> {
    const query: any = { username };
    if (tenantId) {
      query.tenantId = tenantId;
    }
    const user = await db.collection('users').findOne(query);
    return user as User | undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.collection('users').insertOne(insertUser);
    return { ...insertUser, _id: new ObjectId(result.insertedId.toString()) } as User;
  }

  async createClient(clientData: Omit<InsertClient, "clientId" | "clientSecret">): Promise<Client> {
    const client = {
      ...clientData,
      clientId: crypto.randomBytes(16).toString('hex'),
      clientSecret: crypto.randomBytes(32).toString('hex'),
      createdAt: new Date()
    };
    const result = await db.collection('clients').insertOne(client);
    return { ...client, _id: new ObjectId(result.insertedId.toString()) } as Client;
  }

  async getClientById(id: string): Promise<Client | undefined> {
    const client = await db.collection('clients').findOne({ _id: new ObjectId(id) });
    return client as Client | undefined;
  }

  async getClientByClientId(clientId: string): Promise<Client | undefined> {
    const client = await db.collection('clients').findOne({ clientId });
    return client as Client | undefined;
  }

  async listClientsByUser(userId: string): Promise<Client[]> {
    const clients = await db.collection('clients').find({ userId }).toArray();
    return clients as Client[];
  }
  
  async updateClient(id: string, clientData: Partial<Omit<Client, "_id" | "clientId" | "clientSecret">>): Promise<Client | undefined> {
    try {
      const objId = new ObjectId(id);
      
      // Create the update object and ensure critical fields are not modified
      const updateData: Record<string, any> = { ...clientData };
      delete updateData._id;
      delete updateData.clientId;
      delete updateData.clientSecret;
      
      // Set update time
      updateData.updatedAt = new Date();
      
      const result = await db.collection('clients').findOneAndUpdate(
        { _id: objId },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      if (!result) return undefined;
      
      return {
        ...result,
        _id: objId
      } as Client;
    } catch (error) {
      console.error('Error updating client:', error);
      return undefined;
    }
  }

  async deleteClient(id: string): Promise<boolean> {
    try {
      const objId = new ObjectId(id);
      
      // Get the client to find clientId before deletion
      const client = await this.getClientById(id);
      if (!client) return false;
      
      // Delete all auth codes related to this client
      await db.collection('authCodes').deleteMany({ clientId: client.clientId });
      
      // Delete all tokens related to this client
      await db.collection('tokens').deleteMany({ clientId: client.clientId });
      
      // Finally delete the client
      const result = await db.collection('clients').deleteOne({ _id: objId });
      
      return result.deletedCount === 1;
    } catch (error) {
      console.error('Error deleting client:', error);
      return false;
    }
  }

  async createAuthCode(codeData: InsertAuthCode): Promise<AuthCode> {
    const result = await db.collection('authCodes').insertOne(codeData);
    return { ...codeData, _id: result.insertedId } as AuthCode;
  }

  async getAuthCodeByCode(code: string): Promise<AuthCode | undefined> {
    const authCode = await db.collection('authCodes').findOne({ code });
    return authCode as AuthCode | undefined;
  }

  async invalidateAuthCode(code: string): Promise<void> {
    await db.collection('authCodes').deleteOne({ code });
  }

  async createToken(tokenData: InsertToken): Promise<Token> {
    const result = await db.collection('tokens').insertOne(tokenData);
    return { ...tokenData, _id: result.insertedId } as Token;
  }

  async getTokenByAccessToken(accessToken: string): Promise<Token | undefined> {
    const token = await db.collection('tokens').findOne({ accessToken });
    return token as Token | undefined;
  }

  async getTokenByRefreshToken(refreshToken: string): Promise<Token | undefined> {
    const token = await db.collection('tokens').findOne({ refreshToken });
    return token as Token | undefined;
  }

  async revokeAccessToken(accessToken: string): Promise<void> {
    // We can't actually revoke a JWT since it's stateless, but we can add it to a 
    // revocation list in the database to check during validation
    await db.collection('revokedTokens').insertOne({
      token: accessToken,
      type: 'access_token',
      revokedAt: new Date()
    });
    
    // Also update the token record to mark it as revoked
    await db.collection('tokens').updateOne(
      { accessToken },
      { $set: { revoked: true, revokedAt: new Date() } }
    );
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    // Add refresh token to revocation list
    await db.collection('revokedTokens').insertOne({
      token: refreshToken,
      type: 'refresh_token',
      revokedAt: new Date()
    });
    
    // Also update the token record to mark it as revoked
    await db.collection('tokens').updateOne(
      { refreshToken },
      { $set: { revoked: true, revokedAt: new Date() } }
    );
  }

  async listUsers(): Promise<User[]> {
    const users = await db.collection('users').find().toArray();
    return users.map(user => ({
      ...user,
      _id: new ObjectId(user._id.toString())
    })) as unknown as User[];
  }

  async listAllClients(): Promise<Client[]> {
    const clients = await db.collection('clients').find().toArray();
    return clients.map(client => ({
      ...client,
      _id: new ObjectId(client._id.toString())
    })) as unknown as Client[];
  }

  async updateUser(userId: string, userData: Partial<Omit<User, '_id'>>): Promise<User | undefined> {
    try {
      const id = new ObjectId(userId);
      // Create update object - never allow updating _id
      const updateData: Record<string, any> = { ...userData };
      delete updateData._id;

      // If password is being updated and it's not already hashed, hash it
      if (updateData.password && !updateData.password.includes('.')) {
        // Password doesn't have the pattern of "hash.salt", so we need to hash it
        const { hashPassword } = await import('./auth');
        updateData.password = await hashPassword(updateData.password);
      }

      // Set update time
      updateData.updatedAt = new Date();

      const result = await db.collection('users').findOneAndUpdate(
        { _id: id },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) return undefined;
      
      return {
        ...result,
        _id: id
      } as User;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      const id = new ObjectId(userId);
      
      // First delete all related data
      // 1. Delete all user's WebAuthn credentials
      await db.collection('webauthnCredentials').deleteMany({ userId: userId.toString() });
      
      // 2. Delete all user's clients and related tokens/auth codes
      const userClients = await db.collection('clients').find({ userId: userId.toString() }).toArray();
      for (const client of userClients) {
        // Delete all auth codes related to this client
        await db.collection('authCodes').deleteMany({ clientId: client.clientId });
        
        // Delete all tokens related to this client
        await db.collection('tokens').deleteMany({ clientId: client.clientId });
      }
      
      // Delete all clients
      await db.collection('clients').deleteMany({ userId: userId.toString() });
      
      // Finally delete the user
      const result = await db.collection('users').deleteOne({ _id: id });
      
      return result.deletedCount === 1;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  // WebAuthn operations implementation
  async updateUserChallenge(userId: string, challenge: string): Promise<void> {
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { challenge } }
    );
  }

  async createWebAuthnCredential(credential: InsertWebAuthnCredential): Promise<WebAuthnCredential> {
    const result = await db.collection('webauthn_credentials').insertOne(credential);
    return { ...credential, _id: result.insertedId } as WebAuthnCredential;
  }

  async getWebAuthnCredentialsByUserId(userId: string): Promise<WebAuthnCredential[]> {
    const credentials = await db.collection('webauthn_credentials').find({ userId }).toArray();
    return credentials as WebAuthnCredential[];
  }

  async getWebAuthnCredentialByCredentialId(credentialId: string): Promise<WebAuthnCredential | undefined> {
    const credential = await db.collection('webauthn_credentials').findOne({ credentialID: credentialId });
    return credential as WebAuthnCredential | undefined;
  }

  async updateWebAuthnCredentialCounter(credentialId: string, newCounter: number): Promise<void> {
    await db.collection('webauthn_credentials').updateOne(
      { credentialID: credentialId },
      { $set: { counter: newCounter } }
    );
  }
}

export const storage = new MongoStorage();