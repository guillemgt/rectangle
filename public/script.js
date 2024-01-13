document.addEventListener("DOMContentLoaded", () => {
    fetch('games.json')
        .then(response => response.json())
        .then(data => {
            startGame(data);
        })
        .catch(error => {
            console.error('Error fetching JSON:', error);
        });
});

function startGame(data){
    // Choose a random grid
    let grid = data[parseInt(Math.random() * data.length)]
        .split('\n');
    
    // Split the grid into a 2D array and transpose it
    let game_grid = [];
    let start_grid = [];
    for(let i = 0; i < grid[0].length; i++){
        game_grid[i] = [];
        start_grid[i] = [];
    }
    for(let j = 0; j < grid.length; j++){
        var column = grid[j].split('');
        for(let i = 0; i < column.length; i++){
            game_grid[i][j] = column[i];
            start_grid[i][j] = null;
        }
    }

    let horizontal_hints = 3;
    let vertical_hints = 2;

    // Add hints to the start grid
    for(let k = 0; k < horizontal_hints; k++){
        let i = parseInt(Math.random() * game_grid.length);
        for(let j = 0; j < game_grid[i].length; j++){
            start_grid[i][j] = game_grid[i][j];
        }
    }
    for(let k = 0; k < vertical_hints; k++){
        let j = parseInt(Math.random() * game_grid[0].length);
        for(let i = 0; i < game_grid.length; i++){
            start_grid[i][j] = game_grid[i][j];
        }
    }

    game_data = {
        width: game_grid[0].length,
        hight: game_grid.length,
        grid: game_grid,
        start_grid: start_grid,
    }
    initializeGrid(game_data);

}

function indexTo2D(index){
    return [parseInt(index / game_data.width), index % game_data.width];
}
function startGridAtIndex(index){
    let position = indexTo2D(index);
    return game_data.start_grid[position[0]][position[1]];
}

let game_data = null;

function initializeGrid(game_data) {
    let grid = document.getElementById('wordle-grid');
    grid.style['grid-template-columns'] = `repeat(${game_data.width}, 1fr)`; // Set the number of columns
    for (let i = 0; i < game_data.width*game_data.hight; i++) {
        let cell = document.createElement('div');
        cell.className = 'cell';
        cell.tabIndex = 0; // Make the cell focusable
        cell.addEventListener('mousedown', (e) => { e.preventDefault(); return false; });
        cell.addEventListener('click', (e) => { focusCell(i) });
        cell.addEventListener('keydown', (e) => handleKeydown(e, i));
        let position = indexTo2D(i);
        if(game_data.start_grid[position[0]][position[1]] != null){
            cell.textContent = game_data.start_grid[position[0]][position[1]];
            cell.classList.add('start');
        }
        grid.appendChild(cell);
    }
}

function focusCell(index) {
    const cells = document.querySelectorAll('#wordle-grid .cell');
    let position = indexTo2D(index);
    console.log(position, game_data.start_grid[position[0]][position[1]])
    if(game_data.start_grid[position[0]][position[1]] != null)
        return;
    if (index >= 0 && index < cells.length) {
        cells[index].focus();
    }
}

function moveFocus(direction) {
    const cells = document.querySelectorAll('#wordle-grid .cell');
    const current = document.activeElement;
    let index = Array.from(cells).indexOf(current);
    if (index >= 0) {
        if (direction === 'left') {
            if(index > 0)
                preemptive_index = index - 1;
            do {
                index--;
            } while(index > 0 && startGridAtIndex(index) != null);
            focusCell(index);
        } else if (direction === 'right') {
            if(index < cells.length - 1)
                preemptive_index = index + 1;
            do {
                index++;
            } while(index < cells.length - 1 && startGridAtIndex(index) != null);
            focusCell(index);
        } else if (direction === 'up') {
            if(index >= game_data.width)
                preemptive_index = index - game_data.width;
            do {
                index -= game_data.width;
            }
            while(index >= game_data.width && startGridAtIndex(index) != null);
            focusCell(index);
        } else if (direction === 'down') {
            if(index < cells.length - game_data.width)
                preemptive_index = index + game_data.width;
            do {
                index += game_data.width;
            }
            while(index < cells.length - game_data.width && startGridAtIndex(index) != null);
            focusCell(index);
        }
    }
}

let last_key = new Date().getTime();
let preemptive_index = null;
const PREEMPTIVE_TYPING_TIME = 500;

function handleKeydown(event, index) {
    const key = event.key.toUpperCase();
    const cells = document.querySelectorAll('#wordle-grid .cell');

    if (key === 'BACKSPACE') {
        if(new Date().getTime() - last_key < PREEMPTIVE_TYPING_TIME && startGridAtIndex(preemptive_index) != null){
            preemptive_index--;
        }else{
            if(cells[index].textContent == '' && index > 0){
                cells[index-1].textContent = '';
                moveFocus('left');
            }else{
                cells[index].textContent = '';
            }
        }
        last_key = new Date().getTime();
    } else if (key === 'ARROWRIGHT' && index < 29) {
        moveFocus('right');
    } else if (key === 'ARROWLEFT' && index > 0) {
        moveFocus('left');
    } else if (key === 'ARROWUP' && index > 0) {
        moveFocus('up');
    } else if (key === 'ARROWDOWN' && index < 29) {
        moveFocus('down');
    } else if (key.length === 1 && key >= 'A' && key <= 'Z') {
        if(new Date().getTime() - last_key < PREEMPTIVE_TYPING_TIME && startGridAtIndex(preemptive_index) != null){
            preemptive_index--;
        }else{
            cells[index].textContent = key;
            moveFocus('right');
        }
        last_key = new Date().getTime();
    }
}

function submitGuess() {
    // Add logic to handle the guess
    // Compare with the target word
    // Update the grid with colors
}
