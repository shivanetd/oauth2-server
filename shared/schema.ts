import { z } from "zod";
import { ObjectId } from "mongodb";

// Schema definitions for validation
export const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  isAdmin: z.boolean().default(false),
});

export const insertClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  redirectUris: z.array(z.string().url("Invalid redirect URI")),
  userId: z.string(),
});

export const insertAuthCodeSchema = z.object({
  code: z.string(),
  clientId: z.string(),
  userId: z.string(),
  scope: z.array(z.string()).optional(),
  expiresAt: z.date(),
});

export const insertTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  clientId: z.string(),
  userId: z.string(),
  scope: z.array(z.string()).optional(),
  expiresAt: z.date(),
});

// Types for the application
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = InsertUser & { _id: string };

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = InsertClient & {
  _id: string;
  clientId: string;
  clientSecret: string;
  createdAt: Date;
};

export type InsertAuthCode = z.infer<typeof insertAuthCodeSchema>;
export type AuthCode = InsertAuthCode & { _id: string };

export type InsertToken = z.infer<typeof insertTokenSchema>;
export type Token = InsertToken & { _id: string };