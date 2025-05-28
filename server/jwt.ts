import jwt, { Secret, JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from './db';
import { storage } from './storage';
import type { JwtKeys } from '@shared/schema';

class JwtService {
  private currentKeys: JwtKeys | null = null;

  async initialize() {
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

  async getPublicKey(): Promise<string | null> {
    const keys = await this.getActiveKeys();
    return keys?.publicKey || null;
  }

  async getJWKS() {
    const keys = await this.getActiveKeys();
    if (!keys) {
      throw new Error('No active keys found');
    }

    // Convert PEM public key to JWK format
    const key = crypto.createPublicKey(keys.publicKey);
    const keyData = key.export({ format: 'jwk' });

    return {
      ...keyData,
      kid: this.generateKeyId(keys.publicKey),
      use: 'sig',
      alg: 'RS256',
    };
  }

  private generateKeyId(publicKey: string): string {
    return crypto.createHash('sha256')
      .update(publicKey)
      .digest('hex')
      .slice(0, 16);
  }

  private async generateNewKeyPair() {
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

    await db.collection('jwtKeys').updateMany(
      { isActive: true },
      { $set: { isActive: false } }
    );

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

  async generateAccessToken(payload: object, expiresIn: string = '1h'): Promise<string> {
    const keys = await this.getActiveKeys();
    if (!keys) {
      throw new Error('No active JWT keys found');
    }

    // Work around TypeScript limitation by using any
    // This is safe because we know the structure matches what jsonwebtoken expects
    return jwt.sign(
      payload, 
      keys.privateKey as any, 
      { 
        algorithm: 'RS256' as any,
        expiresIn: expiresIn as any,
        keyid: this.generateKeyId(keys.publicKey)
      }
    );
  }

  async generateRefreshToken(payload: any, expiresIn: string = '7d'): Promise<string> {
    const keys = await this.getActiveKeys();
    if (!keys) {
      throw new Error('No active JWT keys found');
    }

    // Work around TypeScript limitation by using any
    // This is safe because we know the structure matches what jsonwebtoken expects
    return jwt.sign(
      payload, 
      keys.privateKey as any, 
      { 
        algorithm: 'RS256' as any,
        expiresIn: expiresIn as any
      }
    );
  }

  async verifyToken(token: string): Promise<any> {
    const keys = await this.getActiveKeys();
    if (!keys) {
      throw new Error('No active JWT keys found');
    }

    try {
      // First, check if token is in the revocation list
      const revokedToken = await db.collection('revokedTokens').findOne({ 
        token, 
        type: 'access_token' 
      });
      
      if (revokedToken) {
        throw new Error('Token has been revoked');
      }
      
      // Verify token signature and expiration
      const payload = jwt.verify(token, keys.publicKey, {
        algorithms: ['RS256']
      });
      
      // For additional verification, check if token exists in database and is not revoked
      const tokenRecord = await storage.getTokenByAccessToken(token);
      if (tokenRecord && tokenRecord.revoked) {
        throw new Error('Token has been revoked');
      }
      
      return payload;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Invalid token');
    }
  }
}

export const jwtService = new JwtService();
// Initialize the JWT service when the server starts
jwtService.initialize().catch(console.error);