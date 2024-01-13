import json

data = json.load(open('grids.json'))

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

for i in range(4, 10):
    for j in range(i+1, 10):
        key = str((i, j))
        for el in data[key]:
            new_data.append(el["grid"])

json.dump(new_data, open('games.json', 'w'), indent=1)