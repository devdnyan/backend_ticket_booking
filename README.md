# Ticket Booking API

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?logo=redis&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-Real-time-010101?logo=socket.io&logoColor=white)
![BullMQ](https://img.shields.io/badge/BullMQ-Job%20Queue-FF6A00)

</div>

A production-style ticket booking system built with Node.js, TypeScript, PostgreSQL, Redis, and WebSockets. The service supports seat availability checks, temporary seat holds, confirmation workflows, idempotent checkouts, and live seat updates over WebSockets.

## Overview

This project models a ticket booking API for events with seat inventory. It focuses on concurrency safety and transactional correctness:

- seat inventory is stored in PostgreSQL
- Redis is used for distributed locking and idempotency
- BullMQ manages temporary seat-expiry jobs
- WebSocket broadcasts send live seat status changes to connected clients

## Features

- Real-time seat availability queries
- Seat hold with short TTL expiry
- Reservation confirmation with validation
- Idempotent checkout protection via Redis cache
- Race-condition-safe seat allocation using PostgreSQL row locks
- Distributed locking with Redis `SET NX PX`
- Background expiry worker for releasing stale holds
- WebSocket-based live updates for event seat changes
- TypeScript-first implementation

## Architecture

The application is organized around a few core responsibilities:

- API layer: Express routes and HTTP handlers
- Service layer: booking logic and business rules
- Repository layer: database transactions for seat update logic
- Redis layer: locks, pub/sub, idempotency cache
- Background queue: BullMQ expiry jobs
- WebSocket layer: broadcast seat changes to connected clients

### Booking flow

1. Client requests list of available seats for an event.
2. Client posts a seat hold request.
3. Redis lock ensures only one process handles a seat at a time.
4. PostgreSQL locks the selected seat row and updates its state to `HELD`.
5. A BullMQ job is scheduled to release the seat after a delay.
6. Redis publishes an `eventUpdate` event.
7. WebSocket listeners forward the update to matching event clients.
8. Client confirms the seat, and a payment mock runs before booking finalization.

## Tech Stack

- Node.js 18+
- TypeScript
- Express 5
- PostgreSQL
- Redis
- BullMQ
- WebSockets (`ws`)
- `pg` for PostgreSQL client access
- `ioredis` for Redis access
- `dotenv` for environment configuration

## Project Structure

```text
.
├── src/
│   ├── app.ts
│   ├── controllers/
│   │   └── bookingController.ts
│   ├── config/
│   │   ├── database.ts
│   │   ├── eventBus.ts
│   │   ├── queue.ts
│   │   ├── redis.ts
│   │   ├── seed.ts
│   │   └── websocket.ts
│   ├── middleware/
│   │   └── checkout-middleware.ts
│   ├── repositories/
│   │   └── seatRespositories.ts
│   ├── routes/
│   │   └── bookingRoutes.ts
│   ├── services/
│   │   ├── bookingServices.ts
│   │   ├── lock.ts
│   │   └── paymentMocker.ts
│   ├── worker/
│   │   ├── dbconfig.ts
│   │   ├── redis.ts
│   │   └── seatExpiryWorker.ts
│   └── ...
├── package.json
├── test-app.js
├── tsconfig.json
└── README.md
```

## Prerequisites

Before running the app, make sure you have:

- Node.js installed
- PostgreSQL running locally
- Redis running locally
- A database named `ticket_booking`
- A PostgreSQL user named `ticket_app` with password `banana`

The current project is configured for local development using:

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- API port: `3000`

> Note: the app currently uses hardcoded local values in its configuration files. For production, move these into environment variables.

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd ticket_booking
```

2. Install dependencies:

```bash
npm install
```

3. Start PostgreSQL and Redis.

4. Create the database and required tables.

## Database Setup

The project was set up for local PostgreSQL development using a dedicated app role and a matching database. This flow matches the exact configuration used during setup:

```bash
sudo -u postgres psql
```

```sql
-- 1. Create the role with login permissions and a password
CREATE ROLE ticket_app WITH LOGIN PASSWORD 'banana';

-- 2. Create the database
CREATE DATABASE ticket_booking;

-- 3. Grant privileges on the database
grant all privileges on database ticket_booking to ticket_app;

-- 4. Connect to the database and grant schema access
\c ticket_booking
GRANT ALL ON SCHEMA public TO ticket_app;

-- 5. Create the enum types
CREATE TYPE seat_status AS ENUM ('AVAILABLE', 'HELD', 'BOOKED');
CREATE TYPE booking_status AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'FAILED');

-- 6. Create the Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Create the Seats table
CREATE TABLE seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    seat_number VARCHAR(10) NOT NULL,
    status seat_status DEFAULT 'AVAILABLE',
    held_by_user_id UUID,
    held_until TIMESTAMP,
    UNIQUE(event_id, seat_number)
);

-- 8. Create the Bookings ledger table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    event_id UUID REFERENCES events(id),
    seat_id UUID REFERENCES seats(id),
    status booking_status DEFAULT 'PENDING_PAYMENT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Verify the tables:

```sql
\dt
```

### Fixing the peer-auth login issue

If `ticket_app` cannot log in because PostgreSQL is configured with peer authentication, inspect the active host-based auth file:

```bash
sudo -u postgres psql -c "SHOW hba_file;"
```

Then update the PostgreSQL authentication config from `peer` to `scram-sha-256` for local Unix socket connections. A typical change is:

```conf
# IPv4 local connections:
host    all             all             127.0.0.1/32            scram-sha-256
# IPv6 local connections:
host    all             all             ::1/128                 scram-sha-256
# local socket connections:
local   all             all                                     scram-sha-256
```

Restart PostgreSQL after the change:

```bash
sudo systemctl restart postgresql
```

Then test login as the app user:

```bash
psql -h localhost -U ticket_app -d ticket_booking
```

If prompted, use the password `banana`.

Seed sample event data:

```bash
npx tsx src/config/seed.ts
```

This script inserts an event and creates 100 seats (`A1`..`J10`).

## Running the App

### Start the API server

```bash
npm run dev
```

This starts the Express app on port `3000`.

### Build the app

```bash
npm run build
```

### Run the production build

```bash
npm start
```

### Start the seat expiry worker

The queue worker is required for seat expiration and release behavior:

```bash
npx tsx src/worker/seatExpiryWorker.ts
```

This should run in a separate terminal session while the API is live.

## API Endpoints

### 1) Get available seats

```http
GET /api/events/:eventId
```

Example:

```bash
curl http://localhost:3000/api/events/bf723993-2079-4bf9-9ed1-23aaccd0cfbe
```

Example response:

```json
[
  {
    "id": "0be3044f-5238-4493-9857-8d1afa777834",
    "event_id": "bf723993-2079-4bf9-9ed1-23aaccd0cfbe",
    "seat_number": "A1",
    "status": "AVAILABLE",
    "held_by_user_id": null,
    "held_until": null
  }
]
```

### 2) Hold a seat

```http
POST /api/hold-seat
```

Request body:

```json
{
  "seatId": "0be3044f-5238-4493-9857-8d1afa777834"
}
```

Example:

```bash
curl -X POST http://localhost:3000/api/hold-seat \
  -H "Content-Type: application/json" \
  -d '{"seatId":"0be3044f-5238-4493-9857-8d1afa777834"}'
```

Response:

```json
{
  "id": "0be3044f-5238-4493-9857-8d1afa777834",
  "event_id": "bf723993-2079-4bf9-9ed1-23aaccd0cfbe",
  "seat_number": "A1",
  "status": "HELD",
  "held_by_user_id": "123e4567-e89b-12d3-a456-426614174000",
  "held_until": "2026-10-17T12:00:00.000Z"
}
```

### 3) Confirm a held seat

```http
POST /api/confirm-seat
```

Request headers:

```http
Idempotency-Key: booking-<unique-id>
```

Request body:

```json
{
  "seatId": "0be3044f-5238-4493-9857-8d1afa777834",
  "fail": false
}
```

Example:

```bash
curl -X POST http://localhost:3000/api/confirm-seat \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: booking-12345" \
  -d '{"seatId":"0be3044f-5238-4493-9857-8d1afa777834","fail":false}'
```

Response:

```json
{
  "message": "Seat confirmed successfully"
}
```

## Real-Time Updates (WebSocket)

The app broadcasts seat-state updates to clients subscribed to the same event ID.

Example connection:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/bf723993-2079-4bf9-9ed1-23aaccd0cfbe');

ws.onmessage = (event) => {
  const payload = JSON.parse(event.data);
  console.log('Seat update:', payload);
};
```

Example message:

```json
{
  "eventId": "bf723993-2079-4bf9-9ed1-23aaccd0cfbe",
  "seatId": "0be3044f-5238-4493-9857-8d1afa777834",
  "status": "held"
}
```

Status values include:

- `held`
- `booked`
- `Available`

## Idempotency

The checkout middleware protects repeated confirm requests using a Redis key created from the `Idempotency-Key` header.

Example:

```bash
curl -X POST http://localhost:3000/api/confirm-seat \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: booking-12345" \
  -d '{"seatId":"0be3044f-5238-4493-9857-8d1afa777834","fail":false}'
```

If the same key is replayed within 300 seconds, the original response is returned from Redis rather than re-processing the request.

## Queue & Expiry Worker

The app uses BullMQ with a queue named `SeatExpiryQueue`.

When a seat is held:

```ts
await queue.add('seatExpiry', { seatId, userId }, { delay: 10000 });
```

After the delay, the worker checks whether the seat is still held by the same user. If yes, it resets it to `AVAILABLE` and publishes a live update.

## Notes & Production Considerations

This project is a strong base for a seat-booking service, but a few aspects should be upgraded for production use:

- move configuration values to environment variables
- add authentication and user-specific seat ownership
- add real payment integration
- add migration tooling instead of ad hoc SQL setup
- add request validation and schema validation
- add metrics, observability, and structured logging
- add automated tests for concurrency, booking races, and expiry scenarios
