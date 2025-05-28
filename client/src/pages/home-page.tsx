import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client } from "@shared/schema";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });

  if (!user) return null;

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {user.username}</h1>
          <p className="text-muted-foreground">Manage your OAuth2 applications</p>
        </div>
        <Button variant="outline" onClick={() => logoutMutation.mutate()}>
          Logout
        </Button>
      </div>

      <div className="grid gap-6">
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Your Applications</h2>
            <RegisterClientDialog />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
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
  const form = useForm({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      name: "",
      redirectUris: [],
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: typeof form.getValues) => {
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
          <form onSubmit={form.handleSubmit((data) => createClientMutation.mutate(data))} className="space-y-4">
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
            <Button type="submit" className="w-full">Register Application</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
