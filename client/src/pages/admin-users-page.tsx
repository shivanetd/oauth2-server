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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");

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

  // Handler for updating a user
  const handleUpdateUser = () => {
    if (!selectedUser) return;
    
    const updateData: Partial<SanitizedUser> & { password?: string } = {
      username: selectedUser.username,
      isAdmin: selectedUser.isAdmin
    };
    
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
                <TableHead>Admin</TableHead>
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
                    {userItem.isAdmin ? (
                      <div className="flex items-center">
                        <ShieldAlert className="h-4 w-4 mr-1 text-amber-500" />
                        <span>Yes</span>
                      </div>
                    ) : "No"}
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

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Make changes to user details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={selectedUser?.username || ""}
                onChange={(e) => 
                  setSelectedUser(prev => prev ? {...prev, username: e.target.value} : null)
                }
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