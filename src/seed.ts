import { Pool } from "pg";

const pool = new Pool({
    user: "ticket_app",
    host: "localhost",
    database: "ticket_booking",
    password: "banana",
    port: 5000,
})

async function seedDataBase() {
    try{
        console.log("Seeding database...");

        const eventRes = await pool.query(`
            INSERT INTO events (name, date) 
            VALUES 
            ($1, $2)
            RETURNING id`,
            ['The Eras Tour', new Date('2026-12-31T20:00:00Z')]
        );
        const eventId = eventRes.rows[0].id;
        console.log(`Inserted event with ID: ${eventId}`);

        const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        let seatCounts = 0;

        for(const row of rows) {
            for(let i=1; i<=10; i++) {
                const seatNumber = `${row}${i}`;
                await pool.query(`
                    INSERT INTO seats 
                    (event_id, seat_number, status) 
                    VALUES 
                    ($1, $2, 'AVAILABLE')`,
                    [eventId, seatNumber]
                );
                seatCounts++;
            }
        }
        console.log(`Inserted ${seatCounts} seats for event ID: ${eventId}`);
    }catch (error) {
        console.error("Error seeding database:", error);
    } finally {
        await pool.end();
        console.log("Database connection closed.");
    }
}

seedDataBase();