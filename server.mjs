import { createServer } from "http";
import { createReadStream } from "fs";
import { handleUpgrade, tickGame } from "./ws-server.mjs";

const server = createServer((req, res) => {
    if (req.url === "/" || req.url === "/index.html") {
        res.writeHead(200, { "Content-Type": "text/html" });
        createReadStream("public/index.html").pipe(res);
    } else if (req.url === "/client.js") {
        res.writeHead(200, { "Content-Type": "application/javascript" });
        createReadStream("public/client.js").pipe(res);
    } else if (req.url === "/style.css") {
        res.writeHead(200, { "Content-Type": "text/css" });
        createReadStream("public/style.css").pipe(res);
    } else {
        res.writeHead(404);
        res.end("Not found");
    }
});

server.on("upgrade", handleUpgrade);

setInterval(tickGame, 50);

server.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});
