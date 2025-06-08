# User-to-Tenant Mapping in OAuth2 Authorization Server

## Overview

Your OAuth2 Authorization Server implements complete multi-tenant isolation where every user belongs to exactly one organization (tenant). This ensures enterprise-grade data security and compliance.

## How User-Tenant Mapping Works

### 1. Registration Process

When users register, they are assigned to a specific tenant through multiple strategies:

```typescript
// Example: User registration with tenant context
{
  "username": "john.doe",
  "password": "password123",
  "email": "john@acme.com",
  "tenantId": "674a1b2c3d4e5f6789012345", // Links to Acme Corporation
  "firstName": "John",
  "lastName": "Doe"
}
```

### 2. Tenant Resolution Methods

#### Method 1: Explicit Tenant Selection
- User selects organization during registration
- Form includes dropdown of available tenants
- Creates permanent tenant association

#### Method 2: Subdomain-Based Mapping
```
https://acme.yourdomain.com/auth
```
- Extracts "acme" from subdomain
- Looks up tenant by domain name
- All operations scoped to Acme organization

#### Method 3: Header-Based Mapping
```http
POST /api/register
X-Tenant-Domain: acme
Content-Type: application/json
```

#### Method 4: Path-Based Mapping
```
POST /tenant/acme/api/register
```

### 3. Database Structure

Each user record contains:
- `_id`: Unique user identifier
- `username`: User's login name
- `tenantId`: **Permanent link to organization**
- `email`: Contact information
- `isAdmin`: Tenant-scoped admin privileges
- `isSuperAdmin`: Cross-tenant management access

## Current System Mappings

### Available Tenants in Your System

1. **Acme Corporation**
   - ID: `674a1b2c3d4e5f6789012345`
   - Domain: `acme`
   - Plan: Professional
   - Users: Isolated to this organization

2. **TechStart Inc**
   - ID: `674a1b2c3d4e5f6789012346`
   - Domain: `techstart`
   - Plan: Starter
   - Users: Isolated to this organization

3. **System Tenant**
   - ID: `system`
   - Super admin users
   - Cross-tenant management capabilities

### User Mapping Examples

```json
// User in Acme Corporation
{
  "username": "john.acme",
  "tenantId": "674a1b2c3d4e5f6789012345",
  "organization": "Acme Corporation",
  "canAccess": ["acme users", "acme oauth clients", "acme data only"]
}

// User in TechStart Inc
{
  "username": "jane.techstart",
  "tenantId": "674a1b2c3d4e5f6789012346", 
  "organization": "TechStart Inc",
  "canAccess": ["techstart users", "techstart oauth clients", "techstart data only"]
}

// Super Admin User
{
  "username": "superadmin",
  "tenantId": "system",
  "organization": "System Administration",
  "canAccess": ["all tenants", "all users", "all oauth clients", "tenant management"]
}
```

## Data Isolation Benefits

### 1. Complete User Isolation
- Users only see other users in their tenant
- Cross-tenant user access is impossible
- Login attempts are tenant-scoped

### 2. OAuth Client Isolation
- Applications created by users belong to their tenant
- No cross-tenant client access
- Authorization codes and tokens are tenant-specific

### 3. Admin Scope Limitation
- Tenant admins only manage their organization
- Super admins can manage all tenants
- Regular users see only their own data

## Testing Tenant Mapping

### 1. View Current Mappings
Navigate to `/tenant-mapping` to see:
- Your current tenant assignment
- All user-tenant mappings (if admin)
- Available organizations for registration
- Tenant resolution strategies

### 2. Create Test Users
Use the tenant mapping form to:
- Select target organization
- Create user with specific tenant assignment
- Verify isolation between tenants

### 3. Test Data Isolation
- Create OAuth clients as different users
- Verify clients are tenant-scoped
- Confirm cross-tenant access is blocked

## Implementation Details

### Server-Side Tenant Scoping

```typescript
// All user queries include tenant filter
async getUsersByTenant(tenantId: string): Promise<User[]> {
  return await db.collection("users")
    .find({ tenantId })
    .toArray();
}

// OAuth clients are tenant-scoped
async getClientsByTenant(tenantId: string): Promise<Client[]> {
  return await db.collection("clients")
    .find({ tenantId })
    .toArray();
}
```

### Middleware-Based Tenant Resolution

```typescript
// Automatically resolves tenant context
export async function resolveTenant(req: Request, res: Response, next: NextFunction) {
  let tenantDomain: string | null = null;

  // Multiple resolution strategies
  if (req.headers.host?.includes('.')) {
    tenantDomain = req.headers.host.split('.')[0];
  }
  
  if (req.headers['x-tenant-domain']) {
    tenantDomain = req.headers['x-tenant-domain'] as string;
  }

  if (tenantDomain) {
    const tenant = await storage.getTenantByDomain(tenantDomain);
    if (tenant) {
      req.tenantId = tenant._id.toString();
    }
  }

  next();
}
```

## Security Features

### 1. Permanent Tenant Association
- Once assigned, users cannot change tenants
- Prevents data leakage between organizations
- Maintains audit trail

### 2. Automatic Scoping
- All database queries include tenant filters
- API responses are tenant-filtered
- Error messages don't reveal cross-tenant data

### 3. Session Isolation
- User sessions include tenant context
- Session data is tenant-isolated
- Logout clears tenant-specific session data

This mapping system ensures your OAuth2 server provides enterprise-grade multi-tenancy with complete data isolation between organizations.