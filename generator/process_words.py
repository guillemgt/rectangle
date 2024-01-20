import nltk
import json
nltk.download('wordnet')
from pattern.en import conjugate, pluralize, comparative, superlative
from tqdm import tqdm

def get_morphological_variations_multi_pos(words):
    new_words = set()

    for word in tqdm(words):
        word_variations = set([word])

        # Generate verb variations
        try:
            verb_forms = [
                conjugate(word, tense='infinitive'),
                conjugate(word, tense='present'),  # base form
                conjugate(word, tense='past'),
                conjugate(word, tense='participle'),
                conjugate(word, tense='present', person=3, number='singular')  # 3rd person singular
            ]
            word_variations.update(filter(None, verb_forms))
        except:
            pass
        
        # Generate noun variations
        try:
            word_variations.add(pluralize(word))
        except:
            pass

        # Generate adjective variations
        try:
            adj_forms = [comparative(word), superlative(word)]
            word_variations.update(filter(None, adj_forms))
        except:
            pass

        new_words.update(word_variations)

    new_words = [w.split() for w in new_words]
    new_words = [x for ws in new_words for x in ws]
    new_words = set(new_words)

    return new_words

word_frequencies = json.load(open('wordsFreq.json'))
word_frequencies = {word: freq for word, freq in word_frequencies.items() if freq > 0}
word_list = set(list(open('words_original.txt', 'r', encoding='utf8').read().split('\n')))
print(len(word_list), "input words")
word_list = {w for w in word_list if w in word_frequencies}
print(len(word_list), "after filtering")

word_list = get_morphological_variations_multi_pos(word_list)
print(len(word_list), "after morphological variations")
with open('words.txt','w') as file:
    file.write("\n".join(list(word_list)))