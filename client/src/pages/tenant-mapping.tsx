import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Building, 
  Users, 
  ArrowRight, 
  UserPlus, 
  Database, 
  Link as LinkIcon,
  Shield,
  Globe,
  Settings,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

const userTenantMappingSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Valid email required"),
  tenantId: z.string().min(1, "Tenant selection is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

type UserTenantMappingForm = z.infer<typeof userTenantMappingSchema>;

export default function TenantMapping() {
  const { user, registerMutation } = useAuth();
  const [, setLocation] = useLocation();

  const { data: tenants = [] } = useQuery<any[]>({
    queryKey: ["/api/public/tenants"],
  });

  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user?.isAdmin,
  });

  const form = useForm<UserTenantMappingForm>({
    resolver: zodResolver(userTenantMappingSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      tenantId: "",
      firstName: "",
      lastName: "",
    },
  });

  if (!user) {
    setLocation("/auth");
    return null;
  }

  const onSubmit = (data: UserTenantMappingForm) => {
    // Transform form data to match InsertUser schema with all required defaults
    const userData = {
      username: data.username,
      password: data.password,
      email: data.email,
      tenantId: data.tenantId,
      firstName: data.firstName,
      lastName: data.lastName,
      // Add required fields with defaults
      isAdmin: false,
      isSuperAdmin: false,
      isActive: true,
      createdAt: new Date(),
      preferredLanguage: "en",
      theme: "system" as const,
      timezone: "UTC",
      mfaEnabled: false,
    };
    registerMutation.mutate(userData as any);
  };

  // Group users by tenant
  const usersByTenant = allUsers.reduce((acc: any, user: any) => {
    const tenantId = user.tenantId || "system";
    if (!acc[tenantId]) {
      acc[tenantId] = [];
    }
    acc[tenantId].push(user);
    return acc;
  }, {});

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">User-to-Tenant Mapping</h1>
          <p className="text-muted-foreground">
            Understanding how users are mapped to tenants in the OAuth2 system
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/">← Back to Home</Link>
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Mapping Overview</TabsTrigger>
          <TabsTrigger value="current">Current Mappings</TabsTrigger>
          <TabsTrigger value="create">Create User</TabsTrigger>
          <TabsTrigger value="strategies">Resolution Strategies</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  How User-Tenant Mapping Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">1</div>
                    <div>
                      <h4 className="font-medium">Registration with Tenant Context</h4>
                      <p className="text-sm text-muted-foreground">
                        Users register and are automatically assigned to a specific tenant organization
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-medium">2</div>
                    <div>
                      <h4 className="font-medium">Persistent Tenant Association</h4>
                      <p className="text-sm text-muted-foreground">
                        Each user record contains a tenantId field that permanently links them to their organization
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-medium">3</div>
                    <div>
                      <h4 className="font-medium">Isolation Enforcement</h4>
                      <p className="text-sm text-muted-foreground">
                        All user operations are scoped to their tenant, preventing cross-tenant access
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Your Current Mapping
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Username</span>
                      <span className="text-sm">{user.username}</span>
                    </div>
                    
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Tenant ID</span>
                      <code className="text-sm bg-background px-2 py-1 rounded">
                        {user.tenantId || "system"}
                      </code>
                    </div>
                    
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Organization</span>
                      <span className="text-sm">
                        {user.tenantId === "system" ? "System Admin" : 
                         tenants.find(t => t._id === user.tenantId)?.displayName || "Unknown"}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Access Level</span>
                      <div className="flex gap-1">
                        {user.isSuperAdmin && <Badge variant="destructive" className="text-xs">Super Admin</Badge>}
                        {user.isAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                        <Badge variant="outline" className="text-xs">User</Badge>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your user account is properly mapped to tenant: {user.tenantId || "system"}
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="current">
          <div className="space-y-6">
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                Current user-to-tenant mappings in the system. Each user belongs to exactly one tenant.
              </AlertDescription>
            </Alert>

            {Object.keys(usersByTenant).length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No User Mappings</h3>
                    <p className="text-muted-foreground">
                      No users found in the system or insufficient permissions to view mappings.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {Object.entries(usersByTenant).map(([tenantId, users]) => {
                  const tenant = tenants.find(t => t._id === tenantId);
                  const tenantName = tenantId === "system" ? "System" : (tenant?.displayName || tenant?.name || "Unknown");
                  
                  return (
                    <Card key={tenantId}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            {tenantName}
                          </CardTitle>
                          <Badge variant="outline">
                            {(users as any[]).length} user{(users as any[]).length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <CardDescription>
                          Tenant ID: <code className="bg-muted px-1 py-0.5 rounded text-xs">{tenantId}</code>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {(users as any[]).map((user: any) => (
                            <div key={user._id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">{user.username}</span>
                                <div className="flex gap-1">
                                  {user.isSuperAdmin && <Badge variant="destructive" className="text-xs">SA</Badge>}
                                  {user.isAdmin && <Badge variant="secondary" className="text-xs">A</Badge>}
                                </div>
                              </div>
                              
                              {user.email && (
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              )}
                              
                              <div className="mt-2 text-xs text-muted-foreground">
                                Created: {new Date(user.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Create User with Tenant Mapping
              </CardTitle>
              <CardDescription>
                Demonstrate creating a new user and mapping them to a specific tenant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="John" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Doe" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} placeholder="john.doe@company.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="johndoe" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} placeholder="••••••••" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tenantId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization (Tenant Mapping)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select target organization" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tenants.map((tenant) => (
                              <SelectItem key={tenant._id} value={tenant._id}>
                                <div className="flex items-center gap-2">
                                  <Building className="h-4 w-4" />
                                  <span>{tenant.displayName || tenant.name}</span>
                                  <span className="text-muted-foreground text-sm">
                                    ({tenant.domain})
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      Mapping Result
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      The new user will be assigned tenantId: <code className="bg-background px-1 py-0.5 rounded">
                        {form.watch("tenantId") || "none selected"}
                      </code>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This creates a permanent association between the user and their organization.
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                    {registerMutation.isPending && <div className="mr-2 h-4 w-4 animate-spin" />}
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create User with Tenant Mapping
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies">
          <div className="space-y-6">
            <Alert>
              <Globe className="h-4 w-4" />
              <AlertDescription>
                Multiple strategies for resolving tenant context during user operations
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Automatic Tenant Resolution</CardTitle>
                  <CardDescription>
                    How the system determines which tenant a request belongs to
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">1. Subdomain Strategy</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        acme.yourdomain.com → User operations for Acme tenant
                      </p>
                      <code className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded mt-1 block">
                        Host: acme.oauth-server.com
                      </code>
                    </div>
                    
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">2. Header-Based Strategy</h4>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        API requests include tenant identification header
                      </p>
                      <code className="text-xs bg-green-100 dark:bg-green-900 px-2 py-1 rounded mt-1 block">
                        X-Tenant-Domain: acme
                      </code>
                    </div>
                    
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                      <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-1">3. Path-Based Strategy</h4>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        URL path includes tenant context for isolation
                      </p>
                      <code className="text-xs bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded mt-1 block">
                        /tenant/acme/api/register
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Isolation Benefits</CardTitle>
                  <CardDescription>
                    Security and operational advantages of tenant mapping
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Complete Data Isolation</h4>
                        <p className="text-sm text-muted-foreground">
                          Users can only access data within their assigned tenant
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Automatic Scoping</h4>
                        <p className="text-sm text-muted-foreground">
                          All operations are automatically scoped to the correct tenant
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">OAuth Client Isolation</h4>
                        <p className="text-sm text-muted-foreground">
                          Applications are tenant-specific and cannot cross boundaries
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Compliance Ready</h4>
                        <p className="text-sm text-muted-foreground">
                          Meets enterprise data residency and isolation requirements
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Implementation Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <Database className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <h4 className="font-medium mb-1">Database Level</h4>
                    <p className="text-sm text-muted-foreground">
                      All queries include tenantId filtering
                    </p>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <h4 className="font-medium mb-1">API Level</h4>
                    <p className="text-sm text-muted-foreground">
                      Middleware enforces tenant context
                    </p>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <Settings className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <h4 className="font-medium mb-1">Application Level</h4>
                    <p className="text-sm text-muted-foreground">
                      OAuth flows respect tenant boundaries
                    </p>
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