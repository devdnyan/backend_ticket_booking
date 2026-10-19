import { Pool } from "pg";

const pool = new Pool({
    user: process.env.DB_USER || "ticket_app",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "ticket_booking",
    password: process.env.DB_PASSWORD || "banana",
    port: parseInt(process.env.DB_PORT ?? "5432", 10),
})


export { pool };