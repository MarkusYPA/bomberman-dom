export function endGraphic(winner) {
    const gameContainer = document.getElementById('game')

    // Remove any previous end graphics
    const existingEndDiv = document.querySelector('.win, .tie')
    if (existingEndDiv) {
        existingEndDiv.remove()
    }

    const endDiv = document.createElement('div')
    if (winner.length > 0) {
        endDiv.classList.add('win')
        endDiv.textContent = `${winner[0].name} won the round!`
    } else {
        endDiv.classList.add('tie')
        endDiv.textContent = 'The game ended in tie'
    }

    gameContainer.appendChild(endDiv)
}
