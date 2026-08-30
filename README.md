# ShopNest Backend (onwear-server)

The backend server for **ShopNest**, a full-stack, premium e-commerce platform built with Express.js, TypeScript, Prisma ORM, and PostgreSQL.

## Features

- **Robust Authentication**: JWT & bcrypt implementation with secure token verification middleware.
- **Dynamic Role-Based Access Control**: Distinguishes administrative users from customers to restrict backend endpoints securely.
- **Stock Integrity (Race Condition Protection)**: Implements database transactions using Prisma to handle stock validation and updates concurrently, eliminating double-selling/negative inventory.
- **Rate Limiting & Security**: Setup with Helmet, CORS, and Express-Rate-Limit. Configured to trust reverse-proxy headers (`trust proxy`) for accurate IP logging and limiting.
- **Secure Webhooks**: SSLCommerz and bKash payment integrations featuring webhook/IPN validations and amount checks.
- **Optimized Caching**: Redis-backed cache layer for read-heavy resources (like category lists and public catalogs) with automatic cache invalidation on administrative updates.
- **Structured Logging**: Structured JSON logger powered by Winston, integrated directly into the Express global error-handling middleware.
- **Database Connection Pooling**: Configured in `.env` to scale database operations under high load.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js with TypeScript
- **Database ORM**: Prisma ORM
- **Database**: PostgreSQL
- **Caching**: Redis
- **Logger**: Winston

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL
- Redis (optional, local cache fallback is active)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```ini
   DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public&connection_limit=30"
   JWT_SECRET="your_secret_key"
   JWT_EXPIRES_IN="7d"
   PORT=5000
   NODE_ENV="development"
   FRONTEND_URL="http://localhost:3000"
   SSLCOMMERZ_STORE_ID="your_store_id"
   SSLCOMMERZ_STORE_PASSWORD="your_store_password"
   SSLCOMMERZ_IS_SANDBOX="true"
   BACKEND_URL="http://localhost:5000"
   ```

3. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

4. Seed initial categories and catalog data:
   ```bash
   npx prisma db seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Production Readiness Configured

We have verified and implemented the following optimizations for production scale:
1. **Stock Lock**: Handled inside transactions to prevent stock race conditions.
2. **Reverse Proxy Trust**: `app.set('trust proxy', 1)` is enabled in `app.ts`.
3. **Structured Logs**: All uncaught errors are format-logged via Winston JSON outputs.
4. **Connection limits**: Pool sizing is active in `.env`.
