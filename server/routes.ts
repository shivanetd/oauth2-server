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

  const httpServer = createServer(app);
  return httpServer;
}
