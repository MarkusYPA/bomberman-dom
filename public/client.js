const nickname = prompt("Enter your nickname (max 12 chars):").slice(0, 12);
const ws = new WebSocket(`ws://${location.host}`);

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
    ws.send(JSON.stringify({ type: "join", nickname }));
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
        render(msg.payload);
    } else if (msg.type === "chat") {
        const chatBox = document.getElementById("chat");
        
        // Check if user is at the bottom before adding message
        const isAtBottom = chatBox.scrollHeight - chatBox.clientHeight <= chatBox.scrollTop + 1;
        
        // Create message container
        const messageDiv = document.createElement("div");
        messageDiv.className = `chat-message ${msg.nickname === nickname ? 'own' : 'other'}`;
        
        // Create sender name (only show for other people's messages)
        if (msg.nickname !== nickname) {
            const senderDiv = document.createElement("div");
            senderDiv.className = "message-sender";
            senderDiv.textContent = msg.nickname;
            messageDiv.appendChild(senderDiv);
        }
        
        // Create message bubble
        const bubbleDiv = document.createElement("div");
        bubbleDiv.className = "message-bubble";
        bubbleDiv.textContent = msg.message;
        messageDiv.appendChild(bubbleDiv);
        
        chatBox.appendChild(messageDiv);
        
        if (isAtBottom) {
            // User was at bottom, auto-scroll to show new message
            chatBox.scrollTop = chatBox.scrollHeight;
        } else {
            // User is reading older messages, show new message indicator
            showNewMessageIndicator();
        }
    } else if (msg.type === "error") {
        // Display error message to user
        showErrorMessage(msg.message);
    }
});

function render(players) {
    const box = document.getElementById("game");
    box.innerHTML = "";
    const colors = ["#145214", "#c00", "#113377", "#111"]; // Colors for players
    for (const id in players) {
        const p = players[id];
        const d = document.createElement("div");
        d.className = "player";
        d.style.left = `${p.x * 20}px`;
        d.style.top = `${p.y * 20}px`;
        d.style.background = colors[id - 1] || "#888";
        d.style.color = "#fff";
        d.style.fontWeight = "bold";
        d.style.fontSize = "2em";
        d.style.display = "flex";
        d.style.alignItems = "center";
        d.style.justifyContent = "center";
        d.textContent = p.direction === "left" ? "<" : ">";
        d.title = p.nickname;
        // d.textContent = p.nickname;
        box.appendChild(d);
    }
}

document.getElementById("send").onclick = () => {
    const input = document.getElementById("chatInput");
    const msg = input.value.trim();
    if (msg) {
        ws.send(JSON.stringify({ type: "chat", message: msg }));
        input.value = "";
        
        // Focus back on input for better UX
        input.focus();
    }
};
document.getElementById("chatInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("send").click();
    }
});

// Add scroll listener to hide new message indicator when user scrolls to bottom
document.addEventListener("DOMContentLoaded", () => {
    const chatBox = document.getElementById("chat");
    if (chatBox) {
        chatBox.addEventListener("scroll", () => {
            const isAtBottom = chatBox.scrollHeight - chatBox.clientHeight <= chatBox.scrollTop + 1;
            const indicator = document.getElementById("new-message-indicator");
            
            if (isAtBottom && indicator) {
                indicator.remove();
            }
        });
    }
});