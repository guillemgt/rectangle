

document.addEventListener("DOMContentLoaded", () => {
    loadData();

    document.getElementById('new-game').addEventListener('click', () => {
        initializeGrid(game_data);
        document.getElementById('intro').classList.add('hidden');
        document.getElementById('main').classList.remove('hidden');
        startTimer();
        
        adjustScale();
        requestAnimationFrame(adjustScale);
    });
    document.getElementById('game-won-close').addEventListener('click', () => {
        document.getElementById('game-won').close();
    });

    if(navigator.share){
        document.getElementById('share-result').classList.remove('hidden');
    }
    document.getElementById('share-result').addEventListener('click', () => {
        if(navigator.share){
            let date = new Date();
            let year = date.getFullYear();
            let month = date.getMonth();
            let day = date.getDate();
            navigator.share({
                title: 'Rectangle',
                text: `I completed the ${day}/${month+1}/${year} Rectangle in ${document.getElementById('timer').innerText}!`,
                url: 'https://tarr.ch/rectangle/'
            })
            .then(() => console.log('Successful share'))
            .catch((error) => console.log('Error sharing', error));
        }
    });

    document.querySelectorAll('#keyboard .keyboard-button').forEach((key_button) => {
        key_button.addEventListener('click', () => {
            let key = key_button.innerHTML.toUpperCase();
            if(key == 'NEXT'){
                key = 'ARROWRIGHT';
            }else if(key == 'DEL'){
                key = 'BACKSPACE';
            }
            handleKeydown(key);
        });
    });
    window.addEventListener('keydown', (e) => handleKeydown(e.key.toUpperCase()));

    // Adjust scale on window resize
    window.addEventListener('resize', adjustScale);
});

async function loadData(){
    try {
        const response = await fetch('games.msgpack.gz');
        const arrayBuffer = await response.arrayBuffer();
    
        // Decompress the gzipped data using pako
        const decompressedData = pako.ungzip(new Uint8Array(arrayBuffer));
    
        // Decode the MessagePack data
        const data = msgpack.decode(decompressedData);
    
        // Set up the data
        data["words"].forEach(word => {
            game_words.add(word);
        });
        startGame(data);

        // Show the play button
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('new-game').classList.remove('hidden');
    } catch (error) {
        console.error('Error fetching, decompressing, or decoding data:', error);
    }
}


function getUniformRandomPerDay(){
    let date = new Date(); 
    let year = date.getFullYear();
    let month = date.getMonth();
    let day = date.getDate();

    let seed = (day*100+month)*10000+year;
    for(let i=0; i<314; i++){
        seed = (seed * 9301 + 49297) % 233281;
    }
    return seed / 233281;
}

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

function findIndex(probability_map, p, start=0, end=null){
    if(end == null)
        end = probability_map.length;
    if(end == start + 1)
        return start;

    half_index = parseInt((end+start)/2);
    if(probability_map[half_index] > p){
        return findIndex(probability_map, p, start, half_index);
    }else{
        return findIndex(probability_map, p, half_index, end);
    }
}

function startGame(all_data){
    let data = all_data["grids"];
    let probability_map = all_data["probability_map"];
    // Choose a random grid
    let uniform_random = getUniformRandomPerDay();
    let game_index = findIndex(probability_map, uniform_random);
    let s = data[game_index];

    let game_grid = stringToGrid(s["solution"]);

    // Add hints
    let hint_order = s["order"];
    let pattern = s["solution"].split('\n');
    let difficulty = hint_order.length*hint_order[0].length/3;
    let start_grid = [];
    for(let k = 0; k < difficulty; k++){
        for(let i = 0; i < hint_order[0].length; i++){
            start_grid[i] = [];
            for(let j = 0; j < hint_order.length; j++){
                if(hint_order[j][i] != parseInt(hint_order[j][i]) || hint_order[j][i] >= difficulty){
                    start_grid[i][j] = game_grid[i][j];
                    pattern[j][i] = '.';
                }
            }
        }
    }

    // Find all possible solutions
    pattern = pattern.join('\n');
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

    game_data = {
        width: game_grid[0].length,
        hight: game_grid.length,
        grid: game_grid,
        start_grid: start_grid,
        solutions: solutions,
        won: false
    }
}

function indexTo2D(index){
    return [parseInt(index / game_data.width), index % game_data.width];
}
function startGridAtIndex(index){
    let position = indexTo2D(index);
    return game_data.start_grid[position[0]][position[1]];
}

let game_data = null;
let game_words = new Set();

function initializeGrid(game_data) {
    let grid = document.getElementById('wordle-grid');
    grid.style['grid-template-columns'] = `repeat(${game_data.width}, 1fr)`; // Set the number of columns
    const cell_size = 70;
    const cell_spacing = 10;
    grid.style['min-width'] = `${game_data.width*(cell_size+cell_spacing)-cell_spacing}px`;
    let seen_free_cell = false;
    for (let i = 0; i < game_data.width*game_data.hight; i++) {
        let cell = document.createElement('div');
        cell.className = 'cell';
        cell.tabIndex = 0; // Make the cell focusable
        cell.addEventListener('mousedown', (e) => { e.preventDefault(); return false; });
        cell.addEventListener('click', (e) => { focusCell(i) });
        let position = indexTo2D(i);
        if(game_data.start_grid[position[0]][position[1]] != null){
            cell.textContent = game_data.start_grid[position[0]][position[1]];
            cell.classList.add('start');
        }else{
            if(!seen_free_cell){
                seen_free_cell = true;
                cell.classList.add('focus');
            }
        }
        grid.appendChild(cell);
    }
}

function focusCell(index) {
    const cells = document.querySelectorAll('#wordle-grid .cell');
    if(cells[index].classList.contains('start'))
        return;
    cells.forEach((cell) => { cell.classList.remove('focus'); });
    if(game_data.won) return;
    let position = indexTo2D(index);
    if(game_data.start_grid[position[0]][position[1]] != null)
        return;
    if (index >= 0 && index < cells.length) {
        cells[index].classList.add('focus');
    }
}

function moveFocus(direction) {
    const cells = document.querySelectorAll('#wordle-grid .cell');
    let index = Array.from(cells).indexOf(document.querySelector('#wordle-grid .focus'));
    let tries = cells.length;
    if (index < 0) {
        focusCell(0);
    } else if (direction === 'left') {
        while(tries > 0){
            index--;
            if(index < 0)
                index = cells.length - 1;
            if(cells[index].textContent == ''){
                focusCell(index);
                break;
            }
            tries--;
        }
    } else if (direction === 'right') {
        while(tries > 0){
            index++;
            if(index >= cells.length)
                index = 0;
            if(cells[index].textContent == ''){
                focusCell(index);
                break;
            }
            tries--;
        }
    } else if (direction === 'up') {
        while(tries > 0){
            index -= game_data.width;
            if(index < 0)
                index += cells.length-1;
            if(cells[index].textContent == ''){
                focusCell(index);
                break;
            }
            tries--;
        }
    } else if (direction === 'down') {
        while(tries > 0){
            index += game_data.width;
            if(index >= cells.length)
                index -= cells.length-1;
            if(cells[index].textContent == ''){
                focusCell(index);
                break;
            }
            tries--;
        }
    }
}

let last_key = new Date().getTime();
let preemptive_index = null;
const PREEMPTIVE_TYPING_TIME = 500;

function handleKeydown(key) {
    const cells = document.querySelectorAll('#wordle-grid .cell');
    let index = Array.from(cells).indexOf(document.querySelector('#wordle-grid .focus'));
    if(index < 0)
        index = 0;
    while(cells[index].classList.contains('start')){
        index++;
        if(index >= cells.length)
            index = 0;
    }


    if(game_data.won) return;
    if (key === 'BACKSPACE') {
        if(new Date().getTime() - last_key < PREEMPTIVE_TYPING_TIME && startGridAtIndex(preemptive_index) != null){
            preemptive_index--;
        }else{
            if(cells[index].textContent == '' && index > 0 && !cells[index-1].classList.contains('start')){
                cells[index-1].textContent = '';
                moveFocus('left');
            }else{
                cells[index].textContent = '';
            }
        }
        last_key = new Date().getTime();
        checkGame();
    } else if (key === 'ARROWRIGHT') {
        moveFocus('right');
    } else if (key === 'ARROWLEFT') {
        moveFocus('left');
    } else if (key === 'ARROWUP') {
        moveFocus('up');
    } else if (key === 'ARROWDOWN') {
        moveFocus('down');
    } else if (key.length === 1 && key >= 'A' && key <= 'Z') {
        if(new Date().getTime() - last_key < PREEMPTIVE_TYPING_TIME && startGridAtIndex(preemptive_index) != null){
            preemptive_index--;
        }else{
            cells[index].textContent = key;
            checkGame();
            if(!cells[index].classList.contains('wrong-row') && !cells[index].classList.contains('wrong-col'))
                moveFocus('right');
        }
        last_key = new Date().getTime();
    }
}

function checkGame(){
    const cells = document.querySelectorAll('#wordle-grid .cell');

    let row_words = [];
    let col_words = [];
    let all_filled = true;

    for(let i = 0; i < cells.length; i++){
        let row_idx = parseInt(i / game_data.width);
        let col_idx = i % game_data.width;

        if(row_words[row_idx] === undefined)
            row_words[row_idx] = '';
        if(col_words[col_idx] === undefined)
            col_words[col_idx] = '';
        
        if(cells[i].textContent != ''){
            if(row_words[row_idx] != null)
                row_words[row_idx] += cells[i].textContent;
            if(col_words[col_idx] != null)
                col_words[col_idx] += cells[i].textContent;
        }else{
            row_words[row_idx] = null;
            col_words[col_idx] = null;
            all_filled = false;
        }
    }

    cells.forEach((cell) => {
        cell.classList.remove('wrong-row');
        cell.classList.remove('wrong-col');
    });
    
    let lost = false;
    for(let i = 0; i < row_words.length; i++){
        if(row_words[i] == null){
            lost = true;
            continue;
        }
        if(!game_words.has(row_words[i].toLowerCase())){
            lost = true;
            for(let j = 0; j < row_words[i].length; j++){
                let cell = cells[i*game_data.width+j];
                cell.classList.add('wrong-row');
            }
        }
    }
    for(let i = 0; i < col_words.length; i++){
        if(col_words[i] == null){
            lost = true;
            continue;
        }
        if(!game_words.has(col_words[i].toLowerCase())){
            lost = true;
            for(let j = 0; j < col_words[i].length; j++){
                let cell = cells[i+j*game_data.width];
                cell.classList.add('wrong-col');
            }
        }
    }

    if(all_filled){
        if(!lost){
            winGame();
        }else{
            shakeBoard();
        }
    }

};

function winGame(){
    game_data.won = true;
    document.querySelectorAll('#wordle-grid .cell').forEach((cell) => {
        // Change cells to winning state
        cell.classList.remove('focus');
        if(!cell.classList.contains('start'))
            cell.classList.add('won');

        // Show win dialog
        let win_dialog = document.getElementById('game-won');
        document.getElementById('game-won-time').innerText = document.getElementById('timer').innerText;
        win_dialog.showModal();

        // Stop timer
        stopTimer();

        // Show the share button
        document.getElementById('show-dialog-button').classList.remove('hidden');
    });

}

function showWinDialog(){
    let win_dialog = document.getElementById('game-won');
    win_dialog.showModal();
}

function shakeBoard(){
    // Shake #wordle-grid
    let grid = document.getElementById('wordle-grid');
    grid.classList.add('shake');
    setTimeout(() => {
        grid.classList.remove('shake');
    }, 500);
}

let the_timer = null;
function startTimer(){
    let timer = document.getElementById('timer');
    let start_time = new Date().getTime();
    the_timer = setInterval(() => {
        let time = new Date().getTime() - start_time;
        let seconds = parseInt(time / 1000);
        let minutes = parseInt(seconds / 60);
        seconds = seconds % 60;
        timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}
function stopTimer(){
    clearInterval(the_timer);
}

function resizeToFitWidth(selector, max_width=600){
    // const div = document.querySelector(selector);
    // max_width = Math.min(max_width, window.innerWidth);
    // let scale = max_width / window.innerWidth;
    // div.style.transform = `scale(${scale})`;
}

function adjustScale() {
    // return;
    // resizeToFitWidth('html');

    const flexItem1 = document.getElementById('keyboard');
    const flexItem2 = document.getElementById('wordle-grid');
    flexItem1.style.transform = 'translateX(-50%)';
    flexItem2.style.transform = `translateX(-50%)`;
    flexItem2.style.position = 'absolute';
    flexItem2.style.left = '50%';

    const window_width = document.documentElement.clientWidth;
    const window_height = document.documentElement.clientHeight;

    const keyboardScaleFactor = window_width / flexItem1.offsetWidth;

    console.log(keyboardScaleFactor)

    if (keyboardScaleFactor < 1) {
        // Apply the scale factor to the flex items and font size
        flexItem1.style.transform = `translateX(-50%) translateY(+50%) scale(${keyboardScaleFactor}) translateY(-50%)`;
    }

    const maxHeightForWordleGrid = window_height - flexItem2.offsetTop - flexItem1.offsetHeight;
    const gridScaleFactor = Math.min(
        maxHeightForWordleGrid / flexItem2.offsetHeight,
        window_width / flexItem2.offsetWidth,
        keyboardScaleFactor
    );

    console.log(document.documentElement.clientHeight, flexItem2.offsetTop, flexItem1.offsetHeight, gridScaleFactor)

    if(gridScaleFactor < 1){
        flexItem2.style.transform = `translateX(-50%) translateY(-50%) scale(${gridScaleFactor}) translateY(+50%)`;
    }
}