import { User, InsertUser, Client, AuthCode, Token } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";
import crypto from "crypto";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Client operations  
  createClient(client: Omit<Client, "id" | "clientId" | "clientSecret">): Promise<Client>;
  getClientById(id: number): Promise<Client | undefined>;
  getClientByClientId(clientId: string): Promise<Client | undefined>;
  listClientsByUser(userId: number): Promise<Client[]>;
  
  // OAuth operations
  createAuthCode(code: Omit<AuthCode, "id">): Promise<AuthCode>;
  getAuthCodeByCode(code: string): Promise<AuthCode | undefined>;
  invalidateAuthCode(code: string): Promise<void>;
  
  createToken(token: Omit<Token, "id">): Promise<Token>;
  getTokenByAccessToken(token: string): Promise<Token | undefined>;
  getTokenByRefreshToken(token: string): Promise<Token | undefined>;
  
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private clients: Map<number, Client>;
  private authCodes: Map<string, AuthCode>;
  private tokens: Map<string, Token>;
  private currentId: number;
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.authCodes = new Map();
    this.tokens = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id, isAdmin: false };
    this.users.set(id, user);
    return user;
  }

  async createClient(clientData: Omit<Client, "id" | "clientId" | "clientSecret">): Promise<Client> {
    const id = this.currentId++;
    const clientId = crypto.randomBytes(16).toString('hex');
    const clientSecret = crypto.randomBytes(32).toString('hex');
    
    const client: Client = {
      id,
      clientId,
      clientSecret,
      ...clientData,
      createdAt: new Date(),
    };
    
    this.clients.set(id, client);
    return client;
  }

  async getClientById(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getClientByClientId(clientId: string): Promise<Client | undefined> {
    return Array.from(this.clients.values()).find(
      (client) => client.clientId === clientId
    );
  }

  async listClientsByUser(userId: number): Promise<Client[]> {
    return Array.from(this.clients.values()).filter(
      (client) => client.userId === userId
    );
  }

  async createAuthCode(codeData: Omit<AuthCode, "id">): Promise<AuthCode> {
    const id = this.currentId++;
    const authCode: AuthCode = { ...codeData, id };
    this.authCodes.set(codeData.code, authCode);
    return authCode;
  }

  async getAuthCodeByCode(code: string): Promise<AuthCode | undefined> {
    return this.authCodes.get(code);
  }

  async invalidateAuthCode(code: string): Promise<void> {
    this.authCodes.delete(code);
  }

  async createToken(tokenData: Omit<Token, "id">): Promise<Token> {
    const id = this.currentId++;
    const token: Token = { ...tokenData, id };
    this.tokens.set(tokenData.accessToken, token);
    this.tokens.set(tokenData.refreshToken, token);
    return token;
  }

  async getTokenByAccessToken(accessToken: string): Promise<Token | undefined> {
    return this.tokens.get(accessToken);
  }

  async getTokenByRefreshToken(refreshToken: string): Promise<Token | undefined> {
    return this.tokens.get(refreshToken);
  }
}

export const storage = new MemStorage();
