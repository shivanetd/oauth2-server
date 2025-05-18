import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

// UI Components
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Pencil, Trash2, ShieldAlert } from "lucide-react";

// Type for sanitized user (no password)
type SanitizedUser = Omit<User, 'password'> & {
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<SanitizedUser | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    isAdmin: false,
    isActive: true,
    mfaEnabled: false,
    role: "",
    preferredLanguage: "en",
    theme: "system",
    timezone: "UTC",
    organizationId: ""
  });

  // Redirect if not admin
  if (user && !user.isAdmin) {
    setLocation("/");
    return null;
  }

  // Query to get all users
  const {
    data: users,
    isLoading,
    error
  } = useQuery<SanitizedUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      return await res.json();
    }
  });

  // Mutation to create a new user
  const createUserMutation = useMutation({
    mutationFn: async (userData: Partial<SanitizedUser> & { password: string }) => {
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User Created",
        description: "The new user has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setCreateDialogOpen(false);
      setNewUser({
        username: "",
        password: "",
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        isAdmin: false,
        isActive: true,
        mfaEnabled: false,
        role: "",
        preferredLanguage: "en",
        theme: "system",
        timezone: "UTC",
        organizationId: ""
      });
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create user.",
        variant: "destructive",
      });
    }
  });

  // Mutation to update a user
  const updateUserMutation = useMutation({
    mutationFn: async (userData: Partial<SanitizedUser> & { password?: string }) => {
      const userId = selectedUser?._id.toString();
      if (!userId) throw new Error("No user selected");
      
      const res = await apiRequest("PUT", `/api/admin/users/${userId}`, userData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User Updated",
        description: "The user has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditDialogOpen(false);
      setNewPassword("");
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user.",
        variant: "destructive",
      });
    }
  });

  // Mutation to delete a user
  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      const userId = selectedUser?._id.toString();
      if (!userId) throw new Error("No user selected");
      
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User Deleted",
        description: "The user has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete user.",
        variant: "destructive",
      });
    }
  });

  // Handler for opening the edit dialog
  const handleEditUser = (user: SanitizedUser) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  // Handler for opening the delete dialog
  const handleDeleteUser = (user: SanitizedUser) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  // Handler for creating a new user
  const handleCreateUser = () => {
    if (!newUser.username || !newUser.password) {
      toast({
        title: "Missing Information",
        description: "Username and password are required.",
        variant: "destructive",
      });
      return;
    }
    
    if (newUser.email && !newUser.email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    
    // Create proper user object with typed theme value
    const userToCreate = {
      ...newUser,
      theme: newUser.theme as "light" | "dark" | "system"
    };
    
    createUserMutation.mutate(userToCreate);
  };

  // Handler for updating a user
  const handleUpdateUser = () => {
    if (!selectedUser) return;
    
    // Prepare the update data with all the user attributes
    const updateData: Partial<SanitizedUser> & { password?: string } = {
      username: selectedUser.username,
      firstName: selectedUser.firstName,
      lastName: selectedUser.lastName,
      email: selectedUser.email,
      phoneNumber: selectedUser.phoneNumber,
      isAdmin: selectedUser.isAdmin,
      isActive: selectedUser.isActive,
      mfaEnabled: selectedUser.mfaEnabled,
      role: selectedUser.role,
      preferredLanguage: selectedUser.preferredLanguage,
      theme: selectedUser.theme as "light" | "dark" | "system",
      timezone: selectedUser.timezone,
      organizationId: selectedUser.organizationId
    };
    
    // Validate email if present
    if (updateData.email && !updateData.email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    
    // Only include password if it was entered
    if (newPassword.trim()) {
      updateData.password = newPassword;
    }
    
    updateUserMutation.mutate(updateData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Failed to load users. {error instanceof Error ? error.message : 'Unknown error'}</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] })}>
            Try Again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <div className="flex gap-2">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" /> Create User
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin">Back to Admin</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage your application users</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>A list of all users in your application.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((userItem) => (
                <TableRow key={userItem._id.toString()}>
                  <TableCell className="font-medium">
                    {userItem.username}
                    {user?._id.toString() === userItem._id.toString() && (
                      <Badge variant="outline" className="ml-2">You</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {userItem.firstName && userItem.lastName 
                      ? `${userItem.firstName} ${userItem.lastName}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {userItem.email || "—"}
                  </TableCell>
                  <TableCell>
                    {userItem.isActive 
                      ? <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>
                      : <Badge variant="outline" className="bg-red-50 text-red-700">Inactive</Badge>}
                    {userItem.mfaEnabled && (
                      <Badge variant="outline" className="ml-1 bg-blue-50 text-blue-700">MFA</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {userItem.isAdmin ? (
                      <div className="flex items-center">
                        <ShieldAlert className="h-4 w-4 mr-1 text-amber-500" />
                        <span>Admin</span>
                      </div>
                    ) : userItem.role || "User"}
                  </TableCell>
                  <TableCell>
                    {userItem.createdAt && new Date(userItem.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditUser(userItem)}
                      >
                        <Pencil className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteUser(userItem)}
                        disabled={user?._id.toString() === userItem._id.toString()}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Account Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-username">Username*</Label>
                  <Input
                    id="new-username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    placeholder="Enter username"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-password">Password*</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    placeholder="Enter password"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-firstName">First Name</Label>
                  <Input
                    id="new-firstName"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                    placeholder="First name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-lastName">Last Name</Label>
                  <Input
                    id="new-lastName"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                    placeholder="Last name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-email">Email</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    placeholder="example@domain.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-phone">Phone Number</Label>
                  <Input
                    id="new-phone"
                    value={newUser.phoneNumber}
                    onChange={(e) => setNewUser({...newUser, phoneNumber: e.target.value})}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Roles and Permissions</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-role">Role</Label>
                  <Input
                    id="new-role"
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    placeholder="User role (e.g., Manager, Developer)"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-organization">Organization ID</Label>
                  <Input
                    id="new-organization"
                    value={newUser.organizationId}
                    onChange={(e) => setNewUser({...newUser, organizationId: e.target.value})}
                    placeholder="Organization identifier"
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="new-isAdmin"
                    checked={newUser.isAdmin}
                    onCheckedChange={(checked) => setNewUser({...newUser, isAdmin: !!checked})}
                  />
                  <Label htmlFor="new-isAdmin">Administrator</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="new-isActive"
                    checked={newUser.isActive}
                    onCheckedChange={(checked) => setNewUser({...newUser, isActive: !!checked})}
                  />
                  <Label htmlFor="new-isActive">Active Account</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="new-mfa"
                    checked={newUser.mfaEnabled}
                    onCheckedChange={(checked) => setNewUser({...newUser, mfaEnabled: !!checked})}
                  />
                  <Label htmlFor="new-mfa">Enable MFA (Multi-Factor Authentication)</Label>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Preferences</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-language">Preferred Language</Label>
                  <select
                    id="new-language"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={newUser.preferredLanguage}
                    onChange={(e) => setNewUser({...newUser, preferredLanguage: e.target.value})}
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-theme">Theme</Label>
                  <select
                    id="new-theme"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={newUser.theme}
                    onChange={(e) => setNewUser({...newUser, theme: e.target.value as "light" | "dark" | "system"})}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-timezone">Timezone</Label>
                  <select
                    id="new-timezone"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={newUser.timezone}
                    onChange={(e) => setNewUser({...newUser, timezone: e.target.value})}
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Central European Time (CET)</option>
                    <option value="Asia/Tokyo">Japan (JST)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Make changes to user details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Account Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username*</Label>
                  <Input
                    id="username"
                    value={selectedUser?.username || ""}
                    onChange={(e) => 
                      setSelectedUser(prev => prev ? {...prev, username: e.target.value} : null)
                    }
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">New Password (leave blank to keep current)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={selectedUser?.firstName || ""}
                    onChange={(e) => 
                      setSelectedUser(prev => prev ? {...prev, firstName: e.target.value} : null)
                    }
                    placeholder="First name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={selectedUser?.lastName || ""}
                    onChange={(e) => 
                      setSelectedUser(prev => prev ? {...prev, lastName: e.target.value} : null)
                    }
                    placeholder="Last name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={selectedUser?.email || ""}
                    onChange={(e) => 
                      setSelectedUser(prev => prev ? {...prev, email: e.target.value} : null)
                    }
                    placeholder="example@domain.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={selectedUser?.phoneNumber || ""}
                    onChange={(e) => 
                      setSelectedUser(prev => prev ? {...prev, phoneNumber: e.target.value} : null)
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Roles and Permissions</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={selectedUser?.role || ""}
                    onChange={(e) => 
                      setSelectedUser(prev => prev ? {...prev, role: e.target.value} : null)
                    }
                    placeholder="User role (e.g., Manager, Developer)"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization ID</Label>
                  <Input
                    id="organization"
                    value={selectedUser?.organizationId || ""}
                    onChange={(e) => 
                      setSelectedUser(prev => prev ? {...prev, organizationId: e.target.value} : null)
                    }
                    placeholder="Organization identifier"
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isAdmin"
                    checked={selectedUser?.isAdmin || false}
                    onCheckedChange={(checked) => 
                      setSelectedUser(prev => prev ? {...prev, isAdmin: !!checked} : null)
                    }
                  />
                  <Label htmlFor="isAdmin">Administrator</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={selectedUser?.isActive !== false}
                    onCheckedChange={(checked) => 
                      setSelectedUser(prev => prev ? {...prev, isActive: !!checked} : null)
                    }
                  />
                  <Label htmlFor="isActive">Active Account</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mfa"
                    checked={selectedUser?.mfaEnabled || false}
                    onCheckedChange={(checked) => 
                      setSelectedUser(prev => prev ? {...prev, mfaEnabled: !!checked} : null)
                    }
                  />
                  <Label htmlFor="mfa">Enable MFA (Multi-Factor Authentication)</Label>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Preferences</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Preferred Language</Label>
                  <select
                    id="language"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={selectedUser?.preferredLanguage || "en"}
                    onChange={(e) => 
                      setSelectedUser(prev => prev ? {...prev, preferredLanguage: e.target.value} : null)
                    }
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <select
                    id="theme"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={selectedUser?.theme || "system"}
                    onChange={(e) => 
                      setSelectedUser(prev => prev ? {...prev, theme: e.target.value as "light" | "dark" | "system"} : null)
                    }
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={selectedUser?.timezone || "UTC"}
                    onChange={(e) => 
                      setSelectedUser(prev => prev ? {...prev, timezone: e.target.value} : null)
                    }
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Central European Time (CET)</option>
                    <option value="Asia/Tokyo">Japan (JST)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleUpdateUser}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedUser?.username}'s account and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteUserMutation.mutate()}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}