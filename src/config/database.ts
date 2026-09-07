import { Client, Pool } from "pg";

const pool = new Pool({
    user: "ticket_app",
    host: "localhost",
    database: "ticket_booking",
    password: "banana",
    port: 5432,
})


export { pool };