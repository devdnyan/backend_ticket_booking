import {pool} from '../config/database.js'

class seatRepositories{

    async getAvailableSeats(eventId: string) {
        const query = `
            SELECT * FROM seats WHERE status = 'AVAILABLE' AND event_id = $1
        `
        try {
            const result = await pool.query(query, [eventId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async reserveSeat(seatId: string, userId: string) {
        const client = await pool.connect();
        try {
            //Begin
            await client.query('BEGIN');
            // Lock the seat row for update to prevent race conditions
            const res = await client.query(`SELECT * FROM seats WHERE id = $1 AND status = 'AVAILABLE' FOR UPDATE`, [seatId]);
            if(res.rows.length === 0) {
                throw new Error('Seat not available');
            }
            // Update the seat status to 'HELD' and set the held_by_user_id and held_until fields
            await client.query(`UPDATE seats SET status = 'HELD', held_by_user_id = $1, held_until = Now() + INTERVAL '10 minutes' WHERE id = $2`, [userId, seatId]);
            const result = await client.query(`SELECT * FROM seats WHERE id = $1`, [seatId]);
            // Commit the transaction
            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

export const seatRepository = new seatRepositories();
