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

function stringToGrid(string){
    let transpose = string.split('\n')
    let grid = [];
    for(let i = 0; i < transpose[0].length; i++){
        grid[i] = [];
    }
    for(let j = 0; j < transpose.length; j++){
        var column = transpose[j].split('');
        for(let i = 0; i < column.length; i++){
            grid[i][j] = column[i];
        }
    }
    return grid;
}

function startGame(data){
    // Choose a random grid
    let s = data[parseInt(Math.random() * data.length)];

    let game_grid = stringToGrid(s["solution"]);

    // Add hints
    let hint_order = s["order"];
    let pattern = s["solution"].split('\n');
    let difficulty = 6;
    let start_grid = [];
    for(let k = 0; k < difficulty; k++){
        for(let i = 0; i < hint_order[0].length; i++){
            start_grid[i] = [];
            for(let j = 0; j < hint_order.length; j++){
                if(hint_order[j][i] >= difficulty){
                    start_grid[i][j] = game_grid[i][j];
                    pattern[j][i] = '.';
                }
            }
        }
    }

    // Find all possible solutions
    pattern = pattern.join('\n');
    console.log(pattern)
    let solutions = [];
    for(let k=0; k<data.length; k++){
        let words = data[k]["solution"];

        // Check if words fits the pattern with regex
        let regex = new RegExp(pattern, 'g');
        let matches = words.match(regex);
        if(matches != null){
            solutions.push(stringToGrid(words).flat().join(""));
        }
    }

    console.log(solutions)

    game_data = {
        width: game_grid[0].length,
        hight: game_grid.length,
        grid: game_grid,
        start_grid: start_grid,
        solutions: solutions,
        won: false
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
    if(game_data.won) return;
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
    if(game_data.won) return;

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

        // Check if the game is over
        let a_cell_is_empty = false;
        let solution_string = '';
        for(let i = 0; i < cells.length; i++){
            if(cells[i].textContent == ''){
                a_cell_is_empty = true;
                break;
            }
            solution_string += cells[i].textContent;
        }

        if(!a_cell_is_empty)
            submitGuess(solution_string);
    }
}

function submitGuess(string) {
    string = string.toLowerCase();
    // Check if string is in game_data.solutions
    let solution_found = false;
    for(let i = 0; i < game_data.solutions.length; i++){
        if(string == game_data.solutions[i]){
            solution_found = true;
            break;
        }
    }

    if(solution_found){
        game_data.won = true;
        document.querySelectorAll('#wordle-grid .cell').forEach((cell) => {
            if(!cell.classList.contains('start'))
                cell.classList.add('won');
        });
    } else {
        shakeBoard();
    }
}


function shakeBoard(){
    // Shake #wordle-grid
    let grid = document.getElementById('wordle-grid');
    grid.classList.add('shake');
    setTimeout(() => {
        grid.classList.remove('shake');
    }, 500);
}