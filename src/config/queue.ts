import { Queue } from 'bullmq';

const queue = new Queue('SeatExpiryQueue', {
    connection: {
        host: process.env.REDIS_HOST ?? "localhost",
        port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
    }
})

export default queue;