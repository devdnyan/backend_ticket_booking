import { Redis } from 'ioredis';

const redisClient = new Redis({
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
})

console.log("Connected to Redis server successfully.");

export default redisClient;