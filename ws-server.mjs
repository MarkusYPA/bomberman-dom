import { createHash } from "crypto";
import Game from "./game.mjs";

const game = new Game();
const clients = new Map(); // socket -> { id, nickname }
const heldInputs = new Map(); // id -> Set of held directions

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
        let offset = 0;
        while (offset < buffer.length) {
            try {
                // Parse one frame starting at offset
                const fin = (buffer[offset] & 0x80) !== 0;
                const opcode = buffer[offset] & 0x0f;
                if (opcode !== 1) break; // Only handle text frames

                let len = buffer[offset + 1] & 127;
                let maskStart = offset + 2;
                if (len === 126) {
                    len = buffer.readUInt16BE(offset + 2);
                    maskStart = offset + 4;
                } else if (len === 127) {
                    // Not supporting >65535 payloads for simplicity
                    break;
                }
                const mask = buffer.slice(maskStart, maskStart + 4);
                const dataStart = maskStart + 4;
                const dataEnd = dataStart + len;
                if (dataEnd > buffer.length) break; // Incomplete frame

                const data = buffer.slice(dataStart, dataEnd);
                const unmasked = Buffer.alloc(data.length);
                for (let i = 0; i < data.length; i++) {
                    unmasked[i] = data[i] ^ mask[i % 4];
                }
                const msg = unmasked.toString();
                const obj = JSON.parse(msg);

                if (obj.type === "join") {
                    if (clients.size >= 4) {
                        // Send server full message before closing
                        const fullMsg = encodeMessage(JSON.stringify({
                            type: "error",
                            message: "Server is full (4/4 players). Please try again later."
                        }));
                        socket.write(fullMsg);
                        setTimeout(() => socket.end(), 100); // Small delay to ensure message is sent
                        return;
                    }

                    // Find first available ID between 1-4
                    const usedIds = new Set([...clients.values()].map(client => client.id));
                    for (let i = 1; i <= 4; i++) {
                        if (!usedIds.has(i)) {
                            id = i;
                            break;
                        }
                    }
                    
                    // Update game dimensions if provided
                    if (obj.dimensions) {
                        game.setDimensions(obj.dimensions.width, obj.dimensions.height);
                    }
                    
                    clients.set(socket, { id, nickname: obj.nickname });
                    const added = game.addPlayer(id, obj.nickname);
                    if (!added) {
                        // Send error message if game couldn't add player
                        const errorMsg = encodeMessage(JSON.stringify({
                            type: "error",
                            message: "Failed to join game. Please try again."
                        }));
                        socket.write(errorMsg);
                        setTimeout(() => socket.end(), 100);
                        return;
                    }
                    heldInputs.set(id, new Set());
                }

                if (obj.type === "updateDimensions" && id) {
                    // Update game dimensions when screen size changes
                    if (obj.dimensions) {
                        game.setDimensions(obj.dimensions.width, obj.dimensions.height);
                    }
                }

                if (obj.type === "input" && id) {
                    // obj.payload is an array of held directions
                    heldInputs.set(id, new Set(obj.payload));
                }

                if (obj.type === "chat" && id) {
                    const sender = clients.get(socket)?.nickname || "???";
                    broadcast({ type: "chat", nickname: sender, playerId: id, message: obj.message });
                }

                offset = dataEnd;
            } catch (e) {
                console.error("Invalid WS data", e);
                break;
            }
        }
    });

    socket.on("close", () => {
        if (id) {
            game.removePlayer(id);
            heldInputs.delete(id);
        }
        clients.delete(socket);
    });

    socket.on("end", () => {
        if (id) {
            game.removePlayer(id);
            heldInputs.delete(id);
        }
        clients.delete(socket);
    });

    // Handle socket errors (like ECONNRESET) to prevent crashes
    socket.on("error", (err) => {
        console.log(`Socket error: ${err.code} - ${err.message}`);
        if (id) {
            game.removePlayer(id);
            heldInputs.delete(id);
        }
        clients.delete(socket);
    });
}

export function tickGame() {
    // Move players based on held inputs
    for (const [id, held] of heldInputs.entries()) {
        game.handleInput(id, held);
    }
    const state = { type: "state", payload: game.getState() };
    broadcast(state);
}
