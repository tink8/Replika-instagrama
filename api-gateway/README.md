# API Gateway

This is the central API Gateway for the Instagram Clone microservices architecture. It acts as the single entry point for all client requests, routing them to the appropriate backend services.

## Features

- **Reverse Proxy:** Routes incoming requests to backend microservices (e.g., `/api/auth/*` to the Auth Service).
- **Global Authentication:** Provides JWT verification middleware using RS256 public keys to secure downstream routes.
- **Rate Limiting:** Protects against brute-force attacks and abuse (100 requests per 15 minutes per IP).
- **Security:** Uses `helmet` for secure HTTP headers and `cors` for cross-origin resource sharing.
- **Logging:** Uses `morgan` to log all incoming HTTP requests.

## Prerequisites

Before running the API Gateway, ensure you have:

1. Node.js (v18 or higher) installed.
2. The RSA key pair generated in the root `/keys` directory. You can generate these by running the `generate-keys.js` script in the `auth-service`.
3. A `.env` file in the root directory of the project.

## Environment Variables

The gateway relies on the root `.env` file (`../.env`) or its own local `.env`. Ensure the following variables are set:

```env
PORT=3000
AUTH_SERVICE_URL=http://localhost:8001
```

## Installation

Navigate to the `api-gateway` directory and install the dependencies:

```bash
cd api-gateway
npm install
```

## Running the Service

**Development Mode (with auto-reload):**

```bash
npm run dev
```

**Production Mode:**

```bash
npm start
```

## Docker

A `Dockerfile` is included for containerization. Because the gateway relies on files outside its immediate directory (the root `.env` and `/keys` directory), you must mount these as volumes when running the container.

Example `docker-compose.yml` snippet:

```yaml
services:
  api-gateway:
    build: ./api-gateway
    ports:
      - "3000:3000"
    volumes:
      - ./keys:/usr/src/keys
      - ./.env:/usr/src/.env
```

## Routes

- `GET /health` - Health check endpoint. Returns `{ status: 'UP', service: 'api-gateway' }`.
- `/api/auth/*` - Proxied to the Auth Service.
