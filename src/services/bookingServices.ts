import { seatRepository } from "../respositories/seatRespositories.js";

class BookingServices {
    async getAvailableSeats(eventId: string) {
        try {
            const result = await seatRepository.getAvailableSeats(eventId);
            return result;
        } catch (error) {
            throw error;
        }
    }

    async holdSeat(seatId: string, userId: string) {
        try {
            return await seatRepository.reserveSeat(seatId, userId);
        } catch (error) {
            throw error;
        }
    }
    
}

export const bookingService = new BookingServices();