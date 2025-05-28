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
import { Loader2, Fingerprint, KeyRound } from "lucide-react";

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
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {user.username}</h1>
          <p className="text-muted-foreground">Manage your OAuth2 applications and security settings</p>
        </div>
        <Button variant="outline" onClick={() => logoutMutation.mutate()}>
          Logout
        </Button>
      </div>

      <div className="grid gap-8">
        {/* Passkey Section */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-semibold">Passkeys</h2>
              <p className="text-muted-foreground">Manage your secure, phishing-resistant passkeys</p>
            </div>
            <Button 
              onClick={() => registerPasskeyMutation.mutate()} 
              disabled={registerPasskeyMutation.isPending}
            >
              {registerPasskeyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Fingerprint className="mr-2 h-4 w-4" />
              Add Passkey
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
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-semibold">Your Applications</h2>
              <p className="text-muted-foreground">Manage OAuth2 clients for your applications</p>
            </div>
            <RegisterClientDialog />
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
    <Card>
      <CardHeader>
        <CardTitle>{client.name}</CardTitle>
        <CardDescription>Created on {new Date(client.createdAt).toLocaleDateString()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <div className="text-sm font-medium">Client ID</div>
          <div className="text-sm text-muted-foreground break-all">{client.clientId}</div>
        </div>
        <div>
          <div className="text-sm font-medium">Client Secret</div>
          <div className="text-sm text-muted-foreground break-all">{client.clientSecret}</div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="text-sm text-muted-foreground">
          Redirect URIs: {client.redirectUris.join(", ")}
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