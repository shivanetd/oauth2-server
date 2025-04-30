# OAuth2 Authorization Server Docker Guide

This document outlines how to build and run the OAuth2 Authorization Server in Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Configuration

The application can be configured using environment variables. The critical ones are:

- `MONGODB_URI`: MongoDB connection string
- `RP_ID`: The Relying Party ID for WebAuthn (typically your domain)
- `ORIGIN`: The application origin (e.g., https://yourdomain.com)
- `SESSION_SECRET`: Secret for session encryption

## Running with Docker Compose

1. **Start the application and MongoDB:**

   ```bash
   docker-compose up -d
   ```

   This will start both the OAuth2 server and a MongoDB instance.

2. **View logs:**

   ```bash
   docker-compose logs -f
   ```

3. **Stop the application:**

   ```bash
   docker-compose down
   ```

   To remove all data volumes as well:

   ```bash
   docker-compose down -v
   ```

## Running without Docker Compose

If you prefer to run just the application container and connect to an existing MongoDB:

1. **Build the Docker image:**

   ```bash
   docker build -t oauth2-server .
   ```

2. **Run the container:**

   ```bash
   docker run -d \
     -p 5000:5000 \
     -e MONGODB_URI=mongodb://your-mongodb-host:27017/oauth2-server \
     -e RP_ID=your-domain.com \
     -e ORIGIN=https://your-domain.com \
     -e SESSION_SECRET=your-secure-secret \
     --name oauth2-server \
     oauth2-server
   ```

## Production Considerations

For production deployments, consider the following:

1. **Use a non-root user** in the Dockerfile for security
2. **Set proper session secrets** and don't use the defaults
3. **Configure reverse proxy** (like Nginx) for SSL termination
4. **Set up health checks** to monitor the application
5. **Implement proper logging** for production monitoring
6. **Use MongoDB authentication** and secure your database
7. **Backup your MongoDB data** regularly
8. **Define resource limits** for your containers

## WebAuthn/Passkey Considerations

For WebAuthn to work properly in production:

1. The application must be served over HTTPS
2. The RP_ID must match your domain
3. The ORIGIN must use the correct protocol and domain

For example:
- RP_ID: `yourdomain.com`
- ORIGIN: `https://yourdomain.com`