import express from 'express';
import { bookingService } from '../services/bookingServices.js';


async function getAvailableSeatsHandler(
    req: express.Request<{eventId: string}>, 
    res: express.Response
) {
    const {eventId} = req.params;
    try {
        const availableSeats = await bookingService.getAvailableSeats(eventId);
        res.json(availableSeats);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        res.status(500).json({ error: errorMessage });
    }
}

async function holdSeatHandler(
    req: express.Request<Record<string,never>, Record<string,never>, {seatId: string}>,
    res: express.Response
) {
    const userId = '123e4567-e89b-12d3-a456-426614174000'
    const {seatId} = req.body;

    try {
        const updatedSeats = await bookingService.holdSeat(seatId, userId);
        res.json(updatedSeats);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        res.status(409).json({ error: errorMessage });
    }
}

export {getAvailableSeatsHandler, holdSeatHandler};