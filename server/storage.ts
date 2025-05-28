import { users, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

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

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createClient(clientData: Omit<Client, "id" | "clientId" | "clientSecret">): Promise<Client> {
    const [client] = await db.insert(clients).values({...clientData, createdAt: new Date(), clientId: crypto.randomBytes(16).toString('hex'), clientSecret: crypto.randomBytes(32).toString('hex')}).returning();
    return client;
  }

  async getClientById(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getClientByClientId(clientId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.clientId, clientId));
    return client;
  }

  async listClientsByUser(userId: number): Promise<Client[]> {
    return db.select().from(clients).where(eq(clients.userId, userId));
  }

  async createAuthCode(codeData: Omit<AuthCode, "id">): Promise<AuthCode> {
    const [authCode] = await db.insert(authCodes).values(codeData).returning();
    return authCode;
  }

  async getAuthCodeByCode(code: string): Promise<AuthCode | undefined> {
    const [authCode] = await db.select().from(authCodes).where(eq(authCodes.code, code));
    return authCode;
  }

  async invalidateAuthCode(code: string): Promise<void> {
    await db.delete(authCodes).where(eq(authCodes.code, code));
  }

  async createToken(tokenData: Omit<Token, "id">): Promise<Token> {
    const [token] = await db.insert(tokens).values(tokenData).returning();
    return token;
  }

  async getTokenByAccessToken(accessToken: string): Promise<Token | undefined> {
    const [token] = await db.select().from(tokens).where(eq(tokens.accessToken, accessToken));
    return token;
  }

  async getTokenByRefreshToken(refreshToken: string): Promise<Token | undefined> {
    const [token] = await db.select().from(tokens).where(eq(tokens.refreshToken, refreshToken));
    return token;
  }
}

export const storage = new DatabaseStorage();

import { Client, AuthCode, Token } from "@shared/schema";
import crypto from "crypto";
import { clients, authCodes, tokens } from "@shared/schema";