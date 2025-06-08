import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupOAuth } from "./oauth";
import { setupWebAuthn } from "./webauthn";
import { storage } from "./storage";
import { insertClientSchema } from "@shared/schema";

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || !req.user.isAdmin) {
    return res.status(403).send("Admin access required");
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for containerized environments
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'ok',
      timestamp: new Date().toISOString() 
    });
  });

  setupAuth(app);
  setupOAuth(app);
  setupWebAuthn(app);

  // Client registration endpoint
  app.post("/api/clients", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Authentication required");
    }

    try {
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient({
        ...clientData,
        userId: req.user!._id.toString(),
      });

      res.status(201).json(client);
    } catch (error) {
      res
        .status(400)
        .send(error instanceof Error ? error.message : "Invalid request");
    }
  });

  // List user's clients
  app.get("/api/clients", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Authentication required");
    }

    const clients = await storage.listClientsByUser(req.user!._id.toString());
    res.json(clients);
  });
  
  // Get a specific client
  app.get("/api/clients/:clientId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Authentication required");
    }
    
    try {
      const clientId = req.params.clientId;
      const client = await storage.getClientById(clientId);
      
      if (!client) {
        return res.status(404).send("Client not found");
      }
      
      // Check if the client belongs to the current user or if user is admin
      if (client.userId !== req.user!._id.toString() && !req.user!.isAdmin) {
        return res.status(403).send("Unauthorized access to this client");
      }
      
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).send("Error fetching client");
    }
  });
  
  // Update a client
  app.put("/api/clients/:clientId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Authentication required");
    }
    
    try {
      const clientId = req.params.clientId;
      const client = await storage.getClientById(clientId);
      
      if (!client) {
        return res.status(404).send("Client not found");
      }
      
      // Check if the client belongs to the current user or if user is admin
      if (client.userId !== req.user!._id.toString() && !req.user!.isAdmin) {
        return res.status(403).send("Unauthorized access to this client");
      }
      
      // Update the client
      const updatedClient = await storage.updateClient(clientId, req.body);
      
      if (!updatedClient) {
        return res.status(500).send("Failed to update client");
      }
      
      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).send("Error updating client");
    }
  });
  
  // Delete a client
  app.delete("/api/clients/:clientId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Authentication required");
    }
    
    try {
      const clientId = req.params.clientId;
      const client = await storage.getClientById(clientId);
      
      if (!client) {
        return res.status(404).send("Client not found");
      }
      
      // Check if the client belongs to the current user or if user is admin
      if (client.userId !== req.user!._id.toString() && !req.user!.isAdmin) {
        return res.status(403).send("Unauthorized access to this client");
      }
      
      // Delete the client
      const success = await storage.deleteClient(clientId);
      
      if (!success) {
        return res.status(500).send("Failed to delete client");
      }
      
      res.status(200).json({ success: true, message: "Client deleted successfully" });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).send("Error deleting client");
    }
  });

  // WebAuthn credentials endpoint
  app.get("/api/webauthn/credentials", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Authentication required");
    }

    try {
      const credentials = await storage.getWebAuthnCredentialsByUserId(req.user!._id.toString());
      res.json(credentials);
    } catch (error) {
      console.error("Error fetching WebAuthn credentials:", error);
      res.status(500).send("Error fetching passkeys");
    }
  });

  // Admin routes
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.listUsers();
      // Remove sensitive data before sending
      const sanitizedUsers = users.map(({ password, ...user }) => user);
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).send("Error fetching users");
    }
  });

  // Get a specific user
  app.get("/api/admin/users/:userId", requireAdmin, async (req, res) => {
    try {
      const userId = req.params.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).send("User not found");
      }

      // Remove sensitive data before sending
      const { password, ...sanitizedUser } = user;
      res.json(sanitizedUser);
    } catch (error) {
      res.status(500).send("Error fetching user");
    }
  });

  // Update a user
  app.put("/api/admin/users/:userId", requireAdmin, async (req, res) => {
    try {
      const userId = req.params.userId;
      const userData = req.body;
      
      // Don't allow changing _id through the API
      delete userData._id;
      
      const updatedUser = await storage.updateUser(userId, userData);
      
      if (!updatedUser) {
        return res.status(404).send("User not found or could not be updated");
      }

      // Remove sensitive data before sending
      const { password, ...sanitizedUser } = updatedUser;
      res.json(sanitizedUser);
    } catch (error) {
      res.status(500).send("Error updating user");
    }
  });

  // Delete a user
  app.delete("/api/admin/users/:userId", requireAdmin, async (req, res) => {
    try {
      const userId = req.params.userId;
      
      // Prevent deleting your own account
      if (req.user?._id.toString() === userId) {
        return res.status(400).send("You cannot delete your own account");
      }
      
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(404).send("User not found or could not be deleted");
      }

      res.status(200).send({ success: true, message: "User deleted successfully" });
    } catch (error) {
      res.status(500).send("Error deleting user");
    }
  });

  app.get("/api/admin/clients", requireAdmin, async (req, res) => {
    try {
      const clients = await storage.listAllClients();
      res.json(clients);
    } catch (error) {
      res.status(500).send("Error fetching clients");
    }
  });

  // Super Admin routes - require super admin authentication
  function requireSuperAdmin(req: any, res: any, next: any) {
    if (!req.isAuthenticated() || !req.user?.isSuperAdmin) {
      return res.status(403).json({ error: "Super admin access required" });
    }
    next();
  }

  app.get("/api/super-admin/tenants", requireSuperAdmin, async (req, res) => {
    try {
      const tenants = await storage.listTenants();
      // Add user count for each tenant
      const tenantsWithCounts = await Promise.all(tenants.map(async (tenant) => {
        const users = await storage.listUsersByTenant(tenant._id.toString());
        return {
          ...tenant,
          userCount: users.length,
          isActive: true, // Default to active
          isPremium: tenant.billingPlan !== 'free'
        };
      }));
      res.json(tenantsWithCounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  });

  app.post("/api/super-admin/tenants", requireSuperAdmin, async (req, res) => {
    try {
      const tenant = await storage.createTenant(req.body);
      res.status(201).json(tenant);
    } catch (error) {
      res.status(500).json({ error: "Failed to create tenant" });
    }
  });

  app.get("/api/super-admin/stats", requireSuperAdmin, async (req, res) => {
    try {
      const users = await storage.listUsers();
      const clients = await storage.listAllClients();
      
      res.json({
        totalUsers: users.length,
        totalClients: clients.length,
        totalTenants: (await storage.listTenants()).length
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Promote current user to super admin (development endpoint)
  app.post("/api/admin/promote-super-admin", requireAdmin, async (req, res) => {
    try {
      const userId = req.user!._id.toString();
      const updatedUser = await storage.updateUser(userId, { isSuperAdmin: true });
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ message: "Successfully promoted to super admin", user: updatedUser });
    } catch (error) {
      res.status(500).json({ error: "Failed to promote user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
