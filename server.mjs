import { createServer } from "http";
import { createReadStream } from "fs";
import { handleUpgrade, tickGame } from "./ws-server.mjs";
import { interval } from "./config.mjs";

const server = createServer((req, res) => {
    switch (req.url) {
        case "/":
        case "/index.html":
            res.writeHead(200, { "Content-Type": "text/html" });
            createReadStream("public/index.html").pipe(res);
            break;
        case "/client.js":
            res.writeHead(200, { "Content-Type": "application/javascript" });
            createReadStream("public/client.js").pipe(res);
            break;
        case "/style.css":
            res.writeHead(200, { "Content-Type": "text/css" });
            createReadStream("public/style.css").pipe(res);
            break;
        case "/app.js":
            res.writeHead(200, { "Content-Type": "application/javascript" });
            createReadStream("public/app.js").pipe(res);
            break;
        case req.url.startsWith("/framework/") && req.url:
            res.writeHead(200, { "Content-Type": "application/javascript" });
            createReadStream("public" + req.url).pipe(res);
            break;
        default:
            res.writeHead(404);
            res.end("Not found");
    }
});

server.on("upgrade", handleUpgrade);

setInterval(tickGame, interval);

server.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});
