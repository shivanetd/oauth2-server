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
      var vvs= {
        ...clientData,
        userId: req.user!._id.toString(),
      };
      const client = await storage.createClient(vvs);

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

    const clients = await storage.listClientsByUser(req.user!._id.toString());
    res.json(clients);
  });

  // Admin routes
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    const users = Array.from(storage.users.values()).map(({ password, ...user }) => user);
    res.json(users);
  });

  app.get("/api/admin/clients", requireAdmin, async (req, res) => {
    const clients = Array.from(storage.clients.values());
    res.json(clients);
  });

  const httpServer = createServer(app);
  return httpServer;
}
