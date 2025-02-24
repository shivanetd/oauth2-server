import { db } from "./db";
import session from "express-session";
import MongoStore from "connect-mongo";
import crypto from "crypto";
import { 
  User, InsertUser, 
  Client, InsertClient, 
  AuthCode, InsertAuthCode,
  Token, InsertToken 
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Client operations  
  createClient(client: Omit<InsertClient, "clientId" | "clientSecret">): Promise<Client>;
  getClientById(id: string): Promise<Client | undefined>;
  getClientByClientId(clientId: string): Promise<Client | undefined>;
  listClientsByUser(userId: string): Promise<Client[]>;

  // OAuth operations
  createAuthCode(code: InsertAuthCode): Promise<AuthCode>;
  getAuthCodeByCode(code: string): Promise<AuthCode | undefined>;
  invalidateAuthCode(code: string): Promise<void>;

  createToken(token: InsertToken): Promise<Token>;
  getTokenByAccessToken(token: string): Promise<Token | undefined>;
  getTokenByRefreshToken(token: string): Promise<Token | undefined>;

  sessionStore: session.Store;
}

export class MongoStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = MongoStore.create({
      clientPromise: db.client.connect(),
      collectionName: 'sessions'
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const user = await db.collection('users').findOne({ _id: id });
    return user as User | undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await db.collection('users').findOne({ username });
    return user as User | undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.collection('users').insertOne(insertUser);
    return { ...insertUser, _id: result.insertedId.toString() } as User;
  }

  async createClient(clientData: Omit<InsertClient, "clientId" | "clientSecret">): Promise<Client> {
    const client = {
      ...clientData,
      clientId: crypto.randomBytes(16).toString('hex'),
      clientSecret: crypto.randomBytes(32).toString('hex'),
      createdAt: new Date()
    };
    const result = await db.collection('clients').insertOne(client);
    return { ...client, _id: result.insertedId.toString() } as Client;
  }

  async getClientById(id: string): Promise<Client | undefined> {
    const client = await db.collection('clients').findOne({ _id: id });
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

  async createAuthCode(codeData: InsertAuthCode): Promise<AuthCode> {
    const result = await db.collection('authCodes').insertOne(codeData);
    return { ...codeData, _id: result.insertedId.toString() } as AuthCode;
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
    return { ...tokenData, _id: result.insertedId.toString() } as Token;
  }

  async getTokenByAccessToken(accessToken: string): Promise<Token | undefined> {
    const token = await db.collection('tokens').findOne({ accessToken });
    return token as Token | undefined;
  }

  async getTokenByRefreshToken(refreshToken: string): Promise<Token | undefined> {
    const token = await db.collection('tokens').findOne({ refreshToken });
    return token as Token | undefined;
  }
}

export const storage = new MongoStorage();