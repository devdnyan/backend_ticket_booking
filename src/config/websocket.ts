import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import redisClient from "./redis.js";

interface EventWebSocket extends WebSocket {
    eventId?: string;
}

export default async function intitalWebsocketServer(httpServer: http.Server) {
    const wss = new WebSocketServer({ server: httpServer });

    wss.on("connection", (ws: WebSocket, req: http.IncomingMessage) => {
        const url = req.url;
        const eventId = url?.split("/")[2];

        const eventWebSocket = ws as EventWebSocket;
        eventWebSocket.eventId = eventId;

        eventWebSocket.on("message", (message) => {
            console.log(`Received message: ${message.toString()} for eventId: ${eventWebSocket.eventId}`);
        });
        
        eventWebSocket.on("close", () => {
            console.log(`Connection closed for eventId: ${eventId}`);
        }); 
    });

    await redisClient.subscribe("eventUpdate", (err, count) => {
        if (err) {
            console.error("Failed to subscribe: %s", err.message);
        } else {
            console.log(`Subscribed successfully! This client is currently subscribed to ${count} channels.`);
        }
    });

    redisClient.on("message", (channel, message) => {
        if (channel === "eventUpdate") {
            const payload = JSON.parse(message);
            wss.clients.forEach((client) => {
                const eventWebSocket = client as EventWebSocket;
                if (eventWebSocket.readyState === WebSocket.OPEN && eventWebSocket.eventId === payload.eventId) {
                    client.send(JSON.stringify({eventId: payload.eventId, seatId: payload.seatId, status: payload.status}));
                }
            });
        }
    });

    return wss;
}