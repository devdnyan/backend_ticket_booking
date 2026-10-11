import express from 'express';
import { confirmSeatHandler, getAvailableSeatsHandler, holdSeatHandler } from '../controllers/bookingController.js';
import { checkIdempotency } from '../middleware/checkout-middleware.js';

const bookingRoutes = express.Router();

bookingRoutes.get('/events/:eventId', getAvailableSeatsHandler);
bookingRoutes.post('/hold-seat', holdSeatHandler);
bookingRoutes.post('/confirm-seat', checkIdempotency, confirmSeatHandler);

export default bookingRoutes;