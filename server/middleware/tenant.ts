/**
 * Multi-Tenant Middleware
 * 
 * Provides tenant isolation and context management for multi-tenant OAuth2 server.
 * Handles tenant resolution, validation, and enforces data isolation.
 */

import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import type { Tenant } from "@shared/schema";

// Extend Express Request to include tenant context
declare global {
  namespace Express {
    interface Request {
      tenant?: Tenant;
      tenantId?: string;
    }
  }
}

/**
 * Tenant resolution strategies
 */
export enum TenantResolutionStrategy {
  SUBDOMAIN = "subdomain",  // tenant.example.com
  HEADER = "header",        // X-Tenant-Domain header
  PATH = "path",           // /tenant/domain/...
  QUERY = "query"          // ?tenant=domain
}

interface TenantMiddlewareConfig {
  strategy: TenantResolutionStrategy;
  headerName?: string;
  queryParam?: string;
  pathPrefix?: string;
  defaultTenant?: string;
  requireTenant?: boolean;
}

/**
 * Create tenant resolution middleware
 */
export function createTenantMiddleware(config: TenantMiddlewareConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantDomain = resolveTenantDomain(req, config);
      
      if (!tenantDomain) {
        if (config.requireTenant) {
          return res.status(400).json({ 
            error: "Tenant not specified",
            message: "This endpoint requires a tenant to be specified"
          });
        }
        return next();
      }

      // Fetch tenant from database
      const tenant = await storage.getTenantByDomain(tenantDomain);
      
      if (!tenant) {
        return res.status(404).json({ 
          error: "Tenant not found",
          message: `No tenant found for domain: ${tenantDomain}`
        });
      }

      if (!tenant.isActive) {
        return res.status(403).json({ 
          error: "Tenant inactive",
          message: "This organization is currently inactive"
        });
      }

      // Add tenant context to request
      req.tenant = tenant;
      req.tenantId = tenant._id.toString();
      
      next();
    } catch (error) {
      console.error("Tenant middleware error:", error);
      res.status(500).json({ 
        error: "Internal server error",
        message: "Failed to resolve tenant"
      });
    }
  };
}

/**
 * Resolve tenant domain from request based on strategy
 */
function resolveTenantDomain(req: Request, config: TenantMiddlewareConfig): string | null {
  switch (config.strategy) {
    case TenantResolutionStrategy.SUBDOMAIN:
      return extractSubdomain(req.get('host') || '');
      
    case TenantResolutionStrategy.HEADER:
      return req.get(config.headerName || 'X-Tenant-Domain') || null;
      
    case TenantResolutionStrategy.PATH:
      const prefix = config.pathPrefix || '/tenant/';
      if (req.path.startsWith(prefix)) {
        const segments = req.path.slice(prefix.length).split('/');
        return segments[0] || null;
      }
      return null;
      
    case TenantResolutionStrategy.QUERY:
      return req.query[config.queryParam || 'tenant'] as string || null;
      
    default:
      return config.defaultTenant || null;
  }
}

/**
 * Extract subdomain from host header
 */
function extractSubdomain(host: string): string | null {
  const parts = host.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }
  return null;
}

/**
 * Middleware to require tenant context
 */
export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.tenant || !req.tenantId) {
    return res.status(400).json({ 
      error: "Tenant required",
      message: "This operation requires a tenant context"
    });
  }
  next();
}

/**
 * Middleware to enforce tenant isolation in database queries
 */
export function enforceTenantIsolation(req: Request, res: Response, next: NextFunction) {
  if (!req.tenantId) {
    return res.status(400).json({ 
      error: "Tenant isolation required",
      message: "All operations must be scoped to a tenant"
    });
  }
  
  // Store original query/body to add tenant filters
  const originalBody = req.body;
  const originalQuery = req.query;
  
  // Add tenantId to request body for POST/PUT operations
  if (req.method === 'POST' || req.method === 'PUT') {
    req.body = {
      ...originalBody,
      tenantId: req.tenantId
    };
  }
  
  // Add tenant filter to query operations
  req.query = {
    ...originalQuery,
    tenantId: req.tenantId
  };
  
  next();
}

/**
 * Super admin middleware - bypasses tenant isolation
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  const user = req.user as any;
  if (!user.isSuperAdmin) {
    return res.status(403).json({ 
      error: "Super admin access required",
      message: "This operation requires super admin privileges"
    });
  }
  
  next();
}

/**
 * Tenant admin middleware - requires admin within tenant context
 */
export function requireTenantAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (!req.tenant || !req.tenantId) {
    return res.status(400).json({ error: "Tenant context required" });
  }
  
  const user = req.user as any;
  
  // Super admins can access any tenant
  if (user.isSuperAdmin) {
    return next();
  }
  
  // Check if user belongs to this tenant and has admin rights
  if (user.tenantId !== req.tenantId || !user.isAdmin) {
    return res.status(403).json({ 
      error: "Tenant admin access required",
      message: "You must be an admin of this organization"
    });
  }
  
  next();
}

/**
 * Default tenant middleware configurations
 */
export const tenantConfigs = {
  // For API routes - use header-based tenant resolution
  api: {
    strategy: TenantResolutionStrategy.HEADER,
    headerName: 'X-Tenant-Domain',
    requireTenant: true
  },
  
  // For OAuth flows - use subdomain resolution
  oauth: {
    strategy: TenantResolutionStrategy.SUBDOMAIN,
    requireTenant: true
  },
  
  // For admin routes - flexible resolution
  admin: {
    strategy: TenantResolutionStrategy.HEADER,
    headerName: 'X-Tenant-Domain',
    requireTenant: false
  }
};