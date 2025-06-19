const nickname = prompt("Enter your nickname (max 12 chars):").slice(0, 12);
const ws = new WebSocket(`ws://${location.host}`);

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
        const p = document.createElement("p");
        p.textContent = `${msg.nickname}: ${msg.message}`;
        document.getElementById("chat").appendChild(p);
    }
});

function render(players) {
    const box = document.getElementById("game");
    box.innerHTML = "";
    for (const id in players) {
        const p = players[id];
        const d = document.createElement("div");
        d.className = "player";
        d.style.left = `${100 + p.x * 20}px`;
        d.style.top = `${100 + p.y * 20}px`;
        d.textContent = p.nickname;
        box.appendChild(d);
    }
}

document.getElementById("send").onclick = () => {
    const input = document.getElementById("chatInput");
    const msg = input.value.trim();
    if (msg) {
        ws.send(JSON.stringify({ type: "chat", message: msg }));
        input.value = "";
    }
};
