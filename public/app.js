import { createVNode, mount } from './framework/mini.js'
import { state, subscribe, createReactiveComponent } from './framework/state.js'
import { sendLeaveGame, sendBackToLobby, setupChatHandlers, startClient, redrawAllMessages } from './client.js'
import { stopSequenceClient } from './bomberbear-render/bomberbear-render.js'
import { loadAllSounds } from './bomberbear-render/sounds.js'

state.screen = 'start'
state.players = {}          // This can be kept for compatibility, but not used for rendering
state.countdownTime = null  // Initialize countdown time
state.lobbyTime = null
state.playerCount = 0

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
            class: 'scoreboard-box'
        },
        createVNode('div', { id: 'player-count-container' }, PlayerCountComponent()),
        ...[1, 2, 3, 4].map(i => {
            const player = state.players[i]
            return createVNode('div', {
                class: `scoreboard-player player-color-${i}${player ? '' : ' inactive'}`
            },
            // display player points
            createVNode('span', { class: 'player-points' },
                player ? player.points ? player.points : '0' : ''
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

function MainLayout({ header, boardId, boardClass, boardNode }) {
    return createVNode('div', { class: 'game-root' },
        // Header
        header,
        // Body
        createVNode('div', { class: 'game-body' },
            // Main board area
            createVNode('div', { class: 'game-content' },
                boardNode ? boardNode : createVNode('div', { id: boardId, class: boardClass })
            ),
            // Sidebar with scoreboard and chat
            createVNode('div', { class: 'sidebar' },
                createVNode('div', { id: 'player-board-container', class: 'player-board-section' }),
                createVNode('div', { class: 'chat-area' },
                    createVNode('div', { id: 'chat', class: 'chat-box' }),
                    createVNode('div', { class: 'chat-input-container' },
                        createVNode('input', { id: 'chatInput', placeholder: 'Type a message...' }),
                        createVNode('button', { id: 'send' }, 'Send')
                    )
                )
            )
        )
    )
}

function getTimerText() {
    let timerText = 'Waiting for players...' // Default message
    if (state.countdownTime) {
        timerText = ` Starting in ${state.countdownTime}s`
    } else if (state.lobbyTime) {
        timerText = ` Game launch in ${state.lobbyTime}s`
    } else if (state.playerCount > 1) {
        timerText = 'Preparing game...'
    }
    return timerText
}

function LobbyScreen() {
    const boardNode = createVNode('div', { class: 'lobby-border-wrapper' },
        createVNode('div', { id: 'lobby', class: 'lobby-area' })
    )

    return MainLayout({
        header: createVNode('div', { class: 'game-header' },
            createVNode('h2', {}, `Lobby: ${getTimerText()}`),
            createVNode('button', {
                id: 'leave-lobby',
                class: 'leave-button',
                onclick: () => {
                    sendLeaveGame()
                    stopSequenceClient('start')
                    window.location.reload() // Reload to reset the app state
                }
            }, 'Leave Lobby'),
        ),
        boardNode
    })
}

function GameScreen() {
    return MainLayout({
        header: createVNode('div', { class: 'game-header' },
            createVNode('button', {
                id: 'leave-game',
                class: 'leave-button',
                onclick: () => {
                    stopSequenceClient('start')
                    sendLeaveGame()
                }
            }, 'Leave Game'),
            createVNode('button', {
                id: 'back-to-lobby',
                class: 'leave-button',
                onclick: () => {
                    stopSequenceClient('lobby')
                    sendBackToLobby()
                }
            }, 'Back to Lobby'),
        ),
        boardId: 'game',
        boardClass: 'game-area'
    })
}

export function PlayerCountComponent() {
    return createVNode('div', { class: 'player-count' },
        `Players online: ${state.playerCount}/4`
    )
}

function App() {
    let screenContent
    if (state.screen === 'start') screenContent = StartScreen()
    else if (state.screen === 'lobby') screenContent = LobbyScreen()
    else if (state.screen === 'game') screenContent = GameScreen()
    else screenContent = createVNode('div', {}, 'Game loading...')

    return createVNode('div', { id: 'app-root' },
        screenContent
    )
}

// Re-render the app if the screen changes, update header for timer changes
function update(changedPath) {
    if (!changedPath || changedPath === 'screen') {
        // Full re-render for screen changes
        mount(document.body, App())
        if (state.screen === 'lobby' || state.screen === 'game') {
            const playerBoard = document.getElementById('player-board-container')
            if (playerBoard) {
                PlayerBoardComponent.mount(playerBoard)
            }
        }
        setupChatHandlers()
        redrawAllMessages()
        scaleGameBody()
    } else if ((changedPath === 'lobbyTime' || changedPath === 'countdownTime') && state.screen === 'lobby') {
        // For timer changes, only update the header text
        const headerElement = document.querySelector('.game-header h2')
        if (headerElement) {
            headerElement.textContent = `Lobby: ${getTimerText()}`
        }
    }
}

// Prevent default behavior for arrow keys and space to avoid page scrolling
window.addEventListener('keydown', function (e) {
    const chatInput = document.getElementById('chatInput')
    if (chatInput && document.activeElement === chatInput) {
        return
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space'].includes(e.key)) {
        e.preventDefault()
    };
})

// fit game into narrow window
function scaleGameBody() {
    if (state.screen === 'lobby' || state.screen === 'game') {    
        const element = document.querySelector('.game-body')
        const width = window.innerWidth

        if (element) {
            element.style.transformOrigin = 'top left'
            if (width < 766 && width > 300) {
                const scale = (width-16) / 750
                element.style.transform = `scale(${scale})`
            } else if (width <= 400) {
                const scale = (400-16) / 750
                element.style.transform = `scale(${scale})`
            } else {
                element.style.transform = 'scale(1)'
            }
        }
    }
}

loadAllSounds()
window.addEventListener('resize', scaleGameBody)
subscribe(update, ['screen', 'lobbyTime', 'countdownTime']) // Watch for screen and timer changes
stopSequenceClient('lobby')
state.screen = 'start'
update()
