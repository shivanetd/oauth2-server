/**
 * Enterprise Audit Logging System
 * 
 * Comprehensive audit logging for compliance, security monitoring, and operational insights.
 * Tracks all authentication events, admin actions, and system operations.
 */

import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

export enum AuditEventType {
  LOGIN_SUCCESS = "auth.login.success",
  LOGIN_FAILURE = "auth.login.failure",
  LOGOUT = "auth.logout",
  REGISTRATION = "auth.registration",
  OAUTH_AUTHORIZE = "oauth.authorize",
  OAUTH_TOKEN = "oauth.token",
  ADMIN_ACTION = "admin.action",
  SECURITY_EVENT = "security.event",
  SYSTEM_ERROR = "system.error"
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  userId?: string;
  clientId?: string;
  ipAddress: string;
  userAgent: string;
  method: string;
  url: string;
  statusCode?: number;
  duration?: number;
  details: Record<string, any>;
  correlationId: string;
}

class AuditLogger {
  private logs: AuditLog[] = [];
  private maxLogs = 10000;

  log(event: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const auditLog: AuditLog = {
      id: randomUUID(),
      timestamp: new Date(),
      ...event
    };

    this.logs.push(auditLog);
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    console.log(JSON.stringify({
      level: this.getLogLevel(event.eventType),
      timestamp: auditLog.timestamp.toISOString(),
      message: `${event.eventType}: ${event.method} ${event.url}`,
      audit: auditLog
    }));
  }

  getLogs(limit = 100): AuditLog[] {
    return this.logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentLogs = this.logs.filter(log => log.timestamp > last24h);
    
    return {
      total: this.logs.length,
      last24h: recentLogs.length,
      loginAttempts: this.logs.filter(log => 
        log.eventType === AuditEventType.LOGIN_SUCCESS || 
        log.eventType === AuditEventType.LOGIN_FAILURE
      ).length,
      securityEvents: this.logs.filter(log => 
        log.eventType === AuditEventType.SECURITY_EVENT
      ).length
    };
  }

  private getLogLevel(eventType: AuditEventType): string {
    if (eventType.includes('error')) return 'error';
    if (eventType.includes('security')) return 'warn';
    return 'info';
  }
}

export const auditLogger = new AuditLogger();

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const correlationId = randomUUID();
  
  (req as any).correlationId = correlationId;

  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    let eventType = AuditEventType.SYSTEM_ERROR;
    
    if (req.path.includes('/login')) {
      eventType = res.statusCode === 200 ? AuditEventType.LOGIN_SUCCESS : AuditEventType.LOGIN_FAILURE;
    } else if (req.path.includes('/logout')) {
      eventType = AuditEventType.LOGOUT;
    } else if (req.path.includes('/register')) {
      eventType = AuditEventType.REGISTRATION;
    } else if (req.path.includes('/oauth')) {
      eventType = AuditEventType.OAUTH_AUTHORIZE;
    } else if (req.path.includes('/admin')) {
      eventType = AuditEventType.ADMIN_ACTION;
    }

    auditLogger.log({
      eventType,
      userId: (req as any).user?.id,
      clientId: req.body?.client_id || req.query?.client_id as string,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      correlationId,
      details: {
        query: req.query,
        params: req.params
      }
    });

    return originalEnd.call(this, chunk, encoding);
  };

  next();
}