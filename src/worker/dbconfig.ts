import { Pool } from "pg";

const pool = new Pool({
    user: "ticket_app",
    host: "localhost",
    database: "ticket_booking",
    password: "banana",
    port: 5432,
})

console.log("Connected to PostgreSQL database successfully.");

export { pool };