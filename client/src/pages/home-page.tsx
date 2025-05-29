import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client, InsertClient, WebAuthnCredential } from "@shared/schema";
import { Loader2, Fingerprint, KeyRound, ShieldAlert, User, Settings, Lock, Mail, Calendar, Globe } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const AVAILABLE_SCOPES = ['read', 'write', 'admin']; // Add this line to define available scopes

export default function HomePage() {
  const { user, logoutMutation, registerPasskeyMutation } = useAuth();
  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: passkeys = [] } = useQuery<WebAuthnCredential[]>({ 
    queryKey: ["/api/webauthn/credentials"],
    enabled: !!user // Only fetch if user is logged in
  });

  if (!user) return null;

  return (
    <div className="container mx-auto py-4 px-4 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Welcome, {user.username}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage your OAuth2 applications and security settings</p>
        </div>
        <div className="flex gap-2 self-start">
          {user.isAdmin && (
            <Button asChild variant="outline" size="sm" className="sm:size-default">
              <Link to="/admin">Admin Panel</Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => logoutMutation.mutate()} size="sm" className="sm:size-default">
            Logout
          </Button>
        </div>
      </div>

      {/* Admin Quick Access */}
      {user.isAdmin && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <ShieldAlert className="h-5 w-5" />
              Administrator Access
            </CardTitle>
            <CardDescription>
              You have admin privileges. Access advanced management features.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/admin">Dashboard</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/users">Manage Users</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/clients">Manage Clients</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/trends">User Trends</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8">
        {/* Profile Management Section - Only for non-admin users */}
        {!user.isAdmin && (
          <section>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-semibold">Profile Management</h2>
                <p className="text-muted-foreground text-sm sm:text-base">Manage your account settings and personal information</p>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <ProfileSettingsCard user={user} />
              <SecuritySettingsCard user={user} />
            </div>
          </section>
        )}

        {/* Passkey Section */}
        <section>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-semibold">Passkeys</h2>
              <p className="text-muted-foreground text-sm sm:text-base">Manage your secure, phishing-resistant passkeys</p>
            </div>
            <Button 
              onClick={() => registerPasskeyMutation.mutate()} 
              disabled={registerPasskeyMutation.isPending}
              size="sm" 
              className="sm:size-default self-start"
            >
              {registerPasskeyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Fingerprint className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add Passkey</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>

          {passkeys && passkeys.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {passkeys.map((passkey) => (
                <Card key={passkey._id.toString()}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Fingerprint className="mr-2 h-5 w-5" />
                      Passkey
                    </CardTitle>
                    <CardDescription>Created {new Date(passkey.createdAt).toLocaleDateString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      <p className="font-medium">Device Type</p>
                      <p className="text-muted-foreground">{passkey.credentialDeviceType}</p>
                    </div>
                    <div className="text-sm mt-2">
                      <p className="font-medium">Backed Up</p>
                      <p className="text-muted-foreground">{passkey.credentialBackedUp ? 'Yes' : 'No'}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Passkeys Registered</CardTitle>
                <CardDescription>
                  Passkeys provide a more secure way to sign in without passwords.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Adding a passkey lets you sign in securely using biometrics (like fingerprint or face) or a security key.
                  Passkeys are phishing-resistant and more secure than passwords.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Applications Section */}
        <section>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-semibold">Your Applications</h2>
              <p className="text-muted-foreground text-sm sm:text-base">Manage OAuth2 clients for your applications</p>
            </div>
            <div className="self-start">
              <RegisterClientDialog />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <ClientCard key={client._id.toString()} client={client} />
            ))}
            {clients.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>No Applications Registered</CardTitle>
                  <CardDescription>
                    Register an OAuth2 client to integrate with this authorization server.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    OAuth2 clients allow third-party applications to request access to user resources
                    without exposing the user's credentials.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ClientCard({ client }: { client: Client }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{client.name}</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Created on {new Date(client.createdAt).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pb-3">
        <div>
          <div className="text-xs sm:text-sm font-medium mb-1">Client ID</div>
          <div className="text-xs sm:text-sm text-muted-foreground break-all font-mono bg-muted p-2 rounded">
            {client.clientId}
          </div>
        </div>
        <div>
          <div className="text-xs sm:text-sm font-medium mb-1">Client Secret</div>
          <div className="text-xs sm:text-sm text-muted-foreground break-all font-mono bg-muted p-2 rounded">
            {client.clientSecret}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t">
        <div className="text-xs sm:text-sm text-muted-foreground">
          <div className="font-medium mb-1">Redirect URIs:</div>
          <div className="break-words">{client.redirectUris.join(", ")}</div>
        </div>
      </CardFooter>
    </Card>
  );
}

function RegisterClientDialog() {
  const form = useForm<InsertClient>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      name: "",
      redirectUris: [],
      allowedScopes: ['read'],
      userId: "", // This will be set by the server
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: Omit<InsertClient, "userId">) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      form.reset();
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Register New Application</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register OAuth2 Client</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit((data) => {
              // Omit userId as it will be set by the server
              const { userId, ...submitData } = data;
              createClientMutation.mutate(submitData);
            })} 
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Application Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="redirectUris"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Redirect URIs (comma separated)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      value={field.value?.join(", ") || ""} 
                      onChange={(e) => field.onChange(e.target.value.split(",").map(uri => uri.trim()))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allowedScopes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allowed Scopes</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 flex-wrap">
                      {AVAILABLE_SCOPES.map((scope) => (
                        <Button
                          key={scope}
                          type="button"
                          variant={field.value?.includes(scope) ? "default" : "outline"}
                          onClick={() => {
                            const newScopes = field.value?.includes(scope)
                              ? field.value.filter(s => s !== scope)
                              : [...(field.value || []), scope];
                            field.onChange(newScopes);
                          }}
                          className="text-sm"
                        >
                          {scope}
                        </Button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={createClientMutation.isPending}>
              {createClientMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register Application
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ProfileSettingsCard({ user }: { user: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phone: user.phone || '',
    preferredLanguage: user.preferredLanguage || 'en',
    timezone: user.timezone || 'UTC',
    theme: user.theme || 'system'
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", "/api/user/profile", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      console.error("Profile update failed:", error);
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate(profileData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Personal Information
        </CardTitle>
        <CardDescription>
          Update your personal details and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            {isEditing ? (
              <Input
                id="firstName"
                value={profileData.firstName}
                onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                placeholder="Enter first name"
              />
            ) : (
              <div className="p-2 bg-muted rounded text-sm">
                {profileData.firstName || 'Not set'}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            {isEditing ? (
              <Input
                id="lastName"
                value={profileData.lastName}
                onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                placeholder="Enter last name"
              />
            ) : (
              <div className="p-2 bg-muted rounded text-sm">
                {profileData.lastName || 'Not set'}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          {isEditing ? (
            <Input
              id="email"
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              placeholder="Enter email address"
            />
          ) : (
            <div className="p-2 bg-muted rounded text-sm flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {profileData.email || 'Not set'}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          {isEditing ? (
            <Input
              id="phone"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              placeholder="Enter phone number"
            />
          ) : (
            <div className="p-2 bg-muted rounded text-sm">
              {profileData.phone || 'Not set'}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Language</Label>
            {isEditing ? (
              <Select value={profileData.preferredLanguage} onValueChange={(value) => setProfileData({ ...profileData, preferredLanguage: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="p-2 bg-muted rounded text-sm flex items-center gap-2">
                <Globe className="h-4 w-4" />
                {profileData.preferredLanguage === 'en' ? 'English' : 
                 profileData.preferredLanguage === 'es' ? 'Spanish' :
                 profileData.preferredLanguage === 'fr' ? 'French' :
                 profileData.preferredLanguage === 'de' ? 'German' : profileData.preferredLanguage}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Theme</Label>
            {isEditing ? (
              <Select value={profileData.theme} onValueChange={(value) => setProfileData({ ...profileData, theme: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="p-2 bg-muted rounded text-sm">
                {profileData.theme.charAt(0).toUpperCase() + profileData.theme.slice(1)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {isEditing ? (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={updateProfileMutation.isPending} size="sm">
              {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
            <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
              Cancel
            </Button>
          </div>
        ) : (
          <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function SecuritySettingsCard({ user }: { user: any }) {
  const [securitySettings, setSecuritySettings] = useState({
    mfaEnabled: user.mfaEnabled || false,
    loginNotifications: user.loginNotifications || true,
    securityAlerts: user.securityAlerts || true
  });

  const updateSecurityMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", "/api/user/security", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      console.error("Security update failed:", error);
    },
  });

  const handleSecurityUpdate = (key: string, value: boolean) => {
    const updatedSettings = { ...securitySettings, [key]: value };
    setSecuritySettings(updatedSettings);
    updateSecurityMutation.mutate(updatedSettings);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Security Settings
        </CardTitle>
        <CardDescription>
          Manage your account security and notification preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Two-Factor Authentication</Label>
            <div className="text-sm text-muted-foreground">
              Add an extra layer of security to your account
            </div>
          </div>
          <Switch
            checked={securitySettings.mfaEnabled}
            onCheckedChange={(checked) => handleSecurityUpdate('mfaEnabled', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Login Notifications</Label>
            <div className="text-sm text-muted-foreground">
              Get notified when someone signs into your account
            </div>
          </div>
          <Switch
            checked={securitySettings.loginNotifications}
            onCheckedChange={(checked) => handleSecurityUpdate('loginNotifications', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Security Alerts</Label>
            <div className="text-sm text-muted-foreground">
              Receive alerts about suspicious account activity
            </div>
          </div>
          <Switch
            checked={securitySettings.securityAlerts}
            onCheckedChange={(checked) => handleSecurityUpdate('securityAlerts', checked)}
          />
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Account created: {new Date(user.createdAt).toLocaleDateString()}
          </div>
          {user.lastLogin && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Settings className="h-4 w-4" />
              Last login: {new Date(user.lastLogin).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}