import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { User, Client } from "@shared/schema";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

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
                      <TableRow key={user._id}>
                        <TableCell>{user._id}</TableCell>
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
                      <TableRow key={client._id}>
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