import { mount } from './framework/mini.js'
import { state } from './framework/state.js'
import { setMoving, setPlayerId, startSequenceClient, stopSequenceClient } from './bomberman/runGame.js'
import { clientGameState, setPoints, updateClientGameState } from './shared/state.js'
import { CountdownComponent } from './app.js'
import { LobbyTimerComponent } from './app.js'
import { endGraphic } from './bomberman/endGraphics.js'

let box // game area
let ws // WebSocket connection
let nickname
let firstState = true

// Function to create beautiful nickname modal
function createNicknameModal() {
    return new Promise((resolve) => {
        // Create modal overlay
        const overlay = document.createElement('div')
        overlay.className = 'nickname-modal-overlay'

        // Create modal content
        const modal = document.createElement('div')
        modal.className = 'nickname-modal'

        // Modal content HTML
        modal.innerHTML = `
            <h2>Enter Player Name</h2>
            <p>Choose a nickname to identify yourself in the game terminal. Maximum 12 characters allowed.</p>
            <input type="text" class="nickname-input" placeholder="PLAYER_NAME" maxlength="12" autocomplete="off">
            <div class="character-count">0/12 characters</div>
            <div class="nickname-modal-buttons">
                <button type="button" class="cancel-btn">Cancel</button>
                <button type="button" class="primary confirm-btn">Connect</button>
            </div>
        `

        const input = modal.querySelector('.nickname-input')
        const charCount = modal.querySelector('.character-count')
        const confirmBtn = modal.querySelector('.confirm-btn')
        const cancelBtn = modal.querySelector('.cancel-btn')

        // Update character count
        function updateCharCount() {
            const length = input.value.length
            charCount.textContent = `${length}/12 characters`
            charCount.style.color = length >= 10 ? '#ff4444' : '#ff8c00'
        }

        // Handle input events
        input.addEventListener('input', updateCharCount)
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                resolve(input.value.trim().slice(0, 12))
                document.body.removeChild(overlay)
            }
        })

        // Handle button clicks
        confirmBtn.addEventListener('click', () => {
            const nickname = input.value.trim()
            if (nickname) {
                resolve(nickname.slice(0, 12))
                document.body.removeChild(overlay)
            } else {
                input.focus()
                input.style.borderColor = '#ff4444'
                setTimeout(() => {
                    input.style.borderColor = '#8b4513'
                }, 1000)
            }
        })

        cancelBtn.addEventListener('click', () => {
            resolve('Player') // Default nickname if cancelled
            document.body.removeChild(overlay)
        })

        // Add to DOM and focus
        overlay.appendChild(modal)
        document.body.appendChild(overlay)

        // Focus input after a short delay to ensure modal is rendered
        setTimeout(() => {
            input.focus()
            input.select()
        }, 100)

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                resolve('Player') // Default nickname
                document.body.removeChild(overlay)
            }
        })
    })
}

// Function to show error messages elegantly
function showErrorMessage(message) {
    const errorContainer = document.getElementById('error-container')
    if (errorContainer) {
        const errorDiv = document.createElement('div')
        errorDiv.className = 'error-message'
        errorDiv.textContent = message
        errorContainer.appendChild(errorDiv)

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv)
            }
        }, 5000)
    } else {
        // Fallback to alert if error container not found
        alert(message)
    }
}

function updateCountdown() {
    const countdownElement = document.getElementById('countdown-container')
    if (countdownElement) {
        mount(countdownElement, CountdownComponent())
    }
}

function updateLobbyTimer() {
    const lobbyElement = document.getElementById('lobby-timer-container')
    if (lobbyElement) {
        mount(lobbyElement, LobbyTimerComponent())
    }
}

// Function to show new message indicator
function showNewMessageIndicator() {
    const chatBox = document.getElementById('chat')
    let indicator = document.getElementById('new-message-indicator')

    // Create indicator if it doesn't exist
    if (!indicator) {
        indicator = document.createElement('div')
        indicator.id = 'new-message-indicator'
        indicator.className = 'new-message-indicator'
        indicator.textContent = '↓ New messages ↓'
        indicator.onclick = () => {
            chatBox.scrollTop = chatBox.scrollHeight
            indicator.remove()
        }
        chatBox.appendChild(indicator) // Append to chat-box instead of chat-area
    }

    // Reset the fade-out timer
    clearTimeout(indicator.fadeTimer)
    indicator.style.opacity = '1'

    // Auto-fade after 3 seconds
    indicator.fadeTimer = setTimeout(() => {
        if (indicator.parentNode) {
            indicator.style.opacity = '0.7'
        }
    }, 3000)
}

// Track held keys
const held = new Set()
const keyMap = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ' ': 'bomb',
    Space: 'bomb'          // some browsers use 'Space'
}
const allKeys = ['left', 'right', 'up', 'down', 'bomb']

function sendHeld() {
    // create and send object of booleans from set
    const payload = {}
    for (const key of allKeys) {
        payload[key] = held.has(key)
    }
    ws.send(JSON.stringify({ type: 'input', payload }))
}

document.addEventListener('keydown', (e) => {
    if (keyMap[e.key]) {
        const action = keyMap[e.key]
        if (!held.has(action)) {
            held.add(action)
            sendHeld()
        }
        if (action === 'left' || action === 'right' || action === 'up' || action === 'down') {
            setMoving(true)
        }
    }
})

document.addEventListener('keyup', (e) => {
    if (keyMap[e.key]) {
        if (held.has(keyMap[e.key])) {
            held.delete(keyMap[e.key])
            sendHeld()
        }
        if (!(held.has('left') || held.has('right') || held.has('up') || held.has('down'))) {
            setMoving(false)
        }
    }
})
function updatePoints(points) {
    // update points in clientGameState
    setPoints(points)
    // Remove players from state.players that aren't in clientGameState.points
    for (const id of Object.keys(state.players)) {
        if (!(id in clientGameState.points)) {
            delete state.players[id]
        }
    }
    // update points in framework state to trigger scoreboard re-render
    for (const[id, points] of Object.entries(clientGameState.points)){
        if (state.players && state.players[id]) {
            state.players[id].points = points
        }
    }    
}

export async function startClient() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'New session')
    }
    nickname = await createNicknameModal()
    ws = new WebSocket(`ws://${location.host}`)

    ws.addEventListener('open', () => {
        ws.send(JSON.stringify({
            type: 'join',
            nickname: nickname,
        }))
    })




    ws.addEventListener('message', (e) => {
        const msg = JSON.parse(e.data)
        if (msg.type === 'lobby') {
            state.lobbyTime = msg.time
            updateLobbyTimer()
        } else if (msg.type === 'lobbyFinished') {
            state.lobbyTime = null
            updateLobbyTimer()
        } else if (msg.type === 'countdown') {
            state.countdownTime = msg.time
            updateCountdown()
        } else if (msg.type === 'countdownFinished') {
            state.screen = 'game' // Switch to game screen
            state.countdownTime = null
            updateCountdown()
        } else if (msg.type === 'state') {  // for mini game
            // Only update on changes. Keep player points, payload doesn't contain them.
            if (JSON.stringify(state.players) !== JSON.stringify(msg.payload)) {
                // Remove players not present in msg.payload
                for (const id of Object.keys(state.players)) {
                    if (!(id in msg.payload)) {
                        delete state.players[id]
                    }
                }                
                for (const [id, playerInfo] of Object.entries(msg.payload)) {
                    if (state.players[id]) {
                        for (const [key, val] of Object.entries(playerInfo)) {
                            state.players[id][key] = val
                        }
                    } else {
                        state.players[id] = playerInfo
                    }
                }

                if (firstState) {
                    ws.send(JSON.stringify({ type: 'requestPoints' }))
                    firstState = false
                }

                renderMiniGame(msg.payload)
            }
        } else if (msg.type === 'chat') {
            const chatBox = document.getElementById('chat')
            if (chatBox) {
                chatBox.scrollTop = chatBox.scrollHeight
            }

            // Check if user is at the bottom before adding message
            const isAtBottom = chatBox.scrollHeight - chatBox.clientHeight <= chatBox.scrollTop + 1

            // Create message container
            const messageDiv = document.createElement('div')
            const isOwnMessage = msg.nickname === nickname
            messageDiv.className = `chat-message ${isOwnMessage ? 'own' : 'other'}`

            // Create sender name (only show for other people's messages)
            if (!isOwnMessage) {
                const senderDiv = document.createElement('div')
                senderDiv.className = 'message-sender'
                senderDiv.textContent = msg.nickname
                messageDiv.appendChild(senderDiv)
            }

            // Create message bubble with player color
            const bubbleDiv = document.createElement('div')
            bubbleDiv.className = `message-bubble player-color-${msg.playerId}`
            bubbleDiv.textContent = msg.message
            messageDiv.appendChild(bubbleDiv)

            // Create timestamp
            const timestampDiv = document.createElement('div')
            timestampDiv.className = 'message-timestamp'
            const now = new Date()
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            timestampDiv.textContent = timeString

            messageDiv.appendChild(timestampDiv)

            chatBox.appendChild(messageDiv)

            if (isAtBottom) {
            // User was at bottom, auto-scroll to show new message
                chatBox.scrollTop = chatBox.scrollHeight
            } else {
            // User is reading older messages, show new message indicator
                showNewMessageIndicator()
            }
        } else if (msg.type === 'duplicateNickname') {
        // Show error message and prompt for new nickname
            showErrorMessage(msg.message)
            // Prompt user to enter a different nickname
            createNicknameModal().then(newNickname => {
                ws.send(JSON.stringify({
                    type: 'join',
                    nickname: newNickname,
                }))
            })
        } else if (msg.type === 'error') {
        // Display error message to user
            showErrorMessage(msg.message)
        } else if (msg.type === 'startgame') {
            updateClientGameState(msg.payload)
            // Ensure box is assigned to the game area element before using it
            box = document.getElementById('game')
            if (box) {
                box.innerHTML = ''
            }
            startSequenceClient()
        } else if (msg.type === 'gamestate') {
            updateClientGameState(msg.payload)
        } else if (msg.type === 'playerId') {
            setPlayerId(msg.id)
        } else if (msg.type === 'endgame') {
            endGraphic(msg.winner)
            updatePoints(msg.points)
        } else if (msg.type === 'back to lobby') {
            box.innerHTML = ''          // clear main game graphics
            box.className = 'game-area' // restore default class
            stopSequenceClient()
        } else if (msg.type === 'points') {
            //console.log('incoming points:', msg)
            if (state.players) {
                updatePoints(msg.points)
            }
        }
    })

    // Handle WebSocket close event
    ws.addEventListener('close', (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason)
        showErrorMessage('Connection lost. Please refresh the page to reconnect.')
    })

    // Handle WebSocket error event  
    ws.addEventListener('error', (error) => {
        console.error('WebSocket error:', error)
        showErrorMessage('Connection error occurred. Please check your internet connection.')
    })

    // Add beforeunload event to properly close connection when page is unloaded
    window.addEventListener('beforeunload', () => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'Page unload') // Normal closure
        }
    })
}
function renderMiniGame(players) {
    const areaId = state.screen === 'lobby' ? 'lobby' : 'game'
    const box = document.getElementById(areaId)
    if (!box) return

    box.innerHTML = ''
    for (const id in players) {
        const p = players[id]
        const d = document.createElement('div')
        d.className = `player player-color-${id}`
        d.style.left = `${p.x * 20}px`
        d.style.top = `${p.y * 20}px`
        d.textContent = p.direction === 'left' ? '<' : '>'
        d.title = p.nickname
        box.appendChild(d)
    }
}

export function setupChatHandlers() {
    const sendButton = document.getElementById('send')
    const chatInput = document.getElementById('chatInput')
    const chatBox = document.getElementById('chat')
    box = document.getElementById('game')

    if (sendButton && chatInput) {
        sendButton.onclick = () => {
            const msg = chatInput.value.trim()
            if (msg) {
                ws.send(JSON.stringify({ type: 'chat', message: msg }))
                chatInput.value = ''

                // Focus back on input for better UX
                //chatInput.focus();
            }
        }
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                sendButton.click()
            }
        })

        chatBox.addEventListener('scroll', () => {
            const isAtBottom = chatBox.scrollHeight - chatBox.clientHeight <= chatBox.scrollTop + 1
            const indicator = document.getElementById('new-message-indicator')

            if (isAtBottom && indicator) {
                indicator.remove()
            }
        })

    }
}
export { renderMiniGame }
