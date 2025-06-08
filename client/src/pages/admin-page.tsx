import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import { Loader2, Users, KeyRound, ShieldAlert, Eye, TrendingUp, Building } from "lucide-react";

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
    <div className="container mx-auto py-4 px-4 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2 self-start">
          {user?.isSuperAdmin && (
            <Button asChild size="sm" className="sm:size-default">
              <Link to="/multi-tenant">
                <Building className="h-4 w-4 mr-2" />
                Multi-Tenant Management
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="sm:size-default">
            <Link to="/">← Back to Home</Link>
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              {users.filter(u => u.isActive).length} active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OAuth Clients</CardTitle>
            <KeyRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
            <p className="text-xs text-muted-foreground">
              Total registered applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.isAdmin).length}</div>
            <p className="text-xs text-muted-foreground">
              Users with admin privileges
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => {
              const dayAgo = new Date();
              dayAgo.setDate(dayAgo.getDate() - 1);
              return new Date(u.lastLoginAt || u.createdAt) > dayAgo;
            }).length}</div>
            <p className="text-xs text-muted-foreground">
              Users active today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Management Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
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
        
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/40 dark:to-pink-950/40 hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-xl">
              <TrendingUp className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" /> User Trends Explorer
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <p className="text-sm text-muted-foreground">
              Analyze user activity patterns, engagement trends, and growth metrics
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link to="/admin/trends">Explore Trends</Link>
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="clients">OAuth Clients</TabsTrigger>
              <TabsTrigger value="activity">Login Activity</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
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

            <TabsContent value="activity">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Today's Logins</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{users.filter(u => {
                        const today = new Date();
                        const userDate = new Date(u.lastLogin || u.createdAt);
                        return userDate.toDateString() === today.toDateString();
                      }).length}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">This Week</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{users.filter(u => {
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return new Date(u.lastLogin || u.createdAt) > weekAgo;
                      }).length}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">This Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{users.filter(u => {
                        const monthAgo = new Date();
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        return new Date(u.lastLogin || u.createdAt) > monthAgo;
                      }).length}</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent User Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {users
                        .sort((a, b) => new Date(b.lastLogin || b.createdAt).getTime() - new Date(a.lastLogin || a.createdAt).getTime())
                        .slice(0, 10)
                        .map((user) => (
                          <div key={user._id.toString()} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <Users className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium">{user.username}</p>
                                <p className="text-sm text-muted-foreground">
                                  {user.isAdmin && "Admin • "}
                                  {user.isActive ? "Active" : "Inactive"}
                                </p>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.lastLogin ? 
                                `Last seen ${new Date(user.lastLogin).toLocaleDateString()}` :
                                `Joined ${new Date(user.createdAt).toLocaleDateString()}`
                              }
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>User Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Active Users</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 rounded-full" 
                                style={{width: `${(users.filter(u => u.isActive).length / users.length) * 100}%`}}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{users.filter(u => u.isActive).length}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Admin Users</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full" 
                                style={{width: `${(users.filter(u => u.isAdmin).length / users.length) * 100}%`}}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{users.filter(u => u.isAdmin).length}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Regular Users</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gray-500 rounded-full" 
                                style={{width: `${(users.filter(u => !u.isAdmin).length / users.length) * 100}%`}}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{users.filter(u => !u.isAdmin).length}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Application Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Total OAuth Clients</span>
                          <span className="text-lg font-bold">{clients.length}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Average Clients per User</span>
                          <span className="text-lg font-bold">
                            {users.length > 0 ? (clients.length / users.length).toFixed(1) : '0'}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Users with Applications</span>
                          <span className="text-lg font-bold">
                            {new Set(clients.map(c => c.userId)).size}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>User Registration Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Array.from({length: 7}, (_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() - i);
                        const dayUsers = users.filter(u => {
                          const userDate = new Date(u.createdAt);
                          return userDate.toDateString() === date.toDateString();
                        }).length;
                        
                        return (
                          <div key={i} className="flex items-center justify-between py-1">
                            <span className="text-sm">{date.toLocaleDateString()}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full" 
                                  style={{width: `${Math.min((dayUsers / Math.max(...Array.from({length: 7}, (_, j) => {
                                    const d = new Date();
                                    d.setDate(d.getDate() - j);
                                    return users.filter(u => new Date(u.createdAt).toDateString() === d.toDateString()).length;
                                  }))) * 100, 100)}%`}}
                                ></div>
                              </div>
                              <span className="text-sm font-medium w-8">{dayUsers}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}