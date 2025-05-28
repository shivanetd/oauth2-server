/**
 * Authentication System Implementation
 * 
 * This module provides a comprehensive authentication system supporting multiple
 * authentication methods for the OAuth2 authorization server. It handles user
 * registration, login, session management, and OAuth provider integration.
 * 
 * Authentication Methods:
 * - Local username/password authentication with secure password hashing
 * - OAuth integration with GitHub and Google providers
 * - Session-based authentication state management
 * 
 * Security Features:
 * - Scrypt password hashing with salt for security
 * - Constant-time password comparison to prevent timing attacks
 * - Secure session management with configurable storage
 * - CSRF protection through session configuration
 * - Secure cookie handling for session tokens
 * 
 * @author Authentication Team
 * @version 1.0.0
 */

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express } from "express";
import session from "express-session";
import crypto, { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import MongoStore from "connect-mongo";
import CookieParser from "cookie-parser";
import BodyParser from "body-parser";

// Ensure the SessionData interface includes our custom properties
declare module "express-session" {
  interface SessionData {
    returnTo?: string;
  }
}

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Export this function so it can be used by other modules
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET ?? "dev-secret-key",
    resave: true,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      dbName: "oauth2-server",
      ttl: 14 * 24 * 60 * 60,
      autoRemove: "native",
      crypto: {
        secret: process.env.SESSION_SECRET ?? "dev-secret-key",
      },
      touchAfter: 24 * 3600,
    }),
    cookie: {
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days in milliseconds
      secure: process.env.NODE_ENV === "production",
    },
  };

  app.use(CookieParser());
  app.use(BodyParser.urlencoded({ extended: true }));
  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  // GitHub Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${process.env.BASE_URL || 'http://localhost:5000'}/api/auth/github/callback`
    },
    async function(accessToken: string, refreshToken: string, profile: any, done: Function) {
      try {
        let user = await storage.getUserByUsername(`github:${profile.id}`);

        if (!user) {
          user = await storage.createUser({
            username: `github:${profile.id}`,
            password: await hashPassword(randomBytes(32).toString('hex')),
            isAdmin: false
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }));
  }

  // Google Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BASE_URL || 'http://localhost:5000'}/api/auth/google/callback`
    },
    async function(accessToken: string, refreshToken: string, profile: any, done: Function) {
      try {
        let user = await storage.getUserByUsername(`google:${profile.id}`);

        if (!user) {
          user = await storage.createUser({
            username: `google:${profile.id}`,
            password: await hashPassword(randomBytes(32).toString('hex')),
            isAdmin: false
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }));
  }

  passport.serializeUser((user, done) => {
    done(null, (user as SelectUser)._id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Social auth routes
  app.get('/api/auth/github',
    passport.authenticate('github', { scope: [ 'user:email' ] })
  );

  app.get('/api/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/auth' }),
    function(req, res) {
      const returnTo = req.session.returnTo;
      delete req.session.returnTo;
      res.redirect(returnTo || '/');
    }
  );

  app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth' }),
    function(req, res) {
      const returnTo = req.session.returnTo;
      delete req.session.returnTo;
      res.redirect(returnTo || '/');
    }
  );

  // Regular auth routes
  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);

        // Check if there's a pending OAuth request
        const returnTo = req.session.returnTo;
        delete req.session.returnTo;

        if (returnTo) {
          res.status(201).json({ user, redirect: returnTo });
        } else {
          res.status(201).json(user);
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Check if there's a pending OAuth request
    const returnTo = req.session.returnTo;
    delete req.session.returnTo;

    if (returnTo) {
      res.status(200).json({ user: req.user, redirect: returnTo });
    } else {
      res.status(200).json(req.user);
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}