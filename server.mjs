import { createServer } from "http";
import { createReadStream } from "fs";
import { handleUpgrade, tickGame } from "./ws-server.mjs";
import { interval } from "./config.mjs";

const server = createServer((req, res) => {
    // Helper function to safely serve files with error handling
    const serveFile = (filePath, contentType) => {
        const stream = createReadStream(filePath);
        stream.on("error", (err) => {
            console.error(`Error reading file ${filePath}:`, err.message);
            if (!res.headersSent) {
                res.writeHead(500);
                res.end("Internal Server Error");
            }
        });
        res.writeHead(200, { "Content-Type": contentType });
        stream.pipe(res);
    };

    switch (req.url) {
        case "/":
        case "/index.html":
            serveFile("public/index.html", "text/html");
            break;
        case "/client.js":
            serveFile("public/client.js", "application/javascript");
            break;
        case "/style.css":
            serveFile("public/style.css", "text/css");
            break;
        case "/app.js":
            serveFile("public/app.js", "application/javascript");
            break;
        case req.url.startsWith("/framework/") && req.url:
            serveFile("public" + req.url, "application/javascript");
            break;
        default:
            res.writeHead(404);
            res.end("Not found");
    }
});

server.on("upgrade", handleUpgrade);

// Add error handling for the HTTP server
server.on("error", (err) => {
    console.error("Server error:", err.message);
});

// Handle unhandled errors to prevent crashes
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err.message);
    console.error(err.stack);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

setInterval(tickGame, interval);

server.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});
