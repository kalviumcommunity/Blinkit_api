# Blinkit_api


# Blinkit Inventory Backend

Backend API for managing products, stock, and inventory logs using Node.js, Express, PostgreSQL, and Prisma.

## Completed Features

- Product CRUD APIs
- Stock update API
- Atomic and concurrency-safe stock updates
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
Credits to -: Sanskriti kant (Database)
                Devesh (Frontend)
                Deepak (overall)
