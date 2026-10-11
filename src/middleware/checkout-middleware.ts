import redisClient from "../config/redis.js";
import { Request, Response, NextFunction } from 'express';

export async function checkIdempotency(req:Request, res:Response, next:NextFunction){
    const key = req.headers['idempotency-key'];
    if(!key) {
        return res.status(400).json({error: 'Idempotency key is required'});
    }
    const redisKey = `idem:${key}`;
    try {
        const cacheResult =  await redisClient.get(redisKey);
        if(cacheResult){
            const {status, body} = JSON.parse(cacheResult);
            return res.status(status).json(body);
        }

        const originalJson = res.json.bind(res);
        res.json = (body: any) => {
            if(res.statusCode >= 200 && res.statusCode < 300){
                redisClient.setex(redisKey, 300, JSON.stringify({status: res.statusCode, body})).catch(console.error);
            }
            return  originalJson(body);
        }
        next();
    } catch (error) {
        next(error);
    }
        
}