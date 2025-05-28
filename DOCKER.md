# OAuth2 Authorization Server Docker Guide

This document outlines how to build and run the OAuth2 Authorization Server in Docker. The application is containerized with Docker and supports both development and production environments.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Configuration

The application can be configured using environment variables. The critical ones are:

- `MONGODB_URI`: MongoDB connection string
- `RP_ID`: The Relying Party ID for WebAuthn (typically your domain)
- `ORIGIN`: The application origin (e.g., https://yourdomain.com)
- `SESSION_SECRET`: Secret for session encryption

## Development Setup

By default, Docker Compose will use the development configuration which is suitable for local development:

1. **Start the development environment:**

   ```bash
   docker-compose up -d
   ```

   This starts the application in development mode with:
   - Code hot-reloading
   - MongoDB running without authentication
   - Debug logs enabled
   - Source code mounted as a volume

2. **View logs:**

   ```bash
   docker-compose logs -f
   ```

3. **Stop the environment:**

   ```bash
   docker-compose down
   ```

## Production Setup

For production deployment, use the production-specific compose file:

1. **Create a `.env` file with your production settings:**

   ```bash
   cp .env.example .env
   # Edit .env with your production values
   ```

2. **Start the production environment:**

   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

   This applies production-specific settings:
   - Resource limits for containers
   - MongoDB with authentication
   - Optimized logging
   - Container health checks
   - Secure network configuration

3. **View logs:**

   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
   ```

4. **Stop the environment:**

   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
   ```

   To remove all data volumes as well:

   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml down -v
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

## Cloud Deployment

The Docker setup can be used to deploy to various cloud platforms that support Docker containers.

### AWS ECS (Elastic Container Service)

1. **Build and push the image to Amazon ECR:**

   ```bash
   aws ecr create-repository --repository-name oauth2-server
   aws ecr get-login-password | docker login --username AWS --password-stdin <your-account-id>.dkr.ecr.<region>.amazonaws.com
   docker build -t <your-account-id>.dkr.ecr.<region>.amazonaws.com/oauth2-server:latest .
   docker push <your-account-id>.dkr.ecr.<region>.amazonaws.com/oauth2-server:latest
   ```

2. **Create an ECS task definition that references your MongoDB (use Amazon DocumentDB or a MongoDB Atlas connection)**

3. **Run the service in an ECS cluster**

### Google Cloud Run

1. **Build and push the image to Google Container Registry:**

   ```bash
   gcloud auth configure-docker
   docker build -t gcr.io/<project-id>/oauth2-server:latest .
   docker push gcr.io/<project-id>/oauth2-server:latest
   ```

2. **Deploy to Cloud Run:**

   ```bash
   gcloud run deploy oauth2-server \
     --image gcr.io/<project-id>/oauth2-server:latest \
     --platform managed \
     --allow-unauthenticated \
     --set-env-vars="MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/oauth2-server,RP_ID=your-domain.com,ORIGIN=https://your-domain.com"
   ```

### Azure Container Instances

1. **Create a container registry and log in:**

   ```bash
   az acr create --name oauth2serveracr --resource-group myResourceGroup --sku Basic
   az acr login --name oauth2serveracr
   ```

2. **Build and push the image:**

   ```bash
   docker build -t oauth2serveracr.azurecr.io/oauth2-server:latest .
   docker push oauth2serveracr.azurecr.io/oauth2-server:latest
   ```

3. **Deploy to Azure Container Instances:**

   ```bash
   az container create \
     --resource-group myResourceGroup \
     --name oauth2-server \
     --image oauth2serveracr.azurecr.io/oauth2-server:latest \
     --registry-username <username> \
     --registry-password <password> \
     --environment-variables MONGODB_URI="mongodb://cosmosdb-account:password@cosmosdb-account.documents.azure.com:10255/oauth2-server?ssl=true" RP_ID="your-domain.com" ORIGIN="https://your-domain.com" SESSION_SECRET="your-secret"
   ```