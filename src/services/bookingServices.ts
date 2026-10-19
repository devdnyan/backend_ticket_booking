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

    async holdSeat(seatId: string, userId: string, eventId: string) {
        try {
            const lockKey = `lock:seat${seatId}`
            const lock: Lock | null = await acquireLock(redisClient, lockKey, 600000);
            if(!lock) {
                throw new Error("Seat is currently booked by someone else. Please try again.");
            }try{
                const res = await seatRepository.reserveSeat(seatId, userId);
                redisClient.publish("eventUpdate", JSON.stringify({ eventId, seatId, status: "held" }));
                await queue.add('seatExpiry', { seatId, userId, eventId }, { delay: 600000 });
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

    async confirmSeat(seatId: string, userId: string) {
        try {
            const res = await seatRepository.confirmSeat(seatId, userId);
            if(res instanceof Error) {
                throw res;
            }
            // console.log("Publishing to redis")
            redisClient.publish("eventUpdate", JSON.stringify({ eventId: res.result.event_id, seatId, status: "booked" }));
        } catch (error) {
            throw new Error("ERROR: " + error);
        }
    }
    
}

export const bookingService = new BookingServices();