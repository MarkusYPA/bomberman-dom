const gameArea = document.getElementById("game");
const socket = new WebSocket(`ws://${location.host}`);

let state = {};

document.addEventListener("keydown", (e) => {
    const dir = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
    }[e.key];

    if (dir) {
        socket.send(JSON.stringify({ type: "input", payload: dir }));
    }
});

socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "state") {
        state = data.payload;
        render();
    }
});

function render() {
    gameArea.innerHTML = "";
    for (const id in state) {
        const p = state[id];
        const el = document.createElement("div");
        el.className = "player";
        el.style.left = `${p.x}px`;
        el.style.top = `${p.y}px`;
        gameArea.appendChild(el);
    }
}
