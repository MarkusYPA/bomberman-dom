import { createHash } from "crypto";
import Game from "./game.mjs";
import { stopMiniGame } from "./server.mjs";
import { startSequence } from "./bm-server/game.js";

const game = new Game();
const clients = new Map(); // socket -> { id, nickname }
export const heldInputs = new Map(); // id -> Set of held directions

let countdownTimer = null;
let countdown = 10;

function encodeMessage(str) {
    const json = Buffer.from(str);
    const len = json.length;
    const header = len < 126
        ? Buffer.from([129, len])
        : Buffer.from([129, 126, (len >> 8) & 255, len & 255]);
    return Buffer.concat([header, json]);
}

// JSON.stringify doesn't serialize Maps and Sets by default, this helps
function replacer(key, value) {
    if (value instanceof Map) {
        return Object.fromEntries(value);
    }
    if (value instanceof Set) {
        return Array.from(value);
    }
    return value;
}

export function broadcast(obj) {
    const msg = encodeMessage(JSON.stringify(obj, replacer));
    for (const socket of clients.keys()) {
        try {
            socket.write(msg);
        } catch { }
    }
}

function resetCountdown() {
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
    broadcast({ type: "countdown", time: null });
}

function startCountdown() {
    resetCountdown();
    let timeLeft = countdown;

    countdownTimer = setInterval(() => {
        if (timeLeft > 0) {
            broadcast({ type: "countdown", time: timeLeft });
            timeLeft--;
        } else {
            clearInterval(countdownTimer);
            countdownTimer = null;
            broadcast({ type: "countdownFinished" }); // Notify clients that countdown is finished

            // stop minigame and start bomberman
            stopMiniGame();
            startSequence(clients);
        }
    }, 1000);
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
    let pingInterval = null;
    let lastPongTime = Date.now();

    // Set up ping/pong heartbeat to detect disconnected clients
    const startHeartbeat = () => {
        pingInterval = setInterval(() => {
            //todo: check if 30 seconds pong timeout is appropriate
            if (Date.now() - lastPongTime > 30000) { // 30 seconds timeout
                console.log(`Client ${id} timeout - closing connection`);
                socket.destroy();
                return;
            }

            // Send ping frame (opcode 9)
            try {
                const pingFrame = Buffer.from([0x89, 0x00]); // Ping with no payload
                socket.write(pingFrame);
            } catch (err) {
                console.log(`Failed to send ping to client ${id}: ${err.message}`);
                socket.destroy();
            }
        }, 10000); // Ping every 10 seconds
        //todo: check if 10 seconds ping timeout is appropriate
    };

    const cleanup = () => {
        if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
        }
        if (id) {
            game.removePlayer(id);
            heldInputs.delete(id);
            const sender = clients.get(socket)?.nickname || "???";
            if (sender && sender !== "???") {
                broadcast({ type: "chat", nickname: sender, playerId: id, message: sender + " left the game!" });
            }
        }
        clients.delete(socket);
    };

    socket.on("data", (buffer) => {
        let offset = 0;
        while (offset < buffer.length) {
            try {
                const fin = (buffer[offset] & 0x80) !== 0;
                const opcode = buffer[offset] & 0x0f;

                // Handle pong frames (opcode 10)
                if (opcode === 10) {
                    lastPongTime = Date.now();
                    offset += 2; // Skip pong frame
                    continue;
                }

                if (opcode !== 1) break; // Only handle text frames

                let len = buffer[offset + 1] & 127;
                let maskStart = offset + 2;
                if (len === 126) {
                    len = buffer.readUInt16BE(offset + 2);
                    maskStart = offset + 4;
                } else if (len === 127) {
                    break;
                }
                const mask = buffer.slice(maskStart, maskStart + 4);
                const dataStart = maskStart + 4;
                const dataEnd = dataStart + len;
                if (dataEnd > buffer.length) break;

                const data = buffer.slice(dataStart, dataEnd);
                const unmasked = Buffer.alloc(data.length);
                for (let i = 0; i < data.length; i++) {
                    unmasked[i] = data[i] ^ mask[i % 4];
                }
                const msg = unmasked.toString();
                const obj = JSON.parse(msg);

                if (obj.type === "join") {
                    if (clients.size >= 4) {
                        const fullMsg = encodeMessage(JSON.stringify({
                            type: "error",
                            message: "Server is full (4/4 players). Please try again later."
                        }));
                        socket.write(fullMsg);
                        setTimeout(() => socket.end(), 100);
                        return;
                    }

                    // Check for duplicate nickname
                    const usedNicknames = new Set([...clients.values()].map(client => client.nickname.toLowerCase()));
                    if (usedNicknames.has(obj.nickname.toLowerCase())) {
                        // Send duplicate name error message but keep connection open
                        const duplicateMsg = encodeMessage(JSON.stringify({
                            type: "duplicateNickname",
                            message: `Nickname "${obj.nickname}" is already taken. Please choose a different name.`
                        }));
                        socket.write(duplicateMsg);
                        return; // Don't close connection, just return and wait for new join attempt
                    }

                    // Find first available ID between 1-4
                    const usedIds = new Set([...clients.values()].map(client => client.id));
                    for (let i = 1; i <= 4; i++) {
                        if (!usedIds.has(i)) {
                            id = i;
                            break;
                        }
                    }

                    clients.set(socket, { id, nickname: obj.nickname });
                    const added = game.addPlayer(id, obj.nickname);
                    if (!added) {
                        const errorMsg = encodeMessage(JSON.stringify({
                            type: "error",
                            message: "Failed to join game. Please try again."
                        }));
                        socket.write(errorMsg);
                        setTimeout(() => socket.end(), 100);
                        return;
                    }
                    heldInputs.set(id, new Set());

                    // Send the assigned player id to the client
                    const idMsg = encodeMessage(JSON.stringify({
                        type: "playerId",
                        id
                    }));
                    socket.write(idMsg);

                    // Reset countdown whenever the number of players changes
                    updateCountdown();

                    // Start heartbeat after successful join
                    startHeartbeat();

                    const sender = clients.get(socket)?.nickname || "???";
                    broadcast({ type: "chat", nickname: sender, playerId: id, message: sender + " joined the game!" });
                }

                if (obj.type === "input" && id) {
                    // obj.payload is an object of booleans
                    heldInputs.set(id, obj.payload);
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
        console.log(`Socket closed for client ${id}`);
        cleanup();

        // Reset countdown whenever the number of players changes
        updateCountdown();
    });

    socket.on("end", () => {
        console.log(`Socket ended for client ${id}`);
        cleanup();

        // Reset countdown whenever the number of players changes
        updateCountdown();
    });

    // Handle socket errors (like ECONNRESET) to prevent crashes
    socket.on("error", (err) => {
        console.log(`Socket error for client ${id}: ${err.code} - ${err.message}`);
        cleanup();

        // Reset countdown whenever the number of players changes
        updateCountdown();
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

function updateCountdown() {
    if (clients.size >= 2) {
        startCountdown();
    } else {
        resetCountdown();
    }
}