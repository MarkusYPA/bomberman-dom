const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const Game = require("./game");

const game = new Game();
const clients = new Map(); // socket -> id

function parseWebSocketMessage(buffer) {
    const secondByte = buffer[1];
    const length = secondByte & 127;
    let maskStart = 2;
    if (length === 126) maskStart = 4;
    else if (length === 127) maskStart = 10;

    const mask = buffer.slice(maskStart, maskStart + 4);
    const data = buffer.slice(maskStart + 4);
    const unmasked = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) {
        unmasked[i] = data[i] ^ mask[i % 4];
    }
    return unmasked.toString();
}

function createWebSocketMessage(str) {
    const json = Buffer.from(str);
    const length = json.length;
    const header = length < 126
        ? Buffer.from([129, length])
        : Buffer.from([129, 126, (length >> 8) & 255, length & 255]);
    return Buffer.concat([header, json]);
}

const server = http.createServer((req, res) => {
    if (req.url === "/" || req.url === "/index.html") {
        res.writeHead(200, { "Content-Type": "text/html" });
        fs.createReadStream("public/index.html").pipe(res);
    } else if (req.url === "/client.js") {
        res.writeHead(200, { "Content-Type": "application/javascript" });
        fs.createReadStream("public/client.js").pipe(res);
    } else if (req.url === "/style.css") {
        res.writeHead(200, { "Content-Type": "text/css" });
        fs.createReadStream("public/style.css").pipe(res);
    } else {
        res.writeHead(404);
        res.end("Not found");
    }
});

server.on("upgrade", (req, socket) => {
    if (req.headers["upgrade"] !== "websocket") {
        socket.end("HTTP/1.1 400 Bad Request");
        return;
    }

    const key = req.headers["sec-websocket-key"];
    const hash = crypto
        .createHash("sha1")
        .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
        .digest("base64");

    socket.write(
        `HTTP/1.1 101 Switching Protocols\r\n` +
        `Upgrade: websocket\r\n` +
        `Connection: Upgrade\r\n` +
        `Sec-WebSocket-Accept: ${hash}\r\n\r\n`
    );

    const id = Math.random().toString(36).slice(2, 10);
    clients.set(socket, id);
    game.addPlayer(id);

    socket.on("data", (buffer) => {
        try {
            const msg = parseWebSocketMessage(buffer);
            const obj = JSON.parse(msg);
            if (obj.type === "input") {
                game.handleInput(id, obj.payload);
            }
        } catch (e) {
            console.error("Invalid WS data", e);
        }
    });

    socket.on("close", () => {
        game.removePlayer(id);
        clients.delete(socket);
    });

    socket.on("end", () => {
        game.removePlayer(id);
        clients.delete(socket);
    });
});

setInterval(() => {
    const state = JSON.stringify({ type: "state", payload: game.getState() });
    const frame = createWebSocketMessage(state);
    for (const socket of clients.keys()) {
        try {
            socket.write(frame);
        } catch { }
    }
}, 50);

server.listen(3000, () => {
    console.log("Raw WebSocket server running at http://localhost:3000");
});
