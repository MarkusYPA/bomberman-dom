import { createServer } from 'http'
import { createReadStream, existsSync } from 'fs'
import { extname, join } from 'path'
import { handleUpgrade, tickGame } from './ws-server.mjs'
import { interval } from './config.mjs'

const mediaTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
}

const server = createServer((req, res) => {
    let filePath = req.url === '/' ? '/index.html' : req.url
    filePath = join('public', filePath)

    if (existsSync(filePath)) {
        const ext = extname(filePath)
        const contentType = mediaTypes[ext] || 'application/octet-stream'
        res.writeHead(200, { 'Content-Type': contentType })
        createReadStream(filePath).pipe(res)
    } else {
        res.writeHead(404)
        res.end('Not found')
    }
})

server.on('upgrade', handleUpgrade)

// Add error handling for the HTTP server
server.on('error', (err) => {
    console.error('Server error:', err.message)
})

// Handle unhandled errors to prevent crashes
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message)
    console.error(err.stack)
})

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// Server side game loop. Starts running from the get go.
let miniGameIntervalId = setInterval(tickGame, interval)

export function stopMiniGame() {
    //console.log("stopping minigame", miniGameIntervalId)
    if (miniGameIntervalId) {
        clearInterval(miniGameIntervalId)
        miniGameIntervalId = null
    }
}

server.listen(3000, () => {
    console.log('Server running at http://localhost:3000')
})
