import crypto from "crypto";
import {Redis} from "ioredis";

const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`;

const EXTEND_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("PEXPIRE", KEYS[1], ARGV[2])
else
  return 0
end
`;

export interface AcquireLockOptions {
  retries?: number;
  retryDelayMs?: number;
}

export interface Lock {
    key: string;
    token: string;
    ttlMs: number;
}

export async function acquireLock(
    redisClient: Redis, 
    key: string, 
    ttlMs: number, 
    {retries = 1, retryDelayMs = 100}: AcquireLockOptions = {}) : 
    Promise<Lock | null> {
        const token = crypto.randomUUID();

        for (let i = 0; i < retries; i++) {
            const ok = await redisClient.set(key, token, "PX", ttlMs, "NX");
            if (ok === "OK") return { key, token, ttlMs };
            if(i < retries - 1) await new Promise<void>((resolve) => setTimeout(resolve, retryDelayMs));
        }
    return null;
}

export async function releaseLock(redisClient: Redis, lock: Lock) : Promise<boolean> {
    const result = await redisClient.eval(RELEASE_SCRIPT, 1, lock.key, lock.token);
    return result === 1;
}