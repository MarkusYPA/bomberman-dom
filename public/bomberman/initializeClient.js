import { gridStep, mult } from "../shared/config.js";

export function resizeGameContainer(level = 1) {
    const gameContainer = document.getElementById("game");

    // Decide one square is 50px wide
    gameContainer.style.height = 550 + "px";
    gameContainer.style.width = 650 + "px";

    const bounds = gameContainer.getBoundingClientRect();
    gameContainer.style.left = 100 + 'px';
    gameContainer.style.top = 100 + 'px';


    // Remove the previous level class if it exists
    gameContainer.classList.remove(`level-${level - 1}`);

    // Apply the level class to the game container
    gameContainer.classList.add(`level-${level}`);

    return bounds;
};

export function makeTextBar() {
    const gameArea = document.getElementById("game").getBoundingClientRect();
    let oldTextBar = document.querySelector(".textbar");

    const pad = 10;
    if (!oldTextBar) {
        // one bar to contain all text
        let textbar = document.createElement('div');
        textbar.classList.add("textbar");
        textbar.style.height = `${gridStep - pad * 2 * mult}px`;
        textbar.style.width = `${gridStep * 13 - pad * 2 * mult}px`;
        textbar.style.left = `${gameArea.left}px`;
        textbar.style.top = `${gameArea.top - gridStep}px`;
        textbar.style.padding = `${pad * mult}px`;

        // four smaller bits to display info
        const infos = [];
        const ids = ["levelinfo", "livesinfo"]; //, "scoreinfo", "timeinfo"];
        const placeholders = ["Level: 1", "Lives: X"]; //, "Score: 0", "00:00"]
        for (let i = 0; i < 2; i++) {
            let info = document.createElement('div');
            info.classList.add("infobox");
            info.style.margin = `${pad * mult}px`;
            info.style.padding = `${pad * mult}px`;
            info.style.borderWidth = `${mult * 2}px`;
            info.style.borderRadius = `${pad * mult}px`;
            info.id = ids[i];
            info.textContent = placeholders[i];
            info.style.fontSize = `${18 * mult}px`;
            textbar.appendChild(info);
            infos.push(info);
        }

        //infos[3].style.justifyContent = "center";
        document.body.appendChild(textbar);

        return infos;
    } else {
        // recalculate text bar size and position in case window was resized
        oldTextBar.style.height = `${gridStep - pad * 2 * mult}px`;
        oldTextBar.style.width = `${gridStep * 13 - pad * 2 * mult}px`;
        oldTextBar.style.left = `${gameArea.left}px`;
        oldTextBar.style.top = `${gameArea.top - gridStep}px`;
        oldTextBar.style.padding = `${pad * mult}px`;

        return [
            document.getElementById("levelinfo"),
            document.getElementById("livesinfo"),
            //document.getElementById("scoreinfo"),
            //document.getElementById("timeinfo")
        ];
    };
}