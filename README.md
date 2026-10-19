# 🎟️ Ticket Booking API

A backend ticket booking system built with **Node.js, TypeScript, Express, PostgreSQL, Redis, BullMQ, and WebSockets**. The project explores concurrency-safe seat reservations, temporary seat holds, idempotent checkout, background job processing, and real-time seat availability updates.

## ✨ Features

- **Seat reservation:** Retrieve available seats and temporarily hold a seat before confirmation.
- **Concurrency control:** Combine PostgreSQL row-level locks with Redis distributed locks to prevent conflicting reservations.
- **Automatic seat expiry:** Use BullMQ workers to release seats whose holds have expired.
- **Idempotent checkout:** Cache checkout responses in Redis to avoid processing repeated requests more than once within the configured window.
- **Real-time updates:** Broadcast seat status changes to clients connected to the corresponding event through WebSockets.
- **Transactional database operations:** Use PostgreSQL transactions to maintain consistent seat and booking state.
- **Docker Compose:** Run the API, database, Redis, and background worker together.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Node.js 20 | JavaScript runtime |
| TypeScript | Type-safe backend development |
| Express 5 | HTTP API |
| PostgreSQL 17 | Events, seats, and bookings |
| Redis 7 | Distributed locks, event messaging, and idempotency |
| BullMQ | Delayed seat-expiry jobs |
| WebSockets (`ws`) | Real-time seat updates |
| Docker Compose | Local service orchestration |

## 🏗️ Architecture

The application separates HTTP request handling, booking logic, database access, background processing, and real-time communication.

```text
                 Client
                    |
                    | HTTP / WebSocket
                    v
              Express API
               Port 3000
                    |
          +---------+----------+
          |                    |
          v                    v
      PostgreSQL             Redis
      Port 5432           Port 6379
          |                    |
          |              BullMQ Queue
          |                    |
          |                    v
          |              Expiry Worker
          |                    |
          +--------------------+
                    |
                    v
          Updated seat status
                    |
                    v
            WebSocket clients
```

**Booking flow**

1. The client requests seat availability for an event.
2. The API attempts to acquire a Redis lock for the selected seat.
3. PostgreSQL row locking and a transaction protect the seat-state update.
4. The seat is marked `HELD`, and an expiry job is scheduled in BullMQ.
5. Redis publishes an event update, which is forwarded to connected WebSocket clients.
6. The client confirms the held seat. The current implementation uses a payment mock before finalizing the booking.
7. If the hold expires, the worker checks the seat's current state and ownership before releasing it.

## 📁 Project Structure

```text
backend_ticket_booking/
├── postgres/
│   └── init/
│       ├── 01-roles.sh
│       ├── 02-schema.sql
│       └── 03-grants.sql
├── src/
│   ├── app.ts
│   ├── config/
│   │   ├── database.ts
│   │   ├── eventBus.ts
│   │   ├── queue.ts
│   │   ├── redis.ts
│   │   ├── seed.ts
│   │   └── websocket.ts
│   ├── controllers/
│   │   └── bookingController.ts
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
│   └── worker/
│       ├── dbconfig.ts
│       ├── redis.ts
│       └── seatExpiryWorker.ts
├── .dockerignore
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

## 🚀 Getting Started

The recommended setup uses Docker Compose, so you don't need to install PostgreSQL or Redis directly on your machine.

### Prerequisites

- Git
- Docker Engine
- Docker Compose v2

Verify your installation:

```bash
docker --version
docker compose version
```

### 1. Clone the repository

```bash
git clone https://github.com/devdnyan/backend_ticket_booking.git
cd backend_ticket_booking
```

### 2. Configure environment variables

Create a `.env` file in the repository root:

```bash
touch .env
```

Add the following variables:

```dotenv
POSTGRES_PASSWORD=replace_with_a_strong_postgres_password
TICKET_APP_PASSWORD=replace_with_a_strong_app_password
```

Use your own strong passwords. Do not commit `.env` or share real credentials publicly.

### 3. Build and start the services

Run the following command from the repository root:

```bash
docker compose up -d --build
```

Compose builds the application image, initializes PostgreSQL on first startup, and starts the API and worker alongside Redis.

### 4. Verify the services

```bash
docker compose ps
```

View logs if a service fails to start:

```bash
docker compose logs -f
```

Follow individual services:

```bash
docker compose logs -f db
docker compose logs -f redis
docker compose logs -f server
docker compose logs -f worker
```

### 5. Access the services

| Service | Address |
|---|---|
| Express API | `http://localhost:3000` |
| PostgreSQL | `localhost:5000` |
| Redis | `localhost:6378` |
| WebSocket endpoint | `ws://localhost:3000/ws/:eventId` |

PostgreSQL and Redis use their standard internal ports for communication between Compose services. The host ports above are mapped by `docker-compose.yml`.

## 🗄️ Database Initialization

PostgreSQL is configured with the database `ticket_booking` and a dedicated application role named `ticket_app`.

On the first initialization of an empty PostgreSQL data directory, the official PostgreSQL image runs the scripts mounted from `postgres/init/`:

| File | Responsibility |
|---|---|
| `01-roles.sh` | Creates the application database role |
| `02-schema.sql` | Creates the database schema, including enum types and tables |
| `03-grants.sql` | Grants the required database and schema permissions |

The application connects to PostgreSQL using the `ticket_app` role rather than using the PostgreSQL superuser.

The database is persisted in the named Docker volume `postgres_db`. Restarting or recreating containers without deleting this volume preserves the database contents.

**Important:** PostgreSQL initialization scripts run only when the data directory is first initialized. Changing these files will not automatically modify an existing database.

### Seed sample event data

The repository includes a seed script that creates an event and 100 seats (`A1` through `J10`).

Once the services are running, execute the compiled seed script inside the API container:

```bash
docker compose exec server node dist/seed.js
```

Run this only when you need to initialize the sample event data, and check the database before rerunning it to avoid duplicate seed records.

## 🔌 API Reference

The API currently exposes the following booking endpoints.

### 1. Get event seats

`GET /api/events/:eventId`

Returns the seats associated with an event, including their current status.

```bash
curl http://localhost:3000/api/events/YOUR_EVENT_ID
```

Example response:

```json
[
  {
    "id": "YOUR_SEAT_ID",
    "event_id": "YOUR_EVENT_ID",
    "seat_number": "A1",
    "status": "AVAILABLE",
    "held_by_user_id": null,
    "held_until": null
  }
]
```

### 2. Hold a seat

`POST /api/hold-seat`

Request body:

```json
{
  "seatId": "YOUR_SEAT_ID"
}
```

Example request:

```bash
curl -X POST http://localhost:3000/api/hold-seat \
  -H "Content-Type: application/json" \
  -d '{"seatId":"YOUR_SEAT_ID"}'
```

A successful hold changes the seat status to `HELD` and records the holder and expiry timestamp.

### 3. Confirm a seat

`POST /api/confirm-seat`

The checkout endpoint accepts an idempotency key and a seat ID.

```bash
curl -X POST http://localhost:3000/api/confirm-seat \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: booking-12345" \
  -d '{"seatId":"YOUR_SEAT_ID","fail":false}'
```

Example success response:

```json
{
  "message": "Seat confirmed successfully"
}
```

Replace `YOUR_EVENT_ID` and `YOUR_SEAT_ID` with actual IDs from the database. The request examples illustrate the current API; they do not represent a production payment integration.

## ⚡ Real-Time Seat Updates

Clients can subscribe to seat changes for a particular event through WebSockets.

```javascript
const ws = new WebSocket(
  "ws://localhost:3000/ws/YOUR_EVENT_ID"
);

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log("Seat update:", update);
};
```

The server broadcasts updates associated with the subscribed event, allowing clients to react to seat holds, bookings, and releases without repeatedly polling the API.

## 🔁 Idempotency and Background Jobs

### Idempotent checkout

The checkout middleware uses Redis to cache responses associated with the `Idempotency-Key` request header. Repeating a request with the same key within the configured 300-second window returns the cached response rather than reprocessing the checkout.

Clients should generate a unique key for each logical checkout operation and reuse it for retries of that same operation.

### Seat expiry worker

BullMQ manages delayed jobs in the `SeatExpiryQueue`.

When a seat is held, the application schedules an expiry job. The worker checks whether the seat is still held by the expected user before making it available again. This prevents an outdated expiry job from releasing a seat that has already changed state.

Docker Compose starts the worker as a separate service using the same application image as the API.

## 🐳 Useful Docker Commands

| Task | Command |
|---|---|
| Start services | `docker compose up -d` |
| Rebuild and start | `docker compose up -d --build` |
| View service status | `docker compose ps` |
| Follow all logs | `docker compose logs -f` |
| Stop services | `docker compose stop` |
| Restart services | `docker compose restart` |
| Stop and remove containers | `docker compose down` |
| Open a PostgreSQL shell | `docker compose exec db psql -U postgres -d ticket_booking` |
| Open a Redis CLI | `docker compose exec redis redis-cli` |

### Reset the database

To delete the database volume and initialize PostgreSQL from scratch:

```bash
docker compose down -v
docker compose up -d --build
```

**Warning:** `docker compose down -v` deletes the persisted database volume and its data. Use it only when you intentionally want a fresh database.

## 🧪 Development Without Docker

For development outside the containers, install Node.js and npm, then start PostgreSQL and Redis separately.

Configure the application to use:

- PostgreSQL: `localhost:5000` if using the Compose database.
- Redis: `localhost:6378` if using the Compose Redis service.

Install dependencies and start the API:

```bash
npm ci
npm run dev
```

Build and run the compiled API:

```bash
npm run build
npm start
```

The seat-expiry worker can be run separately using the compiled worker entry point:

```bash
node dist/worker/seatExpiryWorker.js
```

When running the API and worker outside Docker, ensure their database and Redis environment variables point to the correct host ports. The Compose service names `db` and `redis` are only resolvable from containers on the Compose network.

## 🔐 Production Considerations

This is a learning-oriented backend focused on booking concurrency and asynchronous processing. Before deploying it as a production ticketing service, consider:

- Adding authentication and authorization with user-specific seat ownership.
- Replacing the payment mock with a real payment provider and verified payment callbacks.
- Validating request payloads and enforcing consistent API error responses.
- Adding readiness checks and robust service startup handling.
- Using database migrations for schema evolution.
- Testing concurrent seat holds, duplicate checkout requests, worker retries, and expiry races.
- Protecting exposed services with appropriate network restrictions, TLS, secrets management, and rate limiting.
- Adding structured logs, metrics, and monitoring.

## 📌 Project Goals

This project is intended to explore practical backend engineering concepts, including:

- Database transactions and row-level locking.
- Distributed locks and idempotency.
- Asynchronous jobs and delayed task processing.
- WebSocket-based event broadcasting.
- Containerized development with Docker Compose.

## 📄 License

See the repository for license information.
