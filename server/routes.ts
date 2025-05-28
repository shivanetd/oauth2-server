import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupOAuth } from "./oauth";
import { storage } from "./storage";
import { insertClientSchema } from "@shared/schema";
import { z } from "zod";

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || !req.user.isAdmin) {
    return res.status(403).send("Admin access required");
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  setupOAuth(app);

  // Client registration endpoint
  app.post("/api/clients", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Authentication required");
    }

    try {
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient({
        ...clientData,
        userId: req.user!._id,
      });

      res.status(201).json(client);
    } catch (error) {
      res.status(400).send(error instanceof Error ? error.message : "Invalid request");
    }
  });

  // List user's clients
  app.get("/api/clients", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Authentication required");
    }

    const clients = await storage.listClientsByUser(req.user!._id);
    res.json(clients);
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