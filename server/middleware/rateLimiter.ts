/**
 * Enterprise Rate Limiting System
 * 
 * Protects against DDoS attacks, brute force attempts, and ensures fair usage.
 * Implements multiple rate limiting strategies for different endpoints.
 */

import { Request, Response, NextFunction } from "express";
import { auditLogger, AuditEventType } from "./audit";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
  skipSuccessfulRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  
  constructor(private config: RateLimitConfig) {}

  isAllowed(key: string): boolean {
    const now = Date.now();
    const entry = this.store.get(key);
    
    if (!entry || now > entry.resetTime) {
      this.store.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs
      });
      return true;
    }
    
    if (entry.count >= this.config.maxRequests) {
      return false;
    }
    
    entry.count++;
    return true;
  }

  getRemainingRequests(key: string): number {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.resetTime) {
      return this.config.maxRequests;
    }
    return Math.max(0, this.config.maxRequests - entry.count);
  }

  getResetTime(key: string): number {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.resetTime) {
      return Date.now() + this.config.windowMs;
    }
    return entry.resetTime;
  }

  // Cleanup expired entries periodically
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// Different rate limiters for different endpoints
export const loginRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  message: "Too many login attempts, please try again later"
});

export const oauthRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 OAuth requests per minute
  message: "Rate limit exceeded for OAuth operations"
});

export const generalRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 general requests per minute
  message: "Rate limit exceeded"
});

export const adminRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 admin requests per minute
  message: "Rate limit exceeded for admin operations"
});

export function createRateLimitMiddleware(limiter: RateLimiter) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!limiter.isAllowed(key)) {
      // Log rate limit violation
      auditLogger.log({
        eventType: AuditEventType.SECURITY_EVENT,
        userId: (req as any).user?.id,
        ipAddress: key,
        userAgent: req.get('User-Agent') || 'unknown',
        method: req.method,
        url: req.originalUrl,
        statusCode: 429,
        correlationId: (req as any).correlationId || 'no-correlation',
        details: {
          reason: 'rate_limit_exceeded',
          rateLimitType: 'general'
        }
      });

      res.status(429).json({
        error: 'Rate limit exceeded',
        message: limiter.message || 'Too many requests',
        retryAfter: Math.ceil((limiter.getResetTime(key) - Date.now()) / 1000)
      });
      return;
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', limiter.maxRequests);
    res.setHeader('X-RateLimit-Remaining', limiter.getRemainingRequests(key));
    res.setHeader('X-RateLimit-Reset', Math.ceil(limiter.getResetTime(key) / 1000));
    
    next();
  };
}

// Cleanup expired entries every 5 minutes
setInterval(() => {
  loginRateLimiter.cleanup();
  oauthRateLimiter.cleanup();
  generalRateLimiter.cleanup();
  adminRateLimiter.cleanup();
}, 5 * 60 * 1000);