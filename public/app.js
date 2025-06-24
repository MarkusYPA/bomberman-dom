import { createVNode, mount } from './framework/mini.js';
import { state, subscribe } from './framework/state.js';

state.screen = 'start';
state.players = {}; // This can be kept for compatibility, but not used for rendering

function StartScreen() {
    return createVNode('div', { id: 'start-menu', class: 'start-menu' },
        createVNode('h1', {}, 'Bomber Bear Multiplayer'),
        createVNode('button', {
            onclick: async () => {
                state.screen = 'game';
                // Dynamically import client.js as a module
                await new Promise(requestAnimationFrame)
                await import('./client.js');
            }
        }, 'Start Game')
    );
}

// Accept players as a parameter!
function Scoreboard() {
    return createVNode('div', { class: 'scoreboard' },
        createVNode('h2', { style: 'margin: 0 0 8px 0;' }, 'Scoreboard'),
        ...[1, 2, 3, 4].map(i => {
            const player = window.latestPlayers[i];
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
}

// Store the latest players for rendering
window.latestPlayers = {};

function GameScreen() {
    return createVNode('div', { class: 'game-root' },
        createVNode('div', { id: 'error-container', class: 'error-container' }),
        Scoreboard(window.latestPlayers),
        createVNode('div', { id: 'game', class: 'game-area' }),
        createVNode('div', { class: 'chat-area' },
            createVNode('div', { id: 'chat', class: 'chat-box' }),
            createVNode('input', { id: 'chatInput', placeholder: 'Type a message...' }),
            createVNode('button', { id: 'send' }, 'Send')
        )
    );
}

function App() {
    if (state.screen === 'start') return StartScreen();
    if (state.screen === 'game') return GameScreen();
    return createVNode('div', {}, 'Game loading...');
}

function update() { mount(document.body, App()); }
subscribe(update);
update();

// Make update globally accessible for client.js to trigger re-render
window.update = update;