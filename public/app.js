import { createVNode, mount } from './framework/mini.js';
import { state, subscribe, createReactiveComponent } from './framework/state.js';

state.screen = 'start';
state.players = {}; // This can be kept for compatibility, but not used for rendering
state.countdownTime = null; // Initialize countdown time

function StartScreen() {
    return createVNode('div', { id: 'start-menu', class: 'start-menu' },
        createVNode('h1', {}, 'Bomber Bear Multiplayer'),
        createVNode('button', {
            onclick: async () => {
                state.screen = 'game';
                // Dynamically import client.js as a module
                await new Promise(requestAnimationFrame)
                await import('./client.js');
                
                // Mount the PlayerBoard component after game screen is rendered
                setTimeout(() => {
                    const container = document.getElementById('player-board-container');
                    if (container && !container.hasChildNodes()) {
                        PlayerBoardComponent.mount(container);
                    }
                }, 0);
            }
        }, 'Start Game')
    );
}

// PlayerBoard component that only re-renders when players state changes
const PlayerBoardComponent = createReactiveComponent(
    () => {
        return createVNode('div', { class: 'scoreboard' },
            createVNode('h2', { style: 'margin: 0 0 8px 0;' }, 'Scoreboard'),
            ...[1, 2, 3, 4].map(i => {
                const player = state.players[i];
                return createVNode('div', {
                    class: `scoreboard-player player-color-${i}`,
                    style: `opacity: ${player ? 1 : 1.0};`
                },
                    createVNode('span', {}, `Player ${i}`),
                    createVNode('span', { style: 'margin-left: 10px; font-size: 0.95em; font-weight: normal;' },
                        player ? player.nickname : '(empty)'
                    )
                );
            })
        );
    },
    ['players'] // Only watch the 'players' path
);

function GameScreen() {
    return createVNode('div', { class: 'game-root' },
        createVNode('div', { id: 'error-container', class: 'error-container' }),
        createVNode('div', { id: 'player-board-container' }), // Empty container for PlayerBoard
        createVNode('div', { id: 'countdown-container' }, CountdownComponent()), // Countdown timer
        createVNode('div', { id: 'game', class: 'game-area' }),
        createVNode('div', { class: 'chat-area' },
            createVNode('div', { id: 'chat', class: 'chat-box' }),
            createVNode('input', { id: 'chatInput', placeholder: 'Type a message...' }),
            createVNode('button', { id: 'send' }, 'Send')
        )
    );
}
export function CountdownComponent() {
    if (state.countdownTime === null) {
        return createVNode('div', { id: 'countdown', class: 'countdown-timer' }, '');
    }
    return createVNode('div', { id: 'countdown', class: 'countdown-timer' }, `Game starts in: ${state.countdownTime}s`);
}

function App() {
    if (state.screen === 'start') return StartScreen();
    if (state.screen === 'game') return GameScreen();
    return createVNode('div', {}, 'Game loading...');
}

// Only re-render the entire app when the screen changes
function update(changedPath) { 
    if (!changedPath || changedPath === 'screen') {
        mount(document.body, App()); 
    }
}

// Prevent default behavior for arrow keys to avoid page scrolling
window.addEventListener("keydown", function (e) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
    };
});

subscribe(update, ['screen']); // Only watch for screen changes
update();
