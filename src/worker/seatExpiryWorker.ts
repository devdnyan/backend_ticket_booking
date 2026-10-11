import { Worker, Job } from "bullmq";
import { pool } from "./dbconfig.js";
import redisClient from "./redis.js";

const seatExpiryWorker = new Worker('SeatExpiryQueue', async (job) => {
    const { seatId, userId } = job.data;
    try {
        const result = await pool.query(
            `SELECT * 
                FROM seats 
                WHERE 
                    id = $1::uuid AND 
                    status = $2::seat_status AND
                    held_by_user_id = $3::uuid`,
            [seatId, 'HELD', userId]
        )
        if(!result.rows.length) {
            console.log(`Seat ${seatId} is not held or does not exist.`);
            return 'Booked';
        }
        await pool.query(
            `UPDATE seats 
                SET status = 'AVAILABLE',
                    held_by_user_id = NULL,
                    held_until = NULL 
                WHERE id = $1::uuid AND held_by_user_id = $2::uuid AND status = 'HELD'`,
            [seatId, userId]
        )
        console.log(`Seat ${seatId} has been released and is now available.`);
        return 'Released';
    } catch (error) {
        console.error(`Error occurred while releasing seat ${seatId}:`, error);
        throw error;
    }
}, 
    {
        connection: {
            host: 'localhost',
            port: 6379
        }
    }
)

seatExpiryWorker.on('completed', (job, result) => {
    const { seatId, userId } = job.data;
    if(result !== 'Booked') {
        redisClient.publish("eventUpdate", JSON.stringify({ eventId: "bf723993-2079-4bf9-9ed1-23aaccd0cfbe", seatId, status: 'Available' }));
        console.log(`Seat expiry job ${job.id} completed successfully for seat ${seatId} held by user ${userId}.`);
        return;
    }
    console.log(`Seat expiry job ${job.id} completed successfully for seat ${seatId} held by user ${userId}, but the seat was already booked.`);
});

seatExpiryWorker.on('failed', (_, err) => {
    console.error(`Error:`, err);
})
console.log("Running seat expiry worker...");
