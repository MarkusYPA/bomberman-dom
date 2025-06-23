import { createVNode, mount } from './framework/mini.js';
import { state, subscribe } from './framework/state.js';

state.screen = 'start';

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

function GameScreen() {
    return createVNode('div', { class: 'game-root' },
        createVNode('div', { id: 'game', class: 'game-area' }), // Game area for client.js
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