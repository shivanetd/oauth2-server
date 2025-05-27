import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Shield, User, Mail, Phone, Settings, Building, Eye } from "lucide-react";

export default function ScopeDemoPage() {
  const { user } = useAuth();
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['read']);

  const availableScopes = [
    {
      name: 'read',
      description: 'Basic account access',
      icon: Eye,
      attributes: ['username'],
      color: 'bg-blue-100 text-blue-800'
    },
    {
      name: 'profile',
      description: 'Basic profile information',
      icon: User,
      attributes: ['username', 'firstName', 'lastName', 'createdAt'],
      color: 'bg-green-100 text-green-800'
    },
    {
      name: 'email',
      description: 'Email address access',
      icon: Mail,
      attributes: ['email'],
      color: 'bg-purple-100 text-purple-800'
    },
    {
      name: 'phone',
      description: 'Phone number access',
      icon: Phone,
      attributes: ['phoneNumber'],
      color: 'bg-orange-100 text-orange-800'
    },
    {
      name: 'preferences',
      description: 'User preferences',
      icon: Settings,
      attributes: ['preferredLanguage', 'theme', 'timezone'],
      color: 'bg-cyan-100 text-cyan-800'
    },
    {
      name: 'organization',
      description: 'Organization information',
      icon: Building,
      attributes: ['organizationId', 'role'],
      color: 'bg-yellow-100 text-yellow-800'
    },
    {
      name: 'security',
      description: 'Security information',
      icon: Shield,
      attributes: ['mfaEnabled', 'lastLogin', 'isActive'],
      color: 'bg-red-100 text-red-800'
    }
  ];

  const toggleScope = (scopeName: string) => {
    setSelectedScopes(prev => 
      prev.includes(scopeName)
        ? prev.filter(s => s !== scopeName)
        : [...prev, scopeName]
    );
  };

  const getAllowedAttributes = () => {
    const allowed = new Set<string>();
    selectedScopes.forEach(scope => {
      const scopeInfo = availableScopes.find(s => s.name === scope);
      if (scopeInfo) {
        scopeInfo.attributes.forEach(attr => allowed.add(attr));
      }
    });
    return Array.from(allowed);
  };

  const getVisibleUserData = () => {
    if (!user) return {};
    
    const allowedAttributes = getAllowedAttributes();
    const visibleData: any = {};
    
    if (allowedAttributes.includes('username')) visibleData.username = user.username;
    if (allowedAttributes.includes('firstName')) visibleData.firstName = user.firstName || 'Not set';
    if (allowedAttributes.includes('lastName')) visibleData.lastName = user.lastName || 'Not set';
    if (allowedAttributes.includes('email')) visibleData.email = user.email || 'Not set';
    if (allowedAttributes.includes('phoneNumber')) visibleData.phoneNumber = user.phoneNumber || 'Not set';
    if (allowedAttributes.includes('preferredLanguage')) visibleData.preferredLanguage = user.preferredLanguage || 'en';
    if (allowedAttributes.includes('theme')) visibleData.theme = user.theme || 'system';
    if (allowedAttributes.includes('timezone')) visibleData.timezone = user.timezone || 'UTC';
    if (allowedAttributes.includes('organizationId')) visibleData.organizationId = user.organizationId || 'Not set';
    if (allowedAttributes.includes('role')) visibleData.role = user.role || 'Not set';
    if (allowedAttributes.includes('mfaEnabled')) visibleData.mfaEnabled = user.mfaEnabled ? 'Enabled' : 'Disabled';
    if (allowedAttributes.includes('isActive')) visibleData.isActive = user.isActive !== false ? 'Active' : 'Inactive';
    if (allowedAttributes.includes('createdAt')) visibleData.createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown';
    if (allowedAttributes.includes('lastLogin')) visibleData.lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never';
    
    return visibleData;
  };

  if (!user) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p>Please log in to view the scope mapping demo.</p>
            <Button asChild className="mt-4">
              <Link to="/auth">Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" asChild>
          <Link to="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">OAuth Scope Mapping Demo</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scope Selection */}
        <Card>
          <CardHeader>
            <CardTitle>OAuth Scopes</CardTitle>
            <CardDescription>
              Select which scopes to grant access to. Each scope controls which user attributes are accessible.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableScopes.map((scope) => {
              const Icon = scope.icon;
              const isSelected = selectedScopes.includes(scope.name);
              
              return (
                <div key={scope.name} className="flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/50">
                  <div className="flex-shrink-0 mt-1">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleScope(scope.name)}
                        className="h-6 px-2 text-xs"
                      >
                        {isSelected ? 'Granted' : 'Grant'}
                      </Button>
                      <Badge className={`text-xs ${scope.color}`}>
                        {scope.name}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {scope.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {scope.attributes.map((attr) => (
                        <Badge key={attr} variant="secondary" className="text-xs">
                          {attr}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Visible Data */}
        <Card>
          <CardHeader>
            <CardTitle>Accessible User Data</CardTitle>
            <CardDescription>
              Based on the selected scopes, this is the user data that would be accessible to an OAuth client.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-sm font-medium">Active Scopes:</span>
                {selectedScopes.map((scope) => {
                  const scopeInfo = availableScopes.find(s => s.name === scope);
                  return (
                    <Badge key={scope} className={`text-xs ${scopeInfo?.color || 'bg-gray-100 text-gray-800'}`}>
                      {scope}
                    </Badge>
                  );
                })}
              </div>

              <Separator />

              <div className="space-y-3">
                {Object.keys(getVisibleUserData()).length === 0 ? (
                  <p className="text-muted-foreground text-sm">No data accessible with current scope selection.</p>
                ) : (
                  Object.entries(getVisibleUserData()).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center py-2 border-b border-border/50 last:border-b-0">
                      <span className="font-medium text-sm">{key}:</span>
                      <span className="text-sm text-muted-foreground font-mono">{String(value)}</span>
                    </div>
                  ))
                )}
              </div>

              {Object.keys(getVisibleUserData()).length > 0 && (
                <>
                  <Separator />
                  <div className="text-xs text-muted-foreground space-y-2">
                    <p><strong>How this works:</strong></p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Each OAuth scope grants access to specific user attributes</li>
                      <li>The <code>/oauth/userinfo</code> endpoint filters data based on token scopes</li>
                      <li>Standard OpenID Connect claims are mapped automatically</li>
                      <li>Custom attributes use namespaced claim names</li>
                      <li>Admin scope grants access to all user attributes</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Endpoints Information */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>OAuth Endpoints</CardTitle>
          <CardDescription>
            Key endpoints for scope-based profile attribute access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">UserInfo Endpoint</h4>
              <p className="text-sm text-muted-foreground">
                <code className="bg-muted px-1 py-0.5 rounded">GET /oauth/userinfo</code>
              </p>
              <p className="text-xs text-muted-foreground">
                Returns user profile data filtered by the access token's scopes. Requires Bearer authentication.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Scopes Information</h4>
              <p className="text-sm text-muted-foreground">
                <code className="bg-muted px-1 py-0.5 rounded">GET /oauth/scopes</code>
              </p>
              <p className="text-xs text-muted-foreground">
                Returns available scopes and their corresponding user attributes for client applications.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}