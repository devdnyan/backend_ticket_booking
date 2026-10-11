import { stat } from 'node:fs';
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
        console.log('calling reserve seat')
        try {
            //Begin
            await client.query('BEGIN');
            // Lock the seat row for update to prevent race conditions
            const res = await client.query(`
                SELECT * FROM seats 
                WHERE id = $1 AND status = 'AVAILABLE' 
                FOR UPDATE`
                , [seatId]);
            if(res.rows.length === 0) {
                throw new Error('Seat not available');
            }
            // Update the seat status to 'HELD' and set the held_by_user_id and held_until fields
            const result = await client.query(`
                UPDATE seats 
                SET status = 'HELD', held_by_user_id = $1, held_until = Now() + INTERVAL '10 minutes' 
                WHERE id = $2
                RETURNING *`, 
                [userId, seatId]);
            // const result = await client.query(`SELECT * FROM seats WHERE id = $1`, [seatId]);
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

    async confirmSeat(seatId: string, userId: string) {
        const client = await pool.connect();
        try{
            await client.query('BEGIN');
            const res = await client.query(`
                SELECT * 
                FROM 
                SEATS 
                WHERE id = $1 AND STATUS = 'HELD' AND held_by_user_id = $2 
                FOR UPDATE
                `, [seatId, userId]
            );
            if(res.rows.length === 0) {
                throw new Error('Seat not held by this user or not available for confirmation');
            }
            let result = await client.query(`
                UPDATE seats
                SET status = 'BOOKED', held_until = NULL, held_by_user_id = NULL
                WHERE id = $1
                RETURNING *
                `,
            [seatId]);
            if(result.rows.length === 0) {
                throw new Error('Error confirming seat at Seats table');
            }
            result = await client.query(`
                INSERT INTO 
                bookings 
                (seat_id, user_id, event_id, status) VALUES ($1, $2, $3, 'CONFIRMED')
                RETURNING *
                `, 
                [seatId, userId, result.rows[0].event_id]
            );
            return {result : result.rows[0], message: "Seat confirmed successfully"};
        }catch(error){
            await client.query('ROLLBACK');
            throw new Error('Error confirming seat: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            await client.query('COMMIT');
            client.release();
        }
    }
}

export const seatRepository = new seatRepositories();
