import json
import math
import re
from tqdm import tqdm
from collections import Counter

import concurrent.futures
import functools

data = json.load(open('generator/grids.json'))

new_data = []

# for i in range(5, 9):
#     key = str((i, i))
#     for el in data[key]:
#         grid = el["grid"].split("\n")
#         symmetric = True
#         for j in range(i):
#             for k in range(j+1, i):
#                 if grid[j][k] != grid[k][j]:
#                     symmetric = False
#                     break

#         if not symmetric:
#             new_data.append(el["grid"])

word_frequencies = json.load(open('generator/wordsFreq.json'))
word_frequencies = {word: math.log10(freq) for word, freq in word_frequencies.items() if freq > 1_000_000}
word_list = list(open('generator/words.txt', 'r', encoding='utf8').read().split('\n'))
word_list = [w for w in word_list if w in word_frequencies]
word_frequencies = {word: word_frequencies[word] for word in word_list}

# entropy_cache = {}

# def get_entropy(word_pattern):
#     if word_pattern in entropy_cache:
#         return entropy_cache[word_pattern]
#     matching_words = [w for w in word_list if re.match(word_pattern, w)]
#     result = sum([1.0/word_frequencies[w] for w in matching_words])
#     entropy_cache[word_pattern] = result
#     return result

# @functools.lru_cache(maxsize=None)
# def get_entropy(word_pattern):
#     matching_words = [w for w in word_list if re.match(word_pattern, w)]
#     result = sum([1.0/word_frequencies[w] for w in matching_words])
#     return result

# def compute_score(string):
#     grid = [[c for c in line] for line in string.split("\n")]

#     score = 0

#     letters_to_remove = 8

#     # positions = []

#     while letters_to_remove > 0:
#         letters_to_remove -= 1
#         # Find the letter with the lowest entropy

#         best_entropy = float("inf")
#         best_position = None

#         for i in range(len(grid)):
#             for j in range(len(grid[i])):
#                 if grid[i][j] == ".":
#                     continue

#                 horizontal_word = [c for c in grid[i]]
#                 horizontal_word[j] = "."
                
#                 vertical_word = [grid[k][j] for k in range(len(grid))]
#                 vertical_word[i] = "."

#                 entropy = get_entropy("".join(horizontal_word)) + get_entropy("".join(vertical_word))
                
#                 if entropy < best_entropy:
#                     best_entropy = entropy
#                     best_position = (i, j)

#         # Replace the letter with the lowest entropy with a *
#         i, j = best_position
#         grid[i][j] = "."
#         # positions.append(best_position)

#         # Update the score
#         score += -best_entropy

#     # for k, (i, j) in enumerate(positions):
#     #     grid[i][j] = str(k)

#     return score, grid

@functools.lru_cache(maxsize=None)
def get_entropy(word_pattern):
    matching_words = [w for w in word_list if re.match(word_pattern, w)]
    return sum([1.0 / word_frequencies[w] for w in matching_words])

def compute_entropy_for_position(args):
    i, j, grid = args
    if grid[i][j] == ".":
        return float("inf"), None

    horizontal_word = [c for c in grid[i]]
    horizontal_word[j] = "."

    vertical_word = [grid[k][j] for k in range(len(grid))]
    vertical_word[i] = "."

    entropy = get_entropy("".join(horizontal_word)) + get_entropy("".join(vertical_word))
    return entropy, (i, j)

def compute_score(string):
    grid = [[c for c in line] for line in string.split("\n")]
    score = 0
    letters_to_remove = len(grid) * len(grid[0])
    removed_positions = []

    row_removals = [0 for _ in range(len(grid))]
    col_removals = [0 for _ in range(len(grid[0]))]

    while letters_to_remove > 0:
        letters_to_remove -= 1
        
        positions = [(i, j, grid) for i in range(len(grid)) for j in range(len(grid[i])) if row_removals[i] == 1 or col_removals[j] == 1]
        if len(positions) == 0:
            positions = [(i, j, grid) for i in range(len(grid)) for j in range(len(grid[i]))]

        with concurrent.futures.ThreadPoolExecutor() as executor:
            results = executor.map(compute_entropy_for_position, positions)

        best_entropy, best_position = min(results, key=lambda x: x[0])

        # Replace the letter with the lowest entropy with a '.'
        if best_position:
            i, j = best_position
            grid[i][j] = "."
            row_removals[i] += 1
            col_removals[j] += 1
            score += best_entropy
            removed_positions.append(best_position)

    for k, (i, j) in enumerate(removed_positions):
        grid[i][j] = k

    return score, grid




for i in range(5, 10):
    for j in range(i, 10):
        key = str((i, j))
        pbar = tqdm(data[key])
        pbar.set_description(key)
        for el in pbar:
            if i == j:
                grid = el["grid"].split("\n")
                symmetric_fails = 0
                for l in range(i):
                    for k in range(l+1, i):
                        if grid[l][k] != grid[k][l]:
                            symmetric_fails += 1
                if symmetric_fails < i-1:
                    continue

            horizontal_words = el["grid"].split("\n")
            vertical_words = ["".join([horizontal_words[i][j] for i in range(len(horizontal_words))]) for j in range(len(horizontal_words[0]))]
            words = list(set(horizontal_words + vertical_words))

            score, grid = compute_score(el["grid"])
            new_data.append({
                "solution": el["grid"],
                "order": grid,
                "difficulty": score,
                "words": words,
                "prob": 1.0
            })
            
        print("Found", len(new_data))


# ==================================================================================================
#  Compute probbability for each grid
# ==================================================================================================

word_appearances = Counter()
for x in new_data:
    for word in x["words"]:
        word_appearances[word] += x["prob"]

for x in new_data:
    the_max = max(word_appearances[w] for w in x["words"])
    x["prob"] = 1.0 / the_max

total_prob = sum(x["prob"] for x in new_data)
for x in new_data:
    x["prob"] = x["prob"] / total_prob

word_appearances = Counter()
for x in new_data:
    for word in x["words"]:
        word_appearances[word] += x["prob"]

# ==================================================================================================
#  Structure the data
# ==================================================================================================

probability_map = []
total_prob = 0.0

for i, x in enumerate(new_data):
    total_prob += x["prob"]
    probability_map.append(total_prob)
    del x["words"]
    del x["difficulty"]
    del x["prob"]

print("In total, found:", len(new_data))

json.dump({"grids": new_data, "probability_map": probability_map}, open('games.json', 'w'))