import { gridStep, mult } from '../shared/config.js'

export function resizeGameContainer(level = 1) {
    const gameContainer = document.getElementById('game')

    // one square or gridStep 50px 
    gameContainer.style.height = gridStep * 11 + 'px'
    gameContainer.style.width = gridStep * 13 + 'px'

    // remove the previous level class if it exists
    gameContainer.classList.remove(`level-${level - 1}`)

    // apply the level class to the game container
    gameContainer.classList.add(`level-${level}`)
};

export function makeTextBar() {
    const gameBox = document.getElementById('game')
    const gameArea = gameBox.getBoundingClientRect()
    let oldTextBar = document.querySelector('.textbar')

    const pad = 10
    if (!oldTextBar) {
        // one bar to contain all text
        let textbar = document.createElement('div')
        textbar.classList.add('textbar')
        textbar.style.height = `${gridStep - pad * 2 * mult}px`
        textbar.style.width = `${gridStep * 13 - pad * 2 * mult}px`
        //textbar.style.left = `${gameArea.left}px`;
        //textbar.style.top = `${gameArea.top - gridStep}px`;
        textbar.style.top = `${-gridStep}px`
        textbar.style.padding = `${pad * mult}px`

        // smaller bits to display info
        const infos = []
        const ids = ['livesinfo1', 'livesinfo2', 'livesinfo3', 'livesinfo4']

        for (let i = 0; i < 4; i++) {
            let info = document.createElement('div')
            info.classList.add('infobox')
            info.style.margin = `${pad * mult}px`
            info.style.padding = `${pad * mult}px`
            info.style.borderWidth = `${mult * 2}px`
            info.style.borderRadius = `${pad * mult}px`
            info.id = ids[i]
            info.textContent = ''
            info.style.fontSize = `${18 * mult}px`
            textbar.appendChild(info)
            infos.push(info)
        }

        gameBox.appendChild(textbar)
        return infos
    } else {
        // recalculate text bar size and position in case window was resized
        // remnant from old game?
        oldTextBar.style.height = `${gridStep - pad * 2 * mult}px`
        oldTextBar.style.width = `${gridStep * 13 - pad * 2 * mult}px`
        oldTextBar.style.left = `${gameArea.left}px`
        oldTextBar.style.top = `${gameArea.top - gridStep}px`
        oldTextBar.style.padding = `${pad * mult}px`

        return [
            document.getElementById('levelinfo'),
            document.getElementById('livesinfo'),
        ]
    };
}