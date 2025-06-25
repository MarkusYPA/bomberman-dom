import { state } from "./framework/state.js";

// Function to create beautiful nickname modal
function createNicknameModal() {
    return new Promise((resolve) => {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'nickname-modal-overlay';
        
        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'nickname-modal';
        
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
        `;
        
        const input = modal.querySelector('.nickname-input');
        const charCount = modal.querySelector('.character-count');
        const confirmBtn = modal.querySelector('.confirm-btn');
        const cancelBtn = modal.querySelector('.cancel-btn');
        
        // Update character count
        function updateCharCount() {
            const length = input.value.length;
            charCount.textContent = `${length}/12 characters`;
            charCount.style.color = length >= 10 ? '#ff4444' : '#ff8c00';
        }
        
        // Handle input events
        input.addEventListener('input', updateCharCount);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                resolve(input.value.trim().slice(0, 12));
                document.body.removeChild(overlay);
            }
        });
        
        // Handle button clicks
        confirmBtn.addEventListener('click', () => {
            const nickname = input.value.trim();
            if (nickname) {
                resolve(nickname.slice(0, 12));
                document.body.removeChild(overlay);
            } else {
                input.focus();
                input.style.borderColor = '#ff4444';
                setTimeout(() => {
                    input.style.borderColor = '#8b4513';
                }, 1000);
            }
        });
        
        cancelBtn.addEventListener('click', () => {
            resolve('Player'); // Default nickname if cancelled
            document.body.removeChild(overlay);
        });
        
        // Add to DOM and focus
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Focus input after a short delay to ensure modal is rendered
        setTimeout(() => {
            input.focus();
            input.select();
        }, 100);
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                resolve('Player'); // Default nickname
                document.body.removeChild(overlay);
            }
        });
    });
}

// Get nickname using beautiful modal
const nickname = await createNicknameModal();

const ws = new WebSocket(`ws://${location.host}`);

// Function to get current game area dimensions
function getGameAreaDimensions() {
    // Check if we're on mobile, tablet, or desktop based on CSS media queries
    const isLargeScreen = window.matchMedia('(min-width: 1200px)').matches;
    const isTablet = window.matchMedia('(max-width: 768px)').matches;
    const isMobile = window.matchMedia('(max-width: 480px)').matches;
    
    if (isLargeScreen) {
        return { width: 600, height: 480 };
    } else if (isMobile) {
        const vw = Math.min(window.innerWidth * 0.95, 500);
        return { width: vw, height: 250 };
    } else if (isTablet) {
        const vw = Math.min(window.innerWidth * 0.9, 500);
        return { width: vw, height: 300 };
    } else {
        return { width: 500, height: 400 }; // Default
    }
}

// Function to update game dimensions when screen size changes
function updateGameDimensions() {
    if (ws.readyState === WebSocket.OPEN) {
        const dimensions = getGameAreaDimensions();
        ws.send(JSON.stringify({ 
            type: "updateDimensions", 
            dimensions: dimensions 
        }));
    }
}

// Listen for window resize events
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateGameDimensions, 100);
});

// Listen for orientation change on mobile devices
window.addEventListener('orientationchange', () => {
    setTimeout(updateGameDimensions, 500); // Wait for orientation change to complete
});

// Function to show error messages elegantly
function showErrorMessage(message) {
    const errorContainer = document.getElementById("error-container");
    if (errorContainer) {
        const errorDiv = document.createElement("div");
        errorDiv.className = "error-message";
        errorDiv.textContent = message;
        errorContainer.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    } else {
        // Fallback to alert if error container not found
        alert(message);
    }
}

// Function to show new message indicator
function showNewMessageIndicator() {
    const chatBox = document.getElementById("chat");
    let indicator = document.getElementById("new-message-indicator");
    
    // Create indicator if it doesn't exist
    if (!indicator) {
        indicator = document.createElement("div");
        indicator.id = "new-message-indicator";
        indicator.className = "new-message-indicator";
        indicator.textContent = "↓ New messages ↓";
        indicator.onclick = () => {
            chatBox.scrollTop = chatBox.scrollHeight;
            indicator.remove();
        };
        chatBox.appendChild(indicator); // Append to chat-box instead of chat-area
    }
    
    // Reset the fade-out timer
    clearTimeout(indicator.fadeTimer);
    indicator.style.opacity = "1";
    
    // Auto-fade after 3 seconds
    indicator.fadeTimer = setTimeout(() => {
        if (indicator.parentNode) {
            indicator.style.opacity = "0.7";
        }
    }, 3000);
}

ws.addEventListener("open", () => {
    const dimensions = getGameAreaDimensions();
    ws.send(JSON.stringify({ 
        type: "join", 
        nickname: nickname,
        dimensions: dimensions 
    }));
});

// Track held keys
const held = new Set();
const keyMap = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };

function sendHeld() {
    ws.send(JSON.stringify({ type: "input", payload: Array.from(held) }));
}

document.addEventListener("keydown", (e) => {
    if (keyMap[e.key]) {
        if (!held.has(keyMap[e.key])) {
            held.add(keyMap[e.key]);
            sendHeld();
        }
    }
});

document.addEventListener("keyup", (e) => {
    if (keyMap[e.key]) {
        if (held.has(keyMap[e.key])) {
            held.delete(keyMap[e.key]);
            sendHeld();
        }
    }
});

ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "state") {
        state.players = msg.payload; // Update state with players
        renderGame(msg.payload);
    } else if (msg.type === "chat") {
        const chatBox = document.getElementById("chat");
        
        // Check if user is at the bottom before adding message
        const isAtBottom = chatBox.scrollHeight - chatBox.clientHeight <= chatBox.scrollTop + 1;
        
        // Create message container
        const messageDiv = document.createElement("div");
        const isOwnMessage = msg.nickname === nickname;
        messageDiv.className = `chat-message ${isOwnMessage ? 'own' : 'other'}`;
        
        // Create sender name (only show for other people's messages)
        if (!isOwnMessage) {
            const senderDiv = document.createElement("div");
            senderDiv.className = "message-sender";
            senderDiv.textContent = msg.nickname;
            messageDiv.appendChild(senderDiv);
        }
        
        // Create message bubble with player color
        const bubbleDiv = document.createElement("div");
        bubbleDiv.className = `message-bubble player-color-${msg.playerId}`;
        bubbleDiv.textContent = msg.message;
        messageDiv.appendChild(bubbleDiv);
        
        // Create timestamp
        const timestampDiv = document.createElement("div");
        timestampDiv.className = "message-timestamp";
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        timestampDiv.textContent = timeString;
        
        messageDiv.appendChild(timestampDiv);
        
        chatBox.appendChild(messageDiv);
        
        if (isAtBottom) {
            // User was at bottom, auto-scroll to show new message
            chatBox.scrollTop = chatBox.scrollHeight;
        } else {
            // User is reading older messages, show new message indicator
            showNewMessageIndicator();
        }
    } else if (msg.type === "duplicateNickname") {
        // Show error message and prompt for new nickname
        showErrorMessage(msg.message);
        // Prompt user to enter a different nickname
        createNicknameModal().then(newNickname => {
            const dimensions = getGameAreaDimensions();
            ws.send(JSON.stringify({ 
                type: "join", 
                nickname: newNickname,
                dimensions: dimensions 
            }));
        });
    } else if (msg.type === "error") {
        // Display error message to user
        showErrorMessage(msg.message);
    }
});

// Handle WebSocket close event
ws.addEventListener("close", (event) => {
    console.log('WebSocket connection closed:', event.code, event.reason);
    showErrorMessage("Connection lost. Please refresh the page to reconnect.");
});

// Handle WebSocket error event  
ws.addEventListener("error", (error) => {
    console.error('WebSocket error:', error);
    showErrorMessage("Connection error occurred. Please check your internet connection.");
});

// Add beforeunload event to properly close connection when page is unloaded
window.addEventListener("beforeunload", () => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, "Page unload"); // Normal closure
    }
});

function renderGame(players) {
    const box = document.getElementById("game");
    if (!box) return;
    
    // Update the game area size to match current dimensions
    const dimensions = getGameAreaDimensions();
    box.style.width = `${dimensions.width}px`;
    box.style.height = `${dimensions.height}px`;
    
    box.innerHTML = "";
    for (const id in players) {
        const p = players[id];
        const d = document.createElement("div");
        d.className = `player player-color-${id}`;
        d.style.left = `${p.x * 20}px`;
        d.style.top = `${p.y * 20}px`;
        d.textContent = p.direction === "left" ? "<" : ">";
        d.title = p.nickname;
        // d.textContent = p.nickname;
        box.appendChild(d);
    }
}

document.addEventListener("DOMContentLoaded", setupChatHandlers);

setupChatHandlers();

function setupChatHandlers() {
    const sendButton = document.getElementById("send");
    const chatInput = document.getElementById("chatInput");
    const chatBox = document.getElementById("chat");

    if (sendButton && chatInput) {
        sendButton.onclick = () => {
            const msg = chatInput.value.trim();
            if (msg) {
                ws.send(JSON.stringify({ type: "chat", message: msg }));
                chatInput.value = "";
        
                // Focus back on input for better UX
                //chatInput.focus();
            }
        };
        chatInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                sendButton.click();
            }
        });

        chatBox.addEventListener("scroll", () => {
            const isAtBottom = chatBox.scrollHeight - chatBox.clientHeight <= chatBox.scrollTop + 1;
            const indicator = document.getElementById("new-message-indicator");
            
            if (isAtBottom && indicator) {
                indicator.remove();
            }
        });
    } else {
        setTimeout(setupChatHandlers, 100); // Retry if elements not found
    }

}