/**
 * MongoDB initialization script for Docker container
 * This script will be executed when the MongoDB container is first created
 */

// Create the application database if it doesn't exist
db = db.getSiblingDB('oauth2-server');

// Create application user with appropriate permissions
db.createUser({
  user: 'appuser',
  pwd: 'apppassword',  // In production, use environment variables for secure credentials
  roles: [
    { role: 'readWrite', db: 'oauth2-server' }
  ]
});

// Create collections with appropriate indexes
db.createCollection('users');
db.users.createIndex({ username: 1 }, { unique: true });

db.createCollection('webauthn_credentials');
db.webauthn_credentials.createIndex({ credentialID: 1 }, { unique: true });
db.webauthn_credentials.createIndex({ userId: 1 });

db.createCollection('clients');
db.clients.createIndex({ clientId: 1 }, { unique: true });
db.clients.createIndex({ userId: 1 });

db.createCollection('auth_codes');
db.auth_codes.createIndex({ code: 1 }, { unique: true });
db.auth_codes.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

db.createCollection('tokens');
db.tokens.createIndex({ accessToken: 1 }, { unique: true, sparse: true });
db.tokens.createIndex({ refreshToken: 1 }, { unique: true, sparse: true });
db.tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

db.createCollection('jwt_keys');

// Optional: Create a default admin user for initial setup
// Comment this out in production or modify with secure credentials
db.users.insertOne({
  username: 'admin',
  password: '$argon2id$v=19$m=65536,t=3,p=4$YVFz3Z7hZZA+kYV19jzNTA$HxS8DpFcDhEQJuVvrNHxNcCspiJHLyAiW+YEu2JdRGI', // 'adminpassword'
  isAdmin: true,
  createdAt: new Date()
});

print('MongoDB initialization completed');