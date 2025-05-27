import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { User, Client } from "@shared/schema";
import { useLocation, Link } from "wouter";
import { Loader2, Users, KeyRound, ShieldAlert } from "lucide-react";

export default function AdminPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: users = [], isLoading: isLoadingUsers } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: clients = [], isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ["/api/admin/clients"],
  });

  if (!user?.isAdmin) {
    setLocation("/");
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-xl">
              <Users className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" /> User Management
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <p className="text-sm text-muted-foreground">
              Manage user accounts, permissions, and credentials
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link to="/admin/users">Manage Users</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-xl">
              <KeyRound className="h-5 w-5 mr-2 text-emerald-600 dark:text-emerald-400" /> OAuth Clients
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <p className="text-sm text-muted-foreground">
              Monitor and manage OAuth client applications
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link to="/admin/clients">Manage Clients</Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              OAuth Scope Demo
            </CardTitle>
            <CardDescription>
              Interactive demonstration of scope-based attribute access control
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              See how different OAuth scopes control access to user profile attributes. 
              Test the scope mapping functionality and understand what data clients can access.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link to="/admin/scope-demo">View Demo</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users">
            <TabsList>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="clients">OAuth Clients</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              {isLoadingUsers ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Admin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user._id.toString()}>
                        <TableCell>{user._id.toString()}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.isAdmin ? "Yes" : "No"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="clients">
              {isLoadingClients ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Client ID</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Redirect URIs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client._id.toString()}>
                        <TableCell>{client.name}</TableCell>
                        <TableCell className="break-all">{client.clientId}</TableCell>
                        <TableCell>{client.userId}</TableCell>
                        <TableCell>{client.redirectUris.join(", ")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}