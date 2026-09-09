---
title: "Bag of Words, TF-IDF, and Text Representation"
volume: "vol3-language"
part: "Part I — NLP — Foundations to Advanced"
chapter_number: 4
source_pages: "13-18"
---

# Bag of Words, TF-IDF, and Text Representation

Bag of Words, TF-IDF, and Text Repre-
sentation
Count first, think later. TF-IDF still beats embeddings on well-defined tasks in 2026.
Type: Build Languages: Python Prerequisites: Phase 5 · 01 (Text Processing), Phase 2 · 02
(Linear Regression from Scratch) Time: ~75 minutes
The Problem
The model needs numbers. You have strings.
Every NLP pipeline has to answer the same question. How do we turn a variable-length
stream of tokens into a fixed-size vector that a classifier can consume. The first answer the
field landed on was the dumbest one that works. Count the words. Make a vector.
That vector has carried more production NLP than any embedding model. Spam filters, topic
classifiers, log anomaly detection, search ranking (before BM25), the first wave of sentiment
analysis, the first decade of academic NLP benchmarks. 2026 practitioners still reach for it
first on narrow classification tasks. It is fast, interpretable, and often indistinguishable from
a 400M-parameter embedding model on tasks where word presence is what matters.
This lesson builds bag of words, then TF-IDF, from scratch. Then shows scikit-learn doing the
same in three lines. Then names the failure mode that makes you reach for embeddings.
The Concept
Bag of Words (BoW) throws away order. For each document, count how many times each
vocabulary word appears. Vector length is the vocabulary size. Position i is the count of word
i.
TF-IDF reweights BoW. A word that appears in every document is uninformative, so scale it
down. A word rare across the corpus but frequent in a single document is signal, so scale it
up.
TF-IDF(w, d) = TF(w, d) * IDF(w)
= count(w in d) / |d| * log(N / df(w))
Where TF is term frequency in the document, df is document frequency (how many docs
contain the word), N is total documents. The log keeps the weight bounded for ubiquitous
words.
Key property: both produce sparse vectors with interpretable axes. You can look at a trained
classifier’s weights and read which words push a document toward each class. You cannot
do this with a 768-dimensional BERT embedding.
Interactive figure: bow-tfidf. This one moves. Watch it animate and drag its controls in
the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/05-nlp-
foundations-to-advanced/02-bag-of-words-tfidf
AIENGINEERINGFROMSCRATCH.COM 10

BAG OF WORDS, TF-IDF, AND TEXT REPRESENTATION
Build It
Step 1: build the vocabulary
def build_vocab(docs):
vocab = {}
for doc in docs:
for token in doc:
if token not in vocab:
vocab[token] = len(vocab)
return vocab
Input: list of tokenized documents (any word-level tokenizer will do; the code/main.py in this
lesson uses a simplified lowercase variant). Output: {word: index} dict. Stable insertion
order means word index 0 is the first word seen in the first document. Convention varies;
scikit-learn sorts alphabetically.
Step 2: bag of words
def bag_of_words(docs, vocab):
matrix = [[0] * len(vocab) for _ in docs]
for i, doc in enumerate(docs):
for token in doc:
if token in vocab:
matrix[i][vocab[token]] += 1
return matrix
>>> docs = [["cat", "sat", "on", "mat"], ["cat", "cat", "ran"]]
>>> vocab = build_vocab(docs)
>>> bag_of_words(docs, vocab)
[[1, 1, 1, 1, 0], [2, 0, 0, 0, 1]]
Rows are documents. Columns are vocabulary indices. Entry [i][j] is “how many times
word j appears in document i.” Doc 1 has cat twice because it did. Doc 0 has ran zero times
because it did not.
Step 3: term frequency and document frequency
import math
def term_frequency(doc_bow, doc_length):
return [c / doc_length if doc_length else 0 for c in doc_bow]
def document_frequency(bow_matrix):
df = [0] * len(bow_matrix[0])
for row in bow_matrix:
for j, count in enumerate(row):
if count > 0:
df[j] += 1
return df
AIENGINEERINGFROMSCRATCH.COM 11

BAG OF WORDS, TF-IDF, AND TEXT REPRESENTATION
def inverse_document_frequency(df, n_docs):
return [math.log((n_docs + 1) / (d + 1)) + 1 for d in df]
Two smoothing tricks worth naming. The (n+1)/(d+1) avoids log(x/0). The trailing +1 en-
sures a word in every document still has IDF 1 (not 0), matching scikit-learn’s default. Other
implementations use raw log(N/df). Both work; the smoothed version is friendlier.
Step 4: TF-IDF
def tfidf(bow_matrix):
n_docs = len(bow_matrix)
df = document_frequency(bow_matrix)
idf = inverse_document_frequency(df, n_docs)
out = []
for row in bow_matrix:
length = sum(row)
tf = term_frequency(row, length)
out.append([tf_j * idf_j for tf_j, idf_j in zip(tf, idf)])
return out
>>> docs = [
... ["the", "cat", "sat"],
... ["the", "dog", "sat"],
... ["the", "cat", "ran"],
... ]
>>> vocab = build_vocab(docs)
>>> bow = bag_of_words(docs, vocab)
>>> tfidf(bow)
Three documents, five vocab words (the, cat, sat, dog, ran). the appears in all three, so its
IDF is low. dog appears in one, so its IDF is high. The vectors are sparse (most entries are
small) and the discriminative words pop.
Step 5: L2-normalize rows
def l2_normalize(matrix):
out = []
for row in matrix:
norm = math.sqrt(sum(x * x for x in row))
out.append([x / norm if norm else 0 for x in row])
return out
Without normalization, a longer document gets a larger vector and dominates similarity
scores. L2 normalization puts every document on the unit hypersphere. Cosine similarity
between rows is now just a dot product.
Use It
scikit-learn ships the production version.
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
docs = ["the cat sat on the mat", "the dog sat on the mat", "the cat ran"]
bow_vectorizer = CountVectorizer()
AIENGINEERINGFROMSCRATCH.COM 12

BAG OF WORDS, TF-IDF, AND TEXT REPRESENTATION
bow = bow_vectorizer.fit_transform(docs)
print(bow_vectorizer.get_feature_names_out())
print(bow.toarray())
tfidf_vectorizer = TfidfVectorizer()
tfidf = tfidf_vectorizer.fit_transform(docs)
print(tfidf.toarray().round(3))
CountVectorizer does tokenization, vocabulary, and BoW in one call. TfidfVectorizer adds
IDF weighting and L2 normalization. Both return sparse matrices. For 100k documents, the
dense version does not fit in memory; stay sparse until the classifier demands dense.
Knobs that change everything:
Arg Effect
ngram_range=(1, 2) Include bigrams. Usually boosts classification.
min_df=2 Drop words in fewer than 2 docs. Trims vocabulary on
noisy data.
max_df=0.95 Drop words in more than 95% of docs. Approximates
stopword removal without a hardcoded list.
stop_words="english" scikit-learn’s builtin stopword list. Task-dependent —
sentiment analysis should not drop negations.
sublinear_tf=True Use 1 + log(tf) instead of raw tf. Helps when a term
repeats many times in one doc.
When TF-IDF still wins (as of 2026)
• Spam detection, topic labeling, log anomaly flagging. Word presence is what matters;
semantic nuance does not.
• Low-data regimes (hundreds of labeled examples). TF-IDF plus logistic regression has
no pretraining cost.
• Anywhere latency matters. TF-IDF plus a linear model answers in microseconds. Em-
bedding a document through a transformer takes 10-100ms.
• Systems that must explain their predictions. Inspect the classifier’s coefficients. Top
positive words are the reason.
When TF-IDF fails
The semantic blindness failure. Consider these two documents:
• “The movie was not good at all.”
• “The movie was excellent.”
One is a negative review. One is positive. Their TF-IDF overlap is exactly {the, movie, was}.
A bag-of-words classifier has to memorize that the word not near good flips the label. It can
learn this on enough data, but never as gracefully as a model that understands syntax.
The other failure: out-of-vocabulary words at inference. A BoW model trained on IMDb re-
views has no idea what to do with Zoomer-approved if that token never appeared in training.
Subword embeddings (lesson 04) handle this. TF-IDF cannot.
Hybrid: TF-IDF weighted embeddings
The 2026 pragmatic default for medium-data classification: use TF-IDF weights as attention
over word embeddings.
AIENGINEERINGFROMSCRATCH.COM 13

BAG OF WORDS, TF-IDF, AND TEXT REPRESENTATION
def tfidf_weighted_embedding(doc, tfidf_scores, embedding_table, dim):
vec = [0.0] * dim
total_weight = 0.0
for token in doc:
if token not in embedding_table or token not in tfidf_scores:
continue
weight = tfidf_scores[token]
emb = embedding_table[token]
for i in range(dim):
vec[i] += weight * emb[i]
total_weight += weight
if total_weight == 0:
return vec
return [v / total_weight for v in vec]
You get semantic capacity from embeddings, and rare-word emphasis from TF-IDF. Classifier
trains on the pooled vector. This outperforms either on its own for sentiment, topic, and intent
classification below about 50k labeled examples.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/05-nlp-foundations-to-advanced/02-bag-of-
words-tfidf
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/05-nlp-foundations-to-advanced/02-bag-of-
words-tfidf/code
1. Easy. Implement cosine_similarity(doc_vec_a, doc_vec_b) on the L2-normalized TF-
IDF output. Verify that identical documents score 1.0 and disjoint-vocabulary documents
score 0.0.
2. Medium. Add n-gram support to bag_of_words. Parameter n produces counts over n-
grams. Test that n=2 on ["the", "cat", "sat"] produces bigram counts for ["the cat",
"cat sat"].
3. Hard. Build the TF-IDF-weighted-embedding hybrid above using GloVe 100d vectors
(download once, cache). Compare classification accuracy against plain TF-IDF and plain
mean-pooled embeddings on the 20 Newsgroups dataset. Report which wins where.
Key Terms
Term What people say What it actually means
BoW Word frequency vector Counts of vocabulary words in one
document. Throws away order.
TF Term frequency Count of a word in a document, optionally
normalized by document length.
DF Document frequency Count of documents containing the word at
least once.
IDF Inverse document frequency log(N / df) smoothed. Downweights
words that appear everywhere.
AIENGINEERINGFROMSCRATCH.COM 14

BAG OF WORDS, TF-IDF, AND TEXT REPRESENTATION
Term What people say What it actually means
Sparse Mostly zeros Vocabulary is typically 10k-100k words;
vector most are absent from any given document.
Cosine Vector angle Dot product of L2-normalized vectors. 1 is
similarity identical, 0 is orthogonal.
Further Reading
• scikit-learn — feature extraction from text — the canonical API reference, plus notes on
every knob.
• Salton, G., & Buckley, C. (1988). Term-weighting approaches in automatic text retrieval
— the paper that made TF-IDF the default for a decade.
• “Why TF-IDF Still Beats Embeddings” — Ashfaque Thonikkadavan (Medium) — 2026
take on when the old method wins and why.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 15