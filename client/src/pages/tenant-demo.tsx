import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation, Link } from "wouter";
import { 
  Building, 
  Users, 
  KeyRound, 
  Shield, 
  CheckCircle,
  Globe,
  Database,
  ArrowRight
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function TenantDemo() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: tenants = [] } = useQuery<any[]>({
    queryKey: ["/api/public/tenants"],
  });

  const { data: currentUserClients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
    enabled: !!user,
  });

  const createTestClientMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/clients", {
        name: `Test App for ${user?.username}`,
        description: "Demonstration OAuth client",
        redirectUris: ["http://localhost:3000/callback"],
        allowedScopes: ["read", "profile"]
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
  });

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Multi-Tenant Isolation Demo</h1>
          <p className="text-muted-foreground">
            Demonstrating tenant-scoped user registration and OAuth client management
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/">← Back to Home</Link>
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tenants">Organizations</TabsTrigger>
          <TabsTrigger value="isolation">Data Isolation</TabsTrigger>
          <TabsTrigger value="demo">Live Demo</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Current User Context
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium">Username:</span> {user.username}
                  </div>
                  <div>
                    <span className="font-medium">Tenant ID:</span> 
                    <code className="ml-2 px-2 py-1 bg-muted rounded text-sm">
                      {user.tenantId || "system"}
                    </code>
                  </div>
                  <div>
                    <span className="font-medium">Role:</span>
                    <div className="flex gap-2 mt-1">
                      {user.isSuperAdmin && <Badge variant="destructive">Super Admin</Badge>}
                      {user.isAdmin && <Badge variant="secondary">Admin</Badge>}
                      <Badge variant="outline">User</Badge>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">OAuth Clients:</span> {currentUserClients.length}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-green-600" />
                  Tenant Isolation Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">User data scoped to tenant</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">OAuth clients isolated per tenant</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Authentication tokens tenant-specific</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Cross-tenant access prevented</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Admin permissions tenant-scoped</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tenants">
          <div className="space-y-4">
            <Alert>
              <Building className="h-4 w-4" />
              <AlertDescription>
                Available organizations for user registration. Each organization maintains complete data isolation.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              {tenants.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No Organizations Available</h3>
                      <p className="text-muted-foreground mb-4">
                        Contact a super admin to create organizations for tenant-scoped registration.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                tenants.map((tenant: any) => (
                  <Card key={tenant._id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            {tenant.displayName || tenant.name}
                          </CardTitle>
                          <CardDescription>
                            {tenant.domain}.yourdomain.com
                          </CardDescription>
                        </div>
                        <Badge variant="outline">
                          {tenant._id === user.tenantId ? "Your Organization" : "Available"}
                        </Badge>
                      </div>
                    </CardHeader>
                    {tenant.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{tenant.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="isolation">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tenant Isolation Architecture</CardTitle>
                <CardDescription>
                  How data isolation works across tenants in the OAuth2 server
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                    <h3 className="font-medium mb-2">User Registration</h3>
                    <p className="text-sm text-muted-foreground">
                      Users register within specific tenants. Cross-tenant access is prevented.
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <KeyRound className="h-12 w-12 mx-auto mb-4 text-green-600" />
                    <h3 className="font-medium mb-2">OAuth Clients</h3>
                    <p className="text-sm text-muted-foreground">
                      OAuth applications are scoped to their creator's tenant automatically.
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                    <h3 className="font-medium mb-2">Token Isolation</h3>
                    <p className="text-sm text-muted-foreground">
                      Access tokens and authorization codes are tenant-specific.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tenant Resolution Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">1. Subdomain Resolution</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      acme.yourdomain.com → Automatically resolves to Acme Corporation tenant
                    </p>
                  </div>
                  
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <h4 className="font-medium text-green-900 dark:text-green-100">2. Header-Based Resolution</h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      X-Tenant-Domain: acme → API requests with tenant context
                    </p>
                  </div>
                  
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <h4 className="font-medium text-purple-900 dark:text-purple-100">3. Path-Based Resolution</h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      /tenant/acme/oauth/authorize → OAuth flows with tenant isolation
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="demo">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Tenant Isolation Demo</CardTitle>
                <CardDescription>
                  Test the tenant-scoped OAuth client creation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <Globe className="h-4 w-4" />
                    <AlertDescription>
                      Creating an OAuth client will automatically scope it to your tenant: {user.tenantId || "system"}
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">Your OAuth Clients</h4>
                      <p className="text-sm text-muted-foreground">
                        {currentUserClients.length} client(s) in your tenant
                      </p>
                    </div>
                    <Button 
                      onClick={() => createTestClientMutation.mutate()}
                      disabled={createTestClientMutation.isPending}
                    >
                      {createTestClientMutation.isPending && <div className="mr-2 h-4 w-4 animate-spin" />}
                      Create Test Client
                    </Button>
                  </div>

                  {currentUserClients.length > 0 && (
                    <div className="space-y-2">
                      {currentUserClients.map((client: any) => (
                        <div key={client._id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-medium">{client.name}</h5>
                              <p className="text-sm text-muted-foreground">{client.description}</p>
                              <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                                Tenant: {client.tenantId}
                              </code>
                            </div>
                            <Badge variant="outline">
                              {client.allowedScopes?.join(", ") || "No scopes"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Access multi-tenant management as super admin</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Create organizations with custom settings</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Test OAuth flows with tenant isolation</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Configure subdomain-based tenant routing</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}