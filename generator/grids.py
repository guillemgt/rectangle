import json
from tqdm import tqdm
from collections import Counter
import json
import math

class TrieNode:
    def __init__(self):
        self.children = {}
        self.frequency = 0

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word, frequency=1):
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.frequency = frequency

    def display(self, node=None, word=''):
        if node is None:
            node = self.root
        
        if node.frequency > 0:
            print(word)
        
        for char, next_node in node.children.items():
            self.display(next_node, word + char)

    def get_next_chars(self, word='', node=None):
        if node is None:
            node = self.root

        if len(word) == 0:
            for char, next_node in node.children.items():
                yield char
        
        char = word[0]
        if char in node.children:
            yield from self.get_next_chars(word[1:], node.children[char])

def fill_grid(hor_trie_grid: list[list[TrieNode]], ver_trie_grid: list[list[TrieNode]], letter_grid, row_trie, current_index):
    if current_index[0] == grid_size[0]:
        yield letter_grid
        return

    row_index, col_index = current_index

    left_node = hor_trie_grid[row_index][col_index - 1] if col_index > 0 else row_trie.root
    up_node = ver_trie_grid[row_index - 1][col_index]

    possibilities = Counter([c for c in left_node.children.keys()]) & Counter([c for c in up_node.children.keys()])

    if current_index == (len(letter_grid) - 1, len(letter_grid[0]) - 1):

        for char in possibilities:
            hor_trie_grid[row_index][col_index] = left_node.children[char]
            ver_trie_grid[row_index][col_index] = up_node.children[char]
            letter_grid[row_index][col_index] = char
            freq_sum = sum(hor_trie_grid[i][col_index].frequency for i in range(grid_size[0])) + sum(ver_trie_grid[row_index][i].frequency for i in range(grid_size[1]))

            yield freq_sum, '\n'.join(''.join(row) for row in letter_grid)

    else:

        for char in possibilities:
            hor_trie_grid[row_index][col_index] = left_node.children[char]
            ver_trie_grid[row_index][col_index] = up_node.children[char]
            letter_grid[row_index][col_index] = char
            next_index = (row_index, col_index + 1) if col_index < grid_size[1] - 1 else (row_index + 1, 0)
            yield from fill_grid(hor_trie_grid, ver_trie_grid, letter_grid, row_trie, next_index)





word_frequencies = json.load(open('wordsFreq.json'))

# Sort the words by frequency and print them
# sorted_words = sorted(word_frequencies.items(), key=lambda x: x[1], reverse=True)
# for word, freq in sorted_words:
#     if freq > 100_000:
#         print(word, freq)
#         break

word_frequencies = {word: math.log10(freq) for word, freq in word_frequencies.items() if freq > 1_000_000}
word_list = list(open('words.txt', 'r', encoding='utf8').read().split('\n'))
word_frequencies = {word: word_frequencies[word] for word in word_list if word in word_frequencies}


output = {}

max_length = 10

for x in range(2, max_length):
    for y in range(x, max_length):
        print(x, y)
        grid_size = (x, y)
        tries = (Trie(), Trie())
        words = [[], []]

        for axis in range(2):
            words[axis] = [word for word, freq in word_frequencies.items() if len(word) == grid_size[axis]]
            trie = tries[axis]
            for word in words[axis]:
                freq = word_frequencies[word]
                trie.insert(word, freq)

        found_grids = []

        for first_word in tqdm(words[1]):
            hor_trie_grid = [[None for _ in range(grid_size[1])] for _ in range(grid_size[0])]
            hor_trie_grid[0][0] = tries[1].root.children[first_word[0]]
            for i in range(1, grid_size[1]):
                hor_trie_grid[0][i] = hor_trie_grid[0][i-1].children.get(first_word[i], None)
                if hor_trie_grid[0][i] is None:
                    break
            ver_trie_grid = [[None for _ in range(grid_size[1])] for _ in range(grid_size[0])]
            ver_trie_grid[0] = [tries[0].root.children.get(c, None) for c in first_word]
            if None in ver_trie_grid[0]:
                continue
            letter_grid = [[None for _ in range(grid_size[1])] for _ in range(grid_size[0])]
            letter_grid[0] = [c for c in first_word]

            for result in fill_grid(hor_trie_grid, ver_trie_grid, letter_grid, tries[1], (1, 0)):
                found_grids.append(result)


        found_grids = sorted(found_grids, key=lambda x: x[0], reverse=True)

        key = str((x, y))
        output[key] = []
        with open("grids.txt", "w") as f:
            for freq, grid in found_grids:
                output[key].append({'freq': freq, 'grid': grid})


json.dump(output, open('grids.json', 'w'))