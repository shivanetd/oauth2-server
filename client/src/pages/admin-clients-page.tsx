import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Client } from "@shared/schema";
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
import { Loader2, PlusCircle, Pencil, Trash2, Info, Link2, Copy } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

// Extended Client type to handle string-based form inputs
type ClientWithFormFields = Omit<Client, 'redirectUris' | 'allowedScopes'> & {
  description?: string;
  redirectUris: string[] | string;
  allowedScopes: string[] | string;
};

// New client form data type
type NewClientFormData = {
  name: string;
  description: string;
  redirectUris: string;
  allowedScopes: string;
};

export default function AdminClientsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<ClientWithFormFields | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState<NewClientFormData>({
    name: "",
    description: "",
    redirectUris: "",
    allowedScopes: "read,write"
  });

  // Redirect if not admin
  if (user && !user.isAdmin) {
    setLocation("/");
    return null;
  }

  // Query to get all clients (admin only)
  const {
    data: clients,
    isLoading,
    error
  } = useQuery<Client[]>({
    queryKey: ["/api/admin/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/clients");
      return await res.json();
    }
  });

  // Mutation to create a new client
  const createClientMutation = useMutation({
    mutationFn: async (clientData: { 
      name: string, 
      description: string, 
      redirectUris: string[],
      allowedScopes: string[]
    }) => {
      const res = await apiRequest("POST", "/api/clients", clientData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "OAuth Client Created",
        description: "The new OAuth client has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      setCreateDialogOpen(false);
      setNewClient({
        name: "",
        description: "",
        redirectUris: "",
        allowedScopes: "read,write"
      });
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create OAuth client.",
        variant: "destructive",
      });
    }
  });

  // Mutation to update a client
  const updateClientMutation = useMutation({
    mutationFn: async (clientData: {
      name: string,
      description: string,
      redirectUris: string[],
      allowedScopes: string[]
    }) => {
      const clientId = selectedClient?._id.toString();
      if (!clientId) throw new Error("No client selected");
      
      const res = await apiRequest("PUT", `/api/clients/${clientId}`, clientData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Client Updated",
        description: "The OAuth client has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update OAuth client.",
        variant: "destructive",
      });
    }
  });

  // Mutation to delete a client
  const deleteClientMutation = useMutation({
    mutationFn: async () => {
      const clientId = selectedClient?._id.toString();
      if (!clientId) throw new Error("No client selected");
      
      const res = await apiRequest("DELETE", `/api/clients/${clientId}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Client Deleted",
        description: "The OAuth client has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete OAuth client.",
        variant: "destructive",
      });
    }
  });

  // Handler for opening the edit dialog
  const handleEditClient = (client: Client) => {
    // Convert arrays to comma-separated strings for the form
    const clientWithFormFields: ClientWithFormFields = {
      ...client,
      redirectUris: Array.isArray(client.redirectUris) 
        ? client.redirectUris.join(", ")
        : client.redirectUris,
      allowedScopes: Array.isArray(client.allowedScopes)
        ? client.allowedScopes.join(", ")
        : client.allowedScopes
    };
    
    setSelectedClient(clientWithFormFields);
    setEditDialogOpen(true);
  };

  // Handler for opening the details dialog
  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
    setDetailsDialogOpen(true);
  };

  // Handler for opening the delete dialog
  const handleDeleteClient = (client: Client) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
  };

  // Handler for creating a new client
  const handleCreateClient = () => {
    if (!newClient.name || !newClient.redirectUris) {
      toast({
        title: "Missing Information",
        description: "Name and at least one redirect URI are required.",
        variant: "destructive",
      });
      return;
    }
    
    createClientMutation.mutate({
      name: newClient.name,
      description: newClient.description,
      redirectUris: newClient.redirectUris.split(',').map((uri: string) => uri.trim()),
      allowedScopes: newClient.allowedScopes.split(',').map((scope: string) => scope.trim())
    });
  };

  // Handler for updating a client
  const handleUpdateClient = () => {
    if (!selectedClient) return;
    
    // Convert string input back to arrays
    const redirectUrisArray = typeof selectedClient.redirectUris === 'string' 
      ? selectedClient.redirectUris.split(',').map((uri: string) => uri.trim())
      : selectedClient.redirectUris;
    
    const allowedScopesArray = typeof selectedClient.allowedScopes === 'string'
      ? selectedClient.allowedScopes.split(',').map((scope: string) => scope.trim())
      : selectedClient.allowedScopes;
    
    updateClientMutation.mutate({
      name: selectedClient.name,
      description: selectedClient.description || "",
      redirectUris: redirectUrisArray,
      allowedScopes: allowedScopesArray
    });
  };

  // Handler to copy text to clipboard
  const copyToClipboard = (text: string, successMessage: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: successMessage,
      });
    });
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
          <p>Failed to load OAuth clients. {error instanceof Error ? error.message : 'Unknown error'}</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] })}>
            Try Again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">OAuth Client Management</h1>
        <div className="flex gap-2">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" /> Create Client
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin">Back to Admin</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>OAuth Clients</CardTitle>
          <CardDescription>Manage your OAuth 2.0 client applications</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>A list of all OAuth clients in your authorization server.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Client ID</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Redirect URIs</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients?.map((client) => (
                <TableRow key={client._id.toString()}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell className="font-mono text-xs break-all max-w-[200px]">{client.clientId}</TableCell>
                  <TableCell>{client.userId}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {Array.isArray(client.redirectUris) ? client.redirectUris.join(", ") : client.redirectUris}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewDetails(client)}
                      >
                        <Info className="h-4 w-4" />
                        <span className="sr-only">View Details</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditClient(client)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteClient(client)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Client Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New OAuth Client</DialogTitle>
            <DialogDescription>
              Register a new client application to integrate with the OAuth 2.0 authorization server.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-name">Client Name</Label>
              <Input
                id="new-name"
                value={newClient.name}
                onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                placeholder="My Application"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-description">Description</Label>
              <Textarea
                id="new-description"
                value={newClient.description}
                onChange={(e) => setNewClient({...newClient, description: e.target.value})}
                placeholder="A brief description of your application"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-redirectUris">Redirect URIs (comma separated)</Label>
              <Textarea
                id="new-redirectUris"
                value={newClient.redirectUris}
                onChange={(e) => setNewClient({...newClient, redirectUris: e.target.value})}
                placeholder="https://example.com/callback, https://example.com/callback2"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                List the callback URLs where users will be redirected after authentication.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-allowedScopes">Allowed Scopes (comma separated)</Label>
              <Input
                id="new-allowedScopes"
                value={newClient.allowedScopes}
                onChange={(e) => setNewClient({...newClient, allowedScopes: e.target.value})}
                placeholder="profile, email, phone, preferences"
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Available scopes:</strong></p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
                  <p><code>read</code> - Basic account access</p>
                  <p><code>write</code> - Update account data</p>
                  <p><code>profile</code> - Name and username</p>
                  <p><code>email</code> - Email address</p>
                  <p><code>phone</code> - Phone number</p>
                  <p><code>preferences</code> - Theme, language, timezone</p>
                  <p><code>organization</code> - Organization and role</p>
                  <p><code>security</code> - MFA status, login history</p>
                  <p><code>admin</code> - Full administrative access</p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleCreateClient}
              disabled={createClientMutation.isPending}
            >
              {createClientMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit OAuth Client</DialogTitle>
            <DialogDescription>
              Update the details of this OAuth client.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Client Name</Label>
              <Input
                id="edit-name"
                value={selectedClient?.name || ""}
                onChange={(e) => 
                  setSelectedClient(prev => prev ? {...prev, name: e.target.value} : null)
                }
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={selectedClient?.description || ""}
                onChange={(e) => 
                  setSelectedClient(prev => prev ? {...prev, description: e.target.value} : null)
                }
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-redirectUris">Redirect URIs (comma separated)</Label>
              <Textarea
                id="edit-redirectUris"
                value={
                  typeof selectedClient?.redirectUris === 'string'
                    ? selectedClient.redirectUris
                    : selectedClient?.redirectUris?.join(", ") || ""
                }
                onChange={(e) => 
                  setSelectedClient(prev => prev ? {...prev, redirectUris: e.target.value} : null)
                }
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-allowedScopes">Allowed Scopes (comma separated)</Label>
              <Input
                id="edit-allowedScopes"
                value={
                  typeof selectedClient?.allowedScopes === 'string'
                    ? selectedClient.allowedScopes
                    : selectedClient?.allowedScopes?.join(", ") || "read"
                }
                onChange={(e) => 
                  setSelectedClient(prev => prev ? {...prev, allowedScopes: e.target.value} : null)
                }
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Available scopes:</strong></p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
                  <p><code>read</code> - Basic account access</p>
                  <p><code>write</code> - Update account data</p>
                  <p><code>profile</code> - Name and username</p>
                  <p><code>email</code> - Email address</p>
                  <p><code>phone</code> - Phone number</p>
                  <p><code>preferences</code> - Theme, language, timezone</p>
                  <p><code>organization</code> - Organization and role</p>
                  <p><code>security</code> - MFA status, login history</p>
                  <p><code>admin</code> - Full administrative access</p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleUpdateClient}
              disabled={updateClientMutation.isPending}
            >
              {updateClientMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>OAuth Client Details</DialogTitle>
            <DialogDescription>
              Details and credentials for client <span className="font-semibold">{selectedClient?.name}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Client ID</Label>
              <div className="flex items-center justify-between gap-2 rounded-md border p-2 font-mono text-sm">
                <span className="truncate">{selectedClient?.clientId}</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => 
                    copyToClipboard(
                      selectedClient?.clientId || "", 
                      "Client ID copied to clipboard"
                    )
                  }
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Client Secret</Label>
              <div className="flex items-center justify-between gap-2 rounded-md border p-2 font-mono text-sm">
                <span className="truncate">{selectedClient?.clientSecret}</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => 
                    copyToClipboard(
                      selectedClient?.clientSecret || "", 
                      "Client Secret copied to clipboard"
                    )
                  }
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-destructive font-medium">
                Keep this value confidential and secure!
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Authorization Endpoint</Label>
              <div className="flex items-center justify-between gap-2 rounded-md border p-2 font-mono text-xs">
                <span className="truncate">/oauth/authorize</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => 
                    copyToClipboard(
                      `/oauth/authorize`, 
                      "Authorization endpoint copied to clipboard"
                    )
                  }
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Token Endpoint</Label>
              <div className="flex items-center justify-between gap-2 rounded-md border p-2 font-mono text-xs">
                <span className="truncate">/oauth/token</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => 
                    copyToClipboard(
                      `/oauth/token`, 
                      "Token endpoint copied to clipboard"
                    )
                  }
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Information</Label>
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="flex items-start gap-2">
                  <Link2 className="h-4 w-4 mt-0.5 text-primary" />
                  <span>
                    <strong>Redirect URIs:</strong>{" "}
                    {Array.isArray(selectedClient?.redirectUris) 
                      ? selectedClient?.redirectUris.join(", ")
                      : selectedClient?.redirectUris}
                  </span>
                </p>
                <p className="mt-2">
                  <strong>Allowed Scopes:</strong>{" "}
                  {Array.isArray(selectedClient?.allowedScopes)
                    ? selectedClient?.allowedScopes.join(", ")
                    : selectedClient?.allowedScopes}
                </p>
                {selectedClient?.description && (
                  <p className="mt-2 text-muted-foreground">
                    {selectedClient.description}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Client Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the client "{selectedClient?.name}" and revoke all associated tokens.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteClientMutation.mutate()}
              disabled={deleteClientMutation.isPending}
            >
              {deleteClientMutation.isPending && (
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