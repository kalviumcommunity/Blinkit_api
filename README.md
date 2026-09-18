# Blinkit Inventory Management

A backend system for managing products, stock, and inventory activities.

## Tech Stack

- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM

## Completed Work

### Database
- PostgreSQL database setup and connection
- Products table
- InventoryLogs table
- Prisma ORM configuration

### Product APIs
- Create Product
- Get All Products
- Get Product by ID
- Update Product
- Delete Product

### Inventory & Stock
- Stock update API
- Atomic stock updates
- Concurrency-safe stock handling
- Negative stock prevention
- Automatic inventory logging
- Inventory Logs GET API
- PostgreSQL database integration

## Main APIs

- `POST /api/products`
- `GET /api/products`
- `GET /api/products/:id`
- `PATCH /api/products/:id`
- `DELETE /api/products/:id`
- `PATCH /api/products/:id/stock`
- `GET /api/inventory-logs`

## Tech Stack

Node.js • Express • TypeScript • PostgreSQL • Prisma