import express from 'express';
import { getAvailableSeatsHandler, holdSeatHandler } from '../controllers/bookingController.js';

const bookingRoutes = express.Router();

bookingRoutes.get('/events/:eventId', getAvailableSeatsHandler);
bookingRoutes.post('/hold-seat', holdSeatHandler);

export default bookingRoutes;