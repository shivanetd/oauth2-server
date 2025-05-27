/**
 * Enterprise Security Middleware
 * 
 * Implements security headers, CORS policies, and security monitoring
 * for enterprise-grade OAuth2 authorization server.
 */

import { Request, Response, NextFunction } from "express";
import { auditLogger, AuditEventType } from "./audit";

/**
 * Security Headers Middleware
 * Adds enterprise-grade security headers to all responses
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' https:; " +
    "connect-src 'self' https:; " +
    "frame-ancestors 'none';"
  );
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
}

/**
 * Enterprise CORS Configuration
 * Configurable CORS for different environments
 */
export function enterpriseCors(req: Request, res: Response, next: NextFunction) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5000'];
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Correlation-ID'
  );
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
}

/**
 * Security Monitoring
 * Detects and logs suspicious activities
 */
export function securityMonitoring(req: Request, res: Response, next: NextFunction) {
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /eval\(/i,  // Code injection
  ];
  
  const userAgent = req.get('User-Agent') || '';
  const suspicious = suspiciousPatterns.some(pattern => 
    pattern.test(req.url) || 
    pattern.test(JSON.stringify(req.body)) ||
    pattern.test(userAgent)
  );
  
  if (suspicious) {
    auditLogger.log({
      eventType: AuditEventType.SECURITY_EVENT,
      userId: (req as any).user?.id,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent,
      method: req.method,
      url: req.originalUrl,
      correlationId: (req as any).correlationId || 'no-correlation',
      details: {
        reason: 'suspicious_request',
        patterns_matched: suspiciousPatterns.filter(p => 
          p.test(req.url) || p.test(JSON.stringify(req.body)) || p.test(userAgent)
        ).map(p => p.toString())
      }
    });
  }
  
  next();
}