import { createVNode, mount } from './framework/mini.js'
import { state, subscribe, createReactiveComponent } from './framework/state.js'
import { sendLeaveGame, setupChatHandlers, startClient } from './client.js'
import { stopSequenceClient } from './bomberman/runGame.js'

state.screen = 'start'
state.players = {}          // This can be kept for compatibility, but not used for rendering
state.countdownTime = null  // Initialize countdown time
state.lobbyTime = null

function StartScreen() {
    return createVNode('div', { id: 'start-menu', class: 'start-menu' },
        createVNode('h1', {}, 'Bomber Bear Multiplayer'),
        createVNode('button', {
            onclick: async () => {
                await startClient()
                state.screen = 'lobby'
            }
        }, 'Start Game')
    )
}

// PlayerBoard component that only re-renders when players state changes
export const PlayerBoardComponent = createReactiveComponent(
    () => {
        return createVNode('div', {
            class: 'scoreboard scoreboard-width'
        },
        createVNode('h2', {}, 'Scoreboard'),
        ...[1, 2, 3, 4].map(i => {
            const player = state.players[i]
            return createVNode('div', {
                class: `scoreboard-player player-color-${i}${player ? '' : ' inactive'}`
            },
            // display player points
            createVNode('span', { class: 'player-points' },
                player ? player.points ? player.points: '0' : ''
            ),
            createVNode('span', { class: 'player-nickname' },
                player ? player.nickname : `Player ${i}`
            )
            )
        })
        )
    },
    ['players'] // Only watch the 'players' path
)

function LobbyScreen() {
    // return createVNode('div', { id: 'lobby-menu', class: 'lobby-menu' },
    //     createVNode('h2', {}, 'Lobby: Waiting for players...'),
    //     createVNode('div', { id: 'lobby-board-container' }), // Show players in lobby
    //     createVNode('div', { id: 'lobby-timer-container' }, LobbyTimerComponent()),
    //     createVNode('div', { id: 'countdown-container' }, CountdownComponent()),
    //     createVNode('div', { id: 'lobby', class: 'lobby-area' }), // Mini-game area
    // )

    return createVNode('div', { id: 'lobby-menu', class: 'lobby-menu' },
        // Header with timer and leave button
        createVNode('div', { class: 'game-header' },
            createVNode('h2', {}, 'Lobby: Waiting for players...'),
            createVNode('div', { id: 'lobby-timer-container' }, LobbyTimerComponent()), // Lobby timer
            createVNode('div', { id: 'countdown-container', class: 'timer-section' }, CountdownComponent()), // Countdown timer
            // createVNode('button', {
            //     id: 'leave-game',
            //     class: 'leave-button',
            //     onclick: () => {
            //         state.screen = 'lobby'
            //     }
            // }, 'Leave Game')
        ),
        
        // Game body container for horizontal layout
        createVNode('div', { class: 'game-body' },
            // Main content area
            createVNode('div', { class: 'lobby-area-content' },
                // Left side - Main game board
                createVNode('div', { class: 'lobby-area-section' },
                    // createVNode('div', { id: 'error-container', class: 'error-container' }),
                    createVNode('div', { id: 'lobby', class: 'lobby-area' })
                ),
                
                
            ),
                
            // Right side - Player board and chat
            createVNode('div', { class: 'sidebar' },
                createVNode('div', { id: 'player-board-container', class: 'player-board-section' }), // Empty container for PlayerBoard
                createVNode('div', { class: 'chat-area' },
                    createVNode('div', { id: 'chat', class: 'chat-box' }),
                    createVNode('input', { id: 'chatInput', placeholder: 'Type a message...' }),
                    createVNode('button', { id: 'send' }, 'Send')
                )
            )
        )

    )
}

function GameScreen() {
    return createVNode('div', { class: 'game-root' },
        // Header with timer and leave button
        createVNode('div', { class: 'game-header' },
            // createVNode('div', { id: 'lobby-timer-container' }, LobbyTimerComponent()), // Lobby timer
            // createVNode('div', { id: 'countdown-container', class: 'timer-section' }, CountdownComponent()), // Countdown timer
            createVNode('button', {
                id: 'leave-game',
                class: 'leave-button',
                onclick: () => {
                    // version 1
                    //state.screen = 'lobby'

                    // version 2
                    //stopSequenceClient()

                    // v3: send ws mesg to server, telling to leave game?
                    stopSequenceClient()
                    sendLeaveGame()
                }
            }, 'Leave Game')
        ),
        
        // Game body container for horizontal layout
        createVNode('div', { class: 'game-body' },
            // Main game content
            createVNode('div', { class: 'game-content' },
                // Main game board
                createVNode('div', { class: 'game-board-section' },
                    // createVNode('div', { id: 'error-container', class: 'error-container' }),
                    createVNode('div', { id: 'game', class: 'game-area' })
                )
            ),
                
            // Right side - Player board and chat
            createVNode('div', { class: 'sidebar' },
                createVNode('div', { id: 'player-board-container', class: 'player-board-section' }), // Empty container for PlayerBoard
                createVNode('div', { class: 'chat-area' },
                    createVNode('div', { id: 'chat', class: 'chat-box' }),
                    createVNode('input', { id: 'chatInput', placeholder: 'Type a message...' }),
                    createVNode('button', { id: 'send' }, 'Send')
                )
            )
        )
    )
}

export function CountdownComponent() {
    if (state.countdownTime === null) {
        return createVNode('div', { id: 'countdown', class: 'countdown-timer' }, '')
    }
    return createVNode('div', { id: 'countdown', class: 'countdown-timer' }, `Game starts in: ${state.countdownTime}s`)
}

export function LobbyTimerComponent() {
    if (state.lobbyTime === null) {
        return createVNode('div', { id: 'lobby-timer', class: 'lobby-timer' }, '')
    }
    return createVNode('div', { id: 'lobby-timer', class: 'lobby-timer' }, `Lobby: Game starts in ${state.lobbyTime}s`)
}

function App() {
    let screenContent
    if (state.screen === 'start') screenContent = StartScreen()
    else if (state.screen === 'lobby') screenContent = LobbyScreen()
    else if (state.screen === 'game') screenContent = GameScreen()
    else screenContent = createVNode('div', {}, 'Game loading...')

    // Only show chat in lobby and game screens
    const showChat = false /*state.screen === 'lobby'  || state.screen === 'game' */

    return createVNode('div', { id: 'app-root' },
        createVNode('div', { id: 'error-container', class: 'error-container' }),
        screenContent,
        showChat && createVNode('div', { class: 'chat-area' },
            createVNode('div', { id: 'chat', class: 'chat-box' }),
            createVNode('input', { id: 'chatInput', placeholder: 'Type a message...' }),
            createVNode('button', { id: 'send' }, 'Send')
        )
    )
}

// Only re-render the entire app when the screen changes
function update(changedPath) {
    if (!changedPath || changedPath === 'screen') {
        mount(document.body, App())

        // Always mount PlayerBoardComponent in the correct container for the current screen
        // if (state.screen === 'lobby') {
        //     const lobbyBoard = document.getElementById('lobby-board-container')
        //     if (lobbyBoard) {
        //         PlayerBoardComponent.mount(lobbyBoard)
        //     }
        // }
        if (state.screen === 'lobby' || state.screen === 'game') {
            const playerBoard = document.getElementById('player-board-container')
            if (playerBoard) {
                PlayerBoardComponent.mount(playerBoard)
            }
        }
        setupChatHandlers()
    }
}

// Prevent default behavior for arrow keys and space to avoid page scrolling
window.addEventListener('keydown', function (e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space'].includes(e.key)) {
        e.preventDefault()
    };
})

subscribe(update, ['screen']) // Only watch for screen changes
stopSequenceClient()
state.screen = 'start'
update()
