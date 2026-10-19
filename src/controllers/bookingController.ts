import express from 'express';
import { bookingService } from '../services/bookingServices.js';
import { mockPayment } from '../services/paymentMocker.js';

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
    req: express.Request<Record<string,never>, Record<string,never>, {seatId: string, eventId: string}>,
    res: express.Response
) {
    const userId = '123e4567-e89b-12d3-a456-426614174000'
    const {seatId, eventId} = req.body;

    try {
        const updatedSeats = await bookingService.holdSeat(seatId, userId, eventId);
        res.json(updatedSeats);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        res.status(409).json({ error: errorMessage });
    }
}

async function confirmSeatHandler(
    req: express.Request<Record<string,never>, Record<string,never>, {seatId: string, fail: boolean}>,
    res: express.Response
){
    const userId = '123e4567-e89b-12d3-a456-426614174000'
    const {seatId, fail} = req.body;

    try {
        await mockPayment.checkout(userId, fail);
        await bookingService.confirmSeat(seatId, userId);
        res.json({message: "Seat confirmed successfully"});
    }catch(error){
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        res.status(400).json({ error: errorMessage });
    }

}

export {getAvailableSeatsHandler, holdSeatHandler, confirmSeatHandler};