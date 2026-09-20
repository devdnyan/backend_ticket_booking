import { Redis } from 'ioredis';

const redisClient = new Redis({
    host: 'localhost',
    port: 6379
})

console.log("Connected to Redis server successfully.");

export default redisClient;