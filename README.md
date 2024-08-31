# Rectangle
Wordle-style game about filling in a rectangle with no clues. [Click here to play](tarr.ch/rectangle)

## Usage

Place a file containing a list of words (one per line) in `generator/data/words.txt` (for example, you can use the [12dicts word list](http://wordlist.aspell.net/12dicts-readme/)), and a JSON file mapping a word to its frequeny in some corpus.
You may want to change the frequency threshold used to filter the words in the Python files.

```
cd generator
python grids.py
python parse.py
```
(this will take a while to run, somewhere around 1-2h)

Then, move `generator/data/games.msgpack.js` to `public/`.
Run a webserver in that folder and you are set.