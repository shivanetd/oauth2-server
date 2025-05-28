import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from './db';
import type { JwtKeys } from '@shared/schema';

class JwtService {
  private currentKeys: JwtKeys | null = null;

  async initialize() {
    // Get the active key pair or generate a new one
    const keys = await this.getActiveKeys();
    if (!keys) {
      await this.generateNewKeyPair();
    }
  }

  private async getActiveKeys(): Promise<JwtKeys | null> {
    const keys = await db.collection('jwtKeys').findOne({ isActive: true });
    if (keys) {
      this.currentKeys = keys as JwtKeys;
    }
    return this.currentKeys;
  }

  private async generateNewKeyPair() {
    // Generate new RSA key pair
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    // Deactivate any existing active keys
    await db.collection('jwtKeys').updateMany(
      { isActive: true },
      { $set: { isActive: false } }
    );

    // Store new keys
    const newKeys = {
      privateKey,
      publicKey,
      algorithm: 'RS256',
      createdAt: new Date(),
      isActive: true
    };

    const result = await db.collection('jwtKeys').insertOne(newKeys);
    this.currentKeys = { ...newKeys, _id: result.insertedId };
  }

  async generateAccessToken(payload: any, expiresIn: string = '1h'): Promise<string> {
    const keys = await this.getActiveKeys();
    if (!keys) {
      throw new Error('No active JWT keys found');
    }

    return jwt.sign(payload, keys.privateKey, {
      algorithm: keys.algorithm as jwt.Algorithm,
      expiresIn
    });
  }

  async generateRefreshToken(payload: any, expiresIn: string = '7d'): Promise<string> {
    const keys = await this.getActiveKeys();
    if (!keys) {
      throw new Error('No active JWT keys found');
    }

    return jwt.sign(payload, keys.privateKey, {
      algorithm: keys.algorithm as jwt.Algorithm,
      expiresIn
    });
  }

  async verifyToken(token: string): Promise<any> {
    const keys = await this.getActiveKeys();
    if (!keys) {
      throw new Error('No active JWT keys found');
    }

    try {
      return jwt.verify(token, keys.publicKey);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

export const jwtService = new JwtService();
// Initialize the JWT service when the server starts
jwtService.initialize().catch(console.error);
