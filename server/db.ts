import { MongoClient } from 'mongodb';
import ws from "ws";
import * as schema from "@shared/schema";

import { neonConfig } from '@neondatabase/serverless'; //Keeping this for neonConfig


neonConfig.webSocketConstructor = ws;

if (!process.env.MONGO_CONNECTION_STRING) {
  throw new Error("MONGODB_URI must be set. Please provide your MongoDB connection string.");
}

export const client = new MongoClient(process.env.MONGO_CONNECTION_STRING);
export const db = client.db("oauth2-server");

// Connect to MongoDB
client.connect().catch(console.error);

// Handle cleanup on app termination
process.on('SIGINT', () => {
  client.close().then(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});