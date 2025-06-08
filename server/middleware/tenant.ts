import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

declare global {
  namespace Express {
    interface Request {
      tenant?: any;
      tenantId?: string;
    }
  }
}

/**
 * Tenant Resolution Middleware
 * 
 * Resolves the current tenant context from various sources:
 * 1. Subdomain (tenant.yourdomain.com)
 * 2. X-Tenant-Domain header
 * 3. Query parameter (?tenant=domain)
 * 4. Path parameter (/tenant/domain/...)
 */
export async function resolveTenant(req: Request, res: Response, next: NextFunction) {
  let tenantDomain: string | null = null;

  // Strategy 1: Subdomain resolution
  const host = req.headers.host || '';
  const subdomain = host.split('.')[0];
  if (subdomain && subdomain !== 'localhost' && subdomain !== '127' && !subdomain.includes(':')) {
    tenantDomain = subdomain;
  }

  // Strategy 2: Header-based resolution
  if (!tenantDomain && req.headers['x-tenant-domain']) {
    tenantDomain = req.headers['x-tenant-domain'] as string;
  }

  // Strategy 3: Query parameter resolution
  if (!tenantDomain && req.query.tenant) {
    tenantDomain = req.query.tenant as string;
  }

  // Strategy 4: Path-based resolution (/tenant/:domain/...)
  if (!tenantDomain && req.path.startsWith('/tenant/')) {
    const pathParts = req.path.split('/');
    if (pathParts.length >= 3) {
      tenantDomain = pathParts[2];
    }
  }

  // If we found a tenant domain, resolve the tenant
  if (tenantDomain) {
    try {
      const tenant = await storage.getTenantByDomain(tenantDomain);
      if (tenant) {
        req.tenant = tenant;
        req.tenantId = tenant._id.toString();
      } else {
        // Tenant domain provided but not found
        return res.status(404).json({ 
          error: 'Tenant not found',
          domain: tenantDomain 
        });
      }
    } catch (error) {
      console.error('Error resolving tenant:', error);
      return res.status(500).json({ error: 'Failed to resolve tenant' });
    }
  }

  next();
}

/**
 * Require Tenant Middleware
 * 
 * Ensures that a tenant context is available for the request.
 * Must be used after resolveTenant middleware.
 */
export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.tenant || !req.tenantId) {
    return res.status(400).json({ 
      error: 'Tenant context required',
      message: 'This endpoint requires a tenant context. Please specify a tenant via subdomain, header, or query parameter.'
    });
  }
  next();
}

/**
 * Optional Tenant Middleware
 * 
 * Allows requests to proceed with or without tenant context.
 * Useful for endpoints that can work in both single-tenant and multi-tenant modes.
 */
export function optionalTenant(req: Request, res: Response, next: NextFunction) {
  // This middleware just passes through after tenant resolution
  // The tenant context is available if resolved, but not required
  next();
}

/**
 * Tenant-Scoped Authentication Check
 * 
 * Ensures that authenticated users belong to the current tenant context.
 */
export function requireTenantAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.tenant || !req.tenantId) {
    return res.status(400).json({ error: 'Tenant context required' });
  }

  // Check if user belongs to the current tenant
  if (req.user && req.user.tenantId !== req.tenantId) {
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'User does not belong to this tenant'
    });
  }

  next();
}