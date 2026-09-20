import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import eventBus from "./eventBus.js";

interface EventWebSocket extends WebSocket {
    eventId?: string;
}

export default function intitalWebsocketServer(httpServer: http.Server) {
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

    eventBus.on("eventUpdate", (payload)=> {
        for (const client of wss.clients) {
            const eventClient = client as EventWebSocket;
            if (eventClient.eventId === payload.eventId && eventClient.readyState === WebSocket.OPEN) {
                eventClient.send(JSON.stringify(payload));
            }
        }
    })

    return wss;
}