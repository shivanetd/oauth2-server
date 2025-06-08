import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Building, 
  Users, 
  Settings, 
  Globe, 
  Shield, 
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Crown
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Tenant form schema
const tenantFormSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  domain: z.string().min(1, "Domain is required").regex(/^[a-zA-Z0-9-]+$/, "Domain must contain only letters, numbers, and hyphens"),
  displayName: z.string().optional(),
  description: z.string().optional(),
  adminEmail: z.string().email("Valid email required"),
  supportEmail: z.string().email("Valid email required").optional(),
  billingPlan: z.enum(["free", "starter", "professional", "enterprise"]).default("free"),
  settings: z.object({
    allowUserRegistration: z.boolean().default(true),
    requireEmailVerification: z.boolean().default(false),
    maxUsersAllowed: z.number().min(1).default(1000),
    enableMFA: z.boolean().default(true),
    enablePasskeys: z.boolean().default(true),
    primaryColor: z.string().default("#000000"),
  }).default({})
});

type TenantForm = z.infer<typeof tenantFormSchema>;

export default function MultiTenantDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["/api/super-admin/tenants"],
  });

  const { data: systemStats } = useQuery({
    queryKey: ["/api/super-admin/stats"],
  });

  if (!user?.isSuperAdmin) {
    setLocation("/");
    return null;
  }

  return (
    <div className="container mx-auto py-4 px-4 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            Multi-Tenant Management
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage organizations, tenants, and system-wide settings
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <CreateTenantDialog />
          <Button asChild variant="outline" size="sm" className="sm:size-default">
            <Link to="/admin">← Back to Admin</Link>
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
            <p className="text-xs text-muted-foreground">
              {tenants.filter((t: any) => t.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OAuth Clients</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats?.totalClients || 0}</div>
            <p className="text-xs text-muted-foreground">
              System-wide applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premium Tenants</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenants.filter((t: any) => t.isPremium).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Paid subscriptions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="tenants" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tenants">Organizations</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="billing">Billing & Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants">
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Multi-tenant architecture provides complete data isolation between organizations. 
                Each tenant has their own users, OAuth clients, and settings.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              {isLoading ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">Loading tenants...</div>
                  </CardContent>
                </Card>
              ) : tenants.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No Tenants Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Create your first organization to get started with multi-tenancy.
                      </p>
                      <CreateTenantDialog />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                tenants.map((tenant: any) => (
                  <TenantCard key={tenant._id} tenant={tenant} />
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="system">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Multi-Tenant Features</CardTitle>
                <CardDescription>Current system capabilities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Tenant Data Isolation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Subdomain Routing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Tenant-Scoped Authentication</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Per-Tenant OAuth Clients</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Custom Branding Support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Flexible Billing Plans</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tenant Resolution</CardTitle>
                <CardDescription>How tenants are identified</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">Subdomain Strategy</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      tenant.yourdomain.com → Automatic tenant resolution
                    </p>
                  </div>
                  
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <h4 className="font-medium text-green-900 dark:text-green-100">Header-Based</h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      X-Tenant-Domain: tenant → API tenant context
                    </p>
                  </div>
                  
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <h4 className="font-medium text-purple-900 dark:text-purple-100">Path-Based</h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      /tenant/domain/oauth → OAuth flow isolation
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="billing">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {["free", "starter", "professional", "enterprise"].map((plan) => (
              <Card key={plan} className={plan === "enterprise" ? "border-primary" : ""}>
                <CardHeader>
                  <CardTitle className="capitalize">{plan}</CardTitle>
                  <CardDescription>
                    {tenants.filter((t: any) => t.billingPlan === plan).length} tenants
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    {plan === "free" ? "$0" : 
                     plan === "starter" ? "$29" :
                     plan === "professional" ? "$99" : "$299"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {plan === "free" ? "Up to 100 users" :
                     plan === "starter" ? "Up to 1,000 users" :
                     plan === "professional" ? "Up to 10,000 users" : "Unlimited users"}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TenantCard({ tenant }: { tenant: any }) {
  return (
    <Card>
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
          <div className="flex items-center gap-2">
            {tenant.isPremium && (
              <Badge variant="secondary">
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            )}
            <Badge variant={tenant.isActive ? "default" : "secondary"}>
              {tenant.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium">Plan</div>
            <div className="text-muted-foreground capitalize">{tenant.billingPlan}</div>
          </div>
          <div>
            <div className="font-medium">Users</div>
            <div className="text-muted-foreground">{tenant.userCount || 0}</div>
          </div>
          <div>
            <div className="font-medium">Created</div>
            <div className="text-muted-foreground">
              {new Date(tenant.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div className="font-medium">Admin</div>
            <div className="text-muted-foreground">{tenant.adminEmail}</div>
          </div>
        </div>
        
        {tenant.description && (
          <p className="text-sm text-muted-foreground mt-3">{tenant.description}</p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            View Details
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

function CreateTenantDialog() {
  const form = useForm<TenantForm>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      name: "",
      domain: "",
      adminEmail: "",
      billingPlan: "free",
      settings: {
        allowUserRegistration: true,
        requireEmailVerification: false,
        maxUsersAllowed: 1000,
        enableMFA: true,
        enablePasskeys: true,
        primaryColor: "#000000"
      }
    },
  });

  const createTenantMutation = useMutation({
    mutationFn: async (data: TenantForm) => {
      const res = await apiRequest("POST", "/api/super-admin/tenants", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenants"] });
      form.reset();
    },
    onError: (error: Error) => {
      console.error("Tenant creation failed:", error);
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className="sm:size-default">
          <Plus className="h-4 w-4 mr-2" />
          Create Organization
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit((data) => createTenantMutation.mutate(data))} 
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Acme Corporation" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domain</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="acme" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="adminEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admin Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="admin@acme.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="billingPlan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Plan</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="free">Free (100 users)</SelectItem>
                      <SelectItem value="starter">Starter ($29/month)</SelectItem>
                      <SelectItem value="professional">Professional ($99/month)</SelectItem>
                      <SelectItem value="enterprise">Enterprise ($299/month)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <Label className="text-base font-medium">Organization Settings</Label>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="allowRegistration">Allow User Registration</Label>
                <Switch
                  id="allowRegistration"
                  checked={form.watch("settings.allowUserRegistration")}
                  onCheckedChange={(checked) => 
                    form.setValue("settings.allowUserRegistration", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="enableMFA">Enable Multi-Factor Authentication</Label>
                <Switch
                  id="enableMFA"
                  checked={form.watch("settings.enableMFA")}
                  onCheckedChange={(checked) => 
                    form.setValue("settings.enableMFA", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="enablePasskeys">Enable Passkeys</Label>
                <Switch
                  id="enablePasskeys"
                  checked={form.watch("settings.enablePasskeys")}
                  onCheckedChange={(checked) => 
                    form.setValue("settings.enablePasskeys", checked)
                  }
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={createTenantMutation.isPending}>
              {createTenantMutation.isPending && <div className="mr-2 h-4 w-4 animate-spin" />}
              Create Organization
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}