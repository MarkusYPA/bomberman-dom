# Node Game Server

This is a server-authoritative multiplayer game, reminiscent of classic Bomberman. It handles all game logic on the server, with clients responsible for sending inputs and rendering the received game state. Now with chat functionality, because who doesn't love a good trash talk session?


## Features

*   **Multiplayer Action:** Supports up to 4 players in a classic arena-style battle.
*   **Server-Authoritative Logic:** All game rules, physics, and state management are handled on the server to prevent cheating and ensure consistency.
*   **Dynamic Game Elements:**
    *   **Bombs:** Drop 'em, watch 'em explode, destroy walls, and chain reactions.
    *   **Walls:** Solid walls (indestructible) and weak walls (destructible).
    *   **Power-ups:** Boost your bomb count, flame power, movement speed, gain extra lives, or even clip through weak walls.
*   **Game States:** Transitions between a start screen, a lobby (with a mini-game and countdown), and the main game.
*   **Real-time Communication:** Uses WebSockets for efficient client-server data exchange.
*   **Integrated Chat:** Talk smack to your opponents or coordinate with teammates (if you're into that).
*   **Scoreboard:** Keep track of who's winning (or losing, more likely).

## How to Run This Thing

You'll need Node.js installed. If you don't have it, figure it out.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/MarkusYPA/node-server-game.git
    cd node-server-game
    ```
2.  **Start the server:**
    ```bash
    node server.mjs
    ```
    The server will start, and you can then open `https://localhost:3000` in your web browser to connect as a client. Open multiple tabs/browsers to simulate multiple players.

## Project Structure (For the Curious)

*   `server.mjs`: The main server application entry point.
*   `ws-server.mjs`: Handles WebSocket connections and broadcasting.
*   `bm-server/`: Contains all the core game logic and entity definitions (players, bombs, walls, power-ups, game loop).
*   `bm-server-shared/`: Holds shared constants and the main game state object.
*   `public/`: All client-side code, including the UI, rendering logic, and client-side WebSocket handling.
*   `.vscode/`: VS Code settings, mostly for ESLint.
*   `package.json`: Project dependencies and scripts.

## Technologies Used

*   **JavaScript (Node.js):** Server-side runtime.
*   **WebSockets:** For real-time, bidirectional communication.
*   **ESLint:** Keeping the code somewhat readable (or at least, linted).

