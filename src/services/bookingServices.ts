import { seatRepository } from "../respositories/seatRespositories.js";
import {acquireLock, releaseLock, type Lock} from "./lock.js"
import redisClient from "../config/redis.js"
import queue from "../config/queue.js";

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
            const lockKey = `lock:seat${seatId}`
            const lock: Lock | null = await acquireLock(redisClient, lockKey, 10000);
            if(!lock) {
                throw new Error("Seat is currently booked by someone else. Please try again.");
            }try{
                const res = await seatRepository.reserveSeat(seatId, userId);
                redisClient.publish("eventUpdate", JSON.stringify({ eventId: "bf723993-2079-4bf9-9ed1-23aaccd0cfbe", seatId, status: "held" }));
                await queue.add('seatExpiry', { seatId, userId }, { delay: 10000 });
                if(res instanceof Error) {
                    throw res;
                }
                return res;
            } 
            finally{
                await releaseLock(redisClient, lock);
            }
        } catch (error) {
            throw error;
        }
    }
    
}

export const bookingService = new BookingServices();