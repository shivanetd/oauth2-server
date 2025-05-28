import { db } from './server/db';

async function main() {
  try {
    // Connect to MongoDB
    console.log("Finding OAuth clients in database...");
    
    // Find all clients
    const clients = await db.collection('clients').find({}).toArray();
    
    if (clients.length === 0) {
      console.log("No OAuth clients found in the database.");
      return;
    }
    
    // Print client information
    console.log(`Found ${clients.length} OAuth clients:`);
    clients.forEach((client, index) => {
      console.log(`\nClient #${index + 1}:`);
      console.log(`ID: ${client._id}`);
      console.log(`Name: ${client.name}`);
      console.log(`Client ID: ${client.clientId}`);
      console.log(`Client Secret: ${client.clientSecret}`);
      console.log(`Redirect URIs: ${Array.isArray(client.redirectUris) ? client.redirectUris.join(', ') : client.redirectUris}`);
      console.log(`Allowed Scopes: ${Array.isArray(client.allowedScopes) ? client.allowedScopes.join(', ') : client.allowedScopes}`);
      if (client.userId) {
        console.log(`User ID: ${client.userId}`);
      }
      console.log(`Created: ${client.createdAt}`);
    });
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

main();