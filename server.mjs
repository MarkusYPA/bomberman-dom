import { createServer } from 'http'
import { createReadStream, existsSync } from 'fs'
import { extname, join } from 'path'
import { handleUpgrade, tickGame } from './ws-messaging.mjs'

const mediaTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.mp3': 'audio/mpeg',
    '.ico': 'image/x-icon',
}

// Create server to handle incoming HTTP requests and serve static files from 'public'.
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

let miniGameIntervalId = null

export function startMiniGame(){
    if (!miniGameIntervalId) {
        miniGameIntervalId = setInterval(tickGame, 10)
    }
}

export function stopMiniGame() {
    if (miniGameIntervalId) {
        clearInterval(miniGameIntervalId)
        miniGameIntervalId = null
    }
}

// Start server side mini game loop right away
startMiniGame()

// Start server
//server.listen(3000, () => {
//    console.log('Server running at http://localhost:3000')
//})

// server.listen(3000, '0.0.0.0', () => {
//     console.log('Server running at http://0.0.0.0:3000')
// })

// Uncomment the following lines when deploying to a production environment
const PORT = process.env.PORT || 8080
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`)
})