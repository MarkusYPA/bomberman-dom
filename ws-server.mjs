import { createHash } from "crypto";
import Game from "./game.mjs";

const game = new Game();
const clients = new Map(); // socket -> { id, nickname }

function parseMessage(buffer) {
    const len = buffer[1] & 127;
    const maskStart = len === 126 ? 4 : len === 127 ? 10 : 2;
    const mask = buffer.slice(maskStart, maskStart + 4);
    const data = buffer.slice(maskStart + 4);
    const unmasked = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) {
        unmasked[i] = data[i] ^ mask[i % 4];
    }
    return unmasked.toString();
}

function encodeMessage(str) {
    const json = Buffer.from(str);
    const len = json.length;
    const header = len < 126
        ? Buffer.from([129, len])
        : Buffer.from([129, 126, (len >> 8) & 255, len & 255]);
    return Buffer.concat([header, json]);
}

function broadcast(obj) {
    const msg = encodeMessage(JSON.stringify(obj));
    for (const socket of clients.keys()) {
        try {
            socket.write(msg);
        } catch { }
    }
}

export function handleUpgrade(req, socket) {
    const key = req.headers["sec-websocket-key"];
    const hash = createHash("sha1")
        .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
        .digest("base64");

    socket.write(
        `HTTP/1.1 101 Switching Protocols\r\n` +
        `Upgrade: websocket\r\n` +
        `Connection: Upgrade\r\n` +
        `Sec-WebSocket-Accept: ${hash}\r\n\r\n`
    );

    let id = null;

    socket.on("data", (buffer) => {
        try {
            const msg = parseMessage(buffer);
            const obj = JSON.parse(msg);

            if (obj.type === "join") {
                if (clients.size >= 4) {
                    socket.end();
                    return;
                }

                id = Math.random().toString(36).slice(2, 10);
                clients.set(socket, { id, nickname: obj.nickname });
                const added = game.addPlayer(id, obj.nickname);
                if (!added) {
                    socket.end();
                }
            }

            if (obj.type === "input" && id) {
                game.handleInput(id, obj.payload);
            }

            if (obj.type === "chat" && id) {
                const sender = clients.get(socket)?.nickname || "???";
                broadcast({ type: "chat", nickname: sender, message: obj.message });
            }
        } catch (e) {
            console.error("Invalid WS data", e);
        }
    });

    socket.on("close", () => {
        if (id) game.removePlayer(id);
        clients.delete(socket);
    });

    socket.on("end", () => {
        if (id) game.removePlayer(id);
        clients.delete(socket);
    });
}

export function tickGame() {
    const state = { type: "state", payload: game.getState() };
    broadcast(state);
}
