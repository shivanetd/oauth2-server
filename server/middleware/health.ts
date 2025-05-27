/**
 * Enterprise Health Monitoring System
 * 
 * Provides comprehensive health checks, metrics, and monitoring endpoints
 * for enterprise production deployment and monitoring.
 */

import { Request, Response } from "express";
import { db } from "../db";
import { auditLogger } from "./audit";

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    memory: HealthCheck;
    disk: HealthCheck;
    audit: HealthCheck;
  };
  metrics: SystemMetrics;
}

interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  time: string;
  output?: string;
  details?: any;
}

interface SystemMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  authentication: {
    totalLogins: number;
    failedLogins: number;
    activeUsers: number;
  };
  oauth: {
    totalTokens: number;
    activeTokens: number;
    revokedTokens: number;
  };
}

class HealthMonitor {
  private startTime = Date.now();
  private requestMetrics = {
    total: 0,
    successful: 0,
    failed: 0,
    totalResponseTime: 0
  };

  recordRequest(statusCode: number, responseTime: number) {
    this.requestMetrics.total++;
    this.requestMetrics.totalResponseTime += responseTime;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.requestMetrics.successful++;
    } else {
      this.requestMetrics.failed++;
    }
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;

    const checks = {
      database: await this.checkDatabase(),
      memory: this.checkMemory(),
      disk: this.checkDisk(),
      audit: this.checkAuditSystem()
    };

    const overallStatus = this.determineOverallStatus(checks);
    const metrics = this.getMetrics();

    return {
      status: overallStatus,
      timestamp,
      version: process.env.npm_package_version || '1.0.0',
      uptime,
      checks,
      metrics
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    try {
      const start = Date.now();
      // Test database connectivity
      const testResult = await db.collection('_health').findOne({});
      const responseTime = Date.now() - start;
      
      return {
        status: responseTime < 1000 ? 'pass' : 'warn',
        time: responseTime + 'ms',
        details: {
          responseTime,
          connected: true
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        time: 'N/A',
        output: (error as Error).message
      };
    }
  }

  private checkMemory(): HealthCheck {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;

    return {
      status: heapUsagePercent < 80 ? 'pass' : heapUsagePercent < 95 ? 'warn' : 'fail',
      time: new Date().toISOString(),
      details: {
        heapUsed: heapUsedMB + 'MB',
        heapTotal: heapTotalMB + 'MB',
        heapUsagePercent: heapUsagePercent.toFixed(1) + '%'
      }
    };
  }

  private checkDisk(): HealthCheck {
    // Simplified disk check - in production, you'd check actual disk usage
    return {
      status: 'pass',
      time: new Date().toISOString(),
      details: {
        status: 'Available'
      }
    };
  }

  private checkAuditSystem(): HealthCheck {
    try {
      const stats = auditLogger.getStats();
      return {
        status: 'pass',
        time: new Date().toISOString(),
        details: stats
      };
    } catch (error) {
      return {
        status: 'fail',
        time: new Date().toISOString(),
        output: (error as Error).message
      };
    }
  }

  private determineOverallStatus(checks: any): 'healthy' | 'unhealthy' | 'degraded' {
    const checkValues = Object.values(checks) as HealthCheck[];
    
    if (checkValues.some(check => check.status === 'fail')) {
      return 'unhealthy';
    }
    
    if (checkValues.some(check => check.status === 'warn')) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private getMetrics(): SystemMetrics {
    const auditStats = auditLogger.getStats();
    
    return {
      requests: {
        total: this.requestMetrics.total,
        successful: this.requestMetrics.successful,
        failed: this.requestMetrics.failed,
        averageResponseTime: this.requestMetrics.total > 0 
          ? Math.round(this.requestMetrics.totalResponseTime / this.requestMetrics.total)
          : 0
      },
      authentication: {
        totalLogins: auditStats.loginAttempts,
        failedLogins: 0, // Would track this in production
        activeUsers: 0    // Would track this in production
      },
      oauth: {
        totalTokens: 0,    // Would track this in production
        activeTokens: 0,   // Would track this in production
        revokedTokens: 0   // Would track this in production
      }
    };
  }
}

export const healthMonitor = new HealthMonitor();

/**
 * Health endpoint handlers
 */
export async function healthCheck(req: Request, res: Response) {
  try {
    const health = await healthMonitor.getHealthStatus();
    
    const statusCode = health.status === 'healthy' ? 200 
                     : health.status === 'degraded' ? 200 
                     : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message
    });
  }
}

export function readinessCheck(req: Request, res: Response) {
  // Simple readiness check - can be expanded based on requirements
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
}

export function livenessCheck(req: Request, res: Response) {
  // Simple liveness check
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Date.now() - healthMonitor['startTime']
  });
}