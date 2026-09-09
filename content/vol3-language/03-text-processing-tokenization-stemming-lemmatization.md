---
title: "Text Processing — Tokenization, Stemming, Lemmatization"
volume: "vol3-language"
part: "Part I — NLP — Foundations to Advanced"
chapter_number: 3
source_pages: "7-12"
---

# Text Processing — Tokenization, Stemming, Lemmatization

Text Processing — Tokenization, Stem-
ming, Lemmatization
Language is continuous. Models are discrete. Preprocessing is the bridge.
Type: Build Languages: Python Prerequisites: Phase 2 · 14 (Naive Bayes) Time: ~45
minutes
The Problem
A model cannot read “The cats were running.” It reads integers.
Every NLP system opens with the same three questions. Where does a word start. What is
the root of the word. How do we treat “run”, “running”, “ran” as the same thing when it helps,
and as different things when it doesn’t.
Get tokenization wrong and the model learns from garbage. If your tokenizer treats don't
as one token but do n't as two, the training distribution splits. If your stemmer collapses
organization and organ to the same stem, topic modeling dies. If your lemmatizer needs
part-of-speech context but you don’t pass it, verbs get treated as nouns.
This lesson builds the three preprocessing steps from scratch, then shows how NLTK and
spaCy do the same work so you can see the tradeoffs.
The Concept
Three operations. Each has a job and a failure mode.
Tokenization splits a string into tokens. “Token” is deliberately vague because the right
granularity depends on the task. Word-level for classical NLP. Subword for transformers.
Character for languages without whitespace.
Stemming chops suffixes with rules. Fast, aggressive, dumb. running -> run. organization
-> organ. That second one is the failure mode.
Lemmatization reduces a word to its dictionary form using grammar knowledge. Slower,
accurate, needs a lookup table or morphological analyzer. ran -> run (needs to know “ran”
is past tense of “run”). better -> good (needs to know comparative forms).
Rule of thumb. Stem when speed matters and you can tolerate noise (search indexing, rough
classification). Lemmatize when meaning matters (question answering, semantic search, any-
thing the user will read).
Interactive figure: edit-distance. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/05-nlp-
foundations-to-advanced/01-text-processing
AIENGINEERINGFROMSCRATCH.COM 4

TEXT PROCESSING — TOKENIZATION, STEMMING, LEMMATIZATION
Build It
Step 1: a regex word tokenizer
The simplest useful tokenizer splits on non-alphanumeric characters while keeping punctua-
tion as its own tokens. Not perfect, not final, but it runs in one line.
import re
def tokenize(text):
return re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?|[0-9]+|[^\sA-Za-z0-9]", text)
Three patterns in order of precedence. Words with optional inner apostrophe (don't, it's).
Pure numbers. Any single non-whitespace non-alphanumeric character as a standalone token
(punctuation).
>>> tokenize("The cats weren't running at 3pm.")
['The', 'cats', "weren't", 'running', 'at', '3', 'pm', '.']
Failure modes to notice. 3pm splits to ['3', 'pm'] because we alternated between letter runs
and digit runs. Good enough for most tasks. URLs, emails, hashtags all break. For production,
add patterns before the general ones.
Step 2: a Porter stemmer (step 1a only)
The full Porter algorithm has five phases of rules. Step 1a alone covers the most frequent
English suffixes and teaches the pattern.
def stem_step_1a(word):
if word.endswith("sses"):
return word[:-2]
if word.endswith("ies"):
return word[:-2]
if word.endswith("ss"):
return word
if word.endswith("s") and len(word) > 1:
return word[:-1]
return word
>>> [stem_step_1a(w) for w in ["caresses", "ponies", "caress", "cats"]]
['caress', 'poni', 'caress', 'cat']
Read the rules top-down. The ies -> i rule is why ponies -> poni, not pony. Real Porter has
step 1b that would fix it. Rules compete. Earlier rules win. The order matters more than any
single rule.
Step 3: a lookup-based lemmatizer
Lemmatization proper needs morphology. A tractable teaching version uses a small lemma
table and a fallback.
LEMMA_TABLE = {
("running", "VERB"): "run",
("ran", "VERB"): "run",
("runs", "VERB"): "run",
("better", "ADJ"): "good",
("best", "ADJ"): "good",
AIENGINEERINGFROMSCRATCH.COM 5

TEXT PROCESSING — TOKENIZATION, STEMMING, LEMMATIZATION
("cats", "NOUN"): "cat",
("cat", "NOUN"): "cat",
("were", "VERB"): "be",
("was", "VERB"): "be",
("is", "VERB"): "be",
}
def lemmatize(word, pos):
key = (word.lower(), pos)
if key in LEMMA_TABLE:
return LEMMA_TABLE[key]
if pos == "VERB" and word.endswith("ing"):
return word[:-3]
if pos == "NOUN" and word.endswith("s"):
return word[:-1]
return word.lower()
>>> lemmatize("running", "VERB")
'run'
>>> lemmatize("cats", "NOUN")
'cat'
>>> lemmatize("better", "ADJ")
'good'
>>> lemmatize("watched", "VERB")
'watched'
The last case is the key teaching moment. watched is not in our table and our fallback only
handles ing. Real lemmatization covers ed, irregular verbs, comparative adjectives, plurals
with sound changes (children -> child). This is why production systems use WordNet,
spaCy’s morphologizer, or a full morphological analyzer.
Step 4: pipe them together
def preprocess(text, pos_tagger=None):
tokens = tokenize(text)
stems = [stem_step_1a(t.lower()) for t in tokens]
tags = pos_tagger(tokens) if pos_tagger else [(t, "NOUN") for t in tokens]
lemmas = [lemmatize(word, pos) for word, pos in tags]
return {"tokens": tokens, "stems": stems, "lemmas": lemmas}
The missing piece is a POS tagger. Phase 5 · 07 (POS Tagging) builds one. For now, default
everything to NOUN and acknowledge the limitation.
Use It
NLTK and spaCy ship the production versions. A few lines each.
NLTK
import nltk
nltk.download("punkt_tab")
nltk.download("wordnet")
nltk.download("averaged_perceptron_tagger_eng")
AIENGINEERINGFROMSCRATCH.COM 6

TEXT PROCESSING — TOKENIZATION, STEMMING, LEMMATIZATION
from nltk.tokenize import word_tokenize
from nltk.stem import PorterStemmer, WordNetLemmatizer
from nltk import pos_tag
text = "The cats were running."
tokens = word_tokenize(text)
stems = [PorterStemmer().stem(t) for t in tokens]
lemmatizer = WordNetLemmatizer()
tagged = pos_tag(tokens)
def nltk_pos_to_wordnet(tag):
if tag.startswith("V"):
return "v"
if tag.startswith("J"):
return "a"
if tag.startswith("R"):
return "r"
return "n"
lemmas = [lemmatizer.lemmatize(t, nltk_pos_to_wordnet(tag)) for t, tag in tagged]
word_tokenize handles contractions, Unicode, edge cases your regex misses. PorterStemmer
runs all five phases. WordNetLemmatizer needs the POS tag translated from NLTK’s Penn
Treebank scheme to WordNet’s abbreviation set. The translation wiring above is the bit most
tutorials skip.
spaCy
import spacy
nlp = spacy.load("en_core_web_sm")
doc = nlp("The cats were running.")
for token in doc:
print(token.text, token.lemma_, token.pos_)
The the DET
cats cat NOUN
were be AUX
running run VERB
. . PUNCT
spaCy hides the whole pipeline behind nlp(text). Tokenization, POS tagging, and lemmati-
zation all run. Faster than NLTK at scale. More accurate out of the box. The tradeoff is that
you cannot easily swap individual components.
When to pick which
Situation Pick
Teaching, research, swapping components NLTK
Production, multi-language, speed matters spaCy
AIENGINEERINGFROMSCRATCH.COM 7

TEXT PROCESSING — TOKENIZATION, STEMMING, LEMMATIZATION
Situation Pick
Transformer pipeline (you’ll tokenize with the model’s Use tokenizers / transformers
tokenizer anyway) and skip classical
preprocessing
The two failure modes nobody warns you about
Most tutorials teach the algorithms and stop. Two things will bite a real preprocessing
pipeline, and they are almost never covered.
Reproducibility drift. NLTK and spaCy change tokenization and lemmatizer behavior be-
tween versions. What produced ['do', "n't"] in spaCy 2.x may produce ["don't"] in 3.x.
Your model was trained on one distribution. Inference now runs on a different one. Accuracy
quietly degrades and nobody knows why. Pin library versions in requirements.txt. Write
a preprocessing regression test that freezes expected tokenization of 20 sample sentences.
Run it on every upgrade.
Training / inference mismatch. Train with aggressive preprocessing (lowercase, stopword
removal, stemming), deploy on raw user input, watch performance crater. This is the single
most common production NLP failure. If you preprocess during training, you must run the
identical function during inference. Ship preprocessing as a function inside the model pack-
age, not as a notebook cell the serving team rewrites.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/05-nlp-foundations-to-advanced/01-text-
processing
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/05-nlp-foundations-to-advanced/01-text-
processing/code
1. Easy. Extend tokenize to keep URLs as single tokens. Test: tokenize("Visit
https://example.com today.") should produce one URL token.
2. Medium. Implement Porter step 1b. If a word contains a vowel and ends in ed or ing,
remove it. Handle the double-consonant rule (hopping -> hop, not hopp).
3. Hard. Build a lemmatizer that uses WordNet as a lookup table but falls back to your
Porter stemmer when WordNet has no entry. Measure accuracy on a tagged corpus
against plain WordNet and plain Porter.
Key Terms
Term What people say What it actually means
Token A word Whatever unit the model consumes. Can be
word, subword, character, or byte.
Stem Root of a word Result of rule-based suffix stripping. Not
always a real word.
Lemma Dictionary form The form you’d look up. Requires
grammatical context to compute correctly.
AIENGINEERINGFROMSCRATCH.COM 8

TEXT PROCESSING — TOKENIZATION, STEMMING, LEMMATIZATION
Term What people say What it actually means
POS tag Part of speech Category like NOUN, VERB, ADJ. Needed
to lemmatize accurately.
Morphology Word shape rules How a word changes form based on tense,
number, case. Lemmatization depends on
it.
Further Reading
• Porter, M. F. (1980). An algorithm for suffix stripping — the original paper, five pages,
still the clearest explanation.
• spaCy 101 — linguistic features — how a real pipeline is wired.
• NLTK book, chapter 3 — tokenization edge cases you haven’t thought of yet.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/05-nlp-foundations-to-advanced/01-text-processing
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/05-nlp-foundations-to-advanced/01-text-processing/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/05-nlp-foundations-to-advanced/01-text-processing
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 9