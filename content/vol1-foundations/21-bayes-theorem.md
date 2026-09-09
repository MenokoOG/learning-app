---
title: "Bayes’ Theorem"
volume: "vol1-foundations"
part: "Part II — Math Foundations"
chapter_number: 21
source_pages: "131-138"
---

# Bayes’ Theorem

Bayes’ Theorem
Probability is about what you expect. Bayes’ theorem is about what you learn.
Type: Build Language: Python Prerequisites: Phase 1, Lesson 06 (Probability Fundamen-
tals) Time: ~75 minutes
Learning Objectives
• Apply Bayes’ theorem to compute posterior probabilities from priors, likelihoods, and
evidence
• Build a Naive Bayes text classifier from scratch with Laplace smoothing and log-space
computation
• Compare MLE and MAP estimation and explain how MAP corresponds to L2 regulariza-
tion
• Implement sequential Bayesian updating using Beta-Binomial conjugate priors for A/B
testing
The Problem
A medical test is 99% accurate. You test positive. What are the chances you actually have the
disease?
Most people say 99%. The real answer depends on how rare the disease is. If 1 in 10,000
people have it, a positive result only gives you about a 1% chance of being sick. The other
99% of positive results are false alarms from healthy people.
This is not a trick question. It is Bayes’ theorem. Every spam filter, every medical diagnostic,
every machine learning model that quantifies uncertainty uses this exact reasoning. You start
with a belief. You see evidence. You update.
If you build ML systems without understanding this, you will misinterpret model outputs, set
bad thresholds, and ship overconfident predictions.
The Concept
From joint probability to Bayes
You already know from Lesson 06 that conditional probability is:
P(A|B) = P(A and B) / P(B)
And symmetrically:
P(B|A) = P(A and B) / P(A)
Both expressions share the same numerator: P(A and B). Set them equal and rearrange:
AIENGINEERINGFROMSCRATCH.COM 127

BAYES’ THEOREM
P(A and B) = P(A|B) * P(B) = P(B|A) * P(A)
Therefore:
P(A|B) = P(B|A) * P(A) / P(B)
That is Bayes’ theorem. Four quantities, one equation.
The four parts
Part Name What it means
P(A|B) Posterior Your updated belief about A after seeing
evidence B
P(B|A) Likelihood How probable the evidence B is if A is true
P(A) Prior Your belief about A before seeing any evidence
P(B) Evidence Total probability of seeing B under all
possibilities
The evidence term P(B) acts as a normalizer. You can expand it using the law of total proba-
bility:
P(B) = P(B|A) * P(A) + P(B|not A) * P(not A)
Medical test example
A disease affects 1 in 10,000 people. The test is 99% accurate (catches 99% of sick people,
gives false positives 1% of the time).
P(sick) = 0.0001 (prior: disease is rare)
P(positive|sick) = 0.99 (likelihood: test catches it)
P(positive|healthy) = 0.01 (false positive rate)
P(positive) = P(positive|sick) * P(sick) + P(positive|healthy) * P(healthy)
= 0.99 * 0.0001 + 0.01 * 0.9999
= 0.000099 + 0.009999
= 0.010098
P(sick|positive) = P(positive|sick) * P(sick) / P(positive)
= 0.99 * 0.0001 / 0.010098
= 0.0098
= 0.98%
Less than 1%. The prior dominates. When a condition is rare, even accurate tests produce
mostly false positives. This is why doctors order confirmation tests.
Spam filter example
You receive an email containing the word “lottery”. Is it spam?
P(spam) = 0.3 (30% of email is spam)
P("lottery"|spam) = 0.05 (5% of spam emails contain "lottery")
P("lottery"|not spam) = 0.001 (0.1% of legitimate emails contain "lottery")
P("lottery") = 0.05 * 0.3 + 0.001 * 0.7
AIENGINEERINGFROMSCRATCH.COM 128

BAYES’ THEOREM
= 0.015 + 0.0007
= 0.0157
P(spam|"lottery") = 0.05 * 0.3 / 0.0157
= 0.955
= 95.5%
One word shifts the probability from 30% to 95.5%. A real spam filter applies Bayes across
hundreds of words simultaneously.
Naive Bayes: independence assumption
Naive Bayes extends this to multiple features by assuming all features are conditionally inde-
pendent given the class:
P(class | feature_1, feature_2, ..., feature_n)
= P(class) * P(feature_1|class) * P(feature_2|class) * ... * P(feature_n|class)
/ P(feature_1, feature_2, ..., feature_n)
The “naive” part is the independence assumption. In text, word occurrences are not inde-
pendent (“New” and “York” are correlated). But the assumption works surprisingly well in
practice because the classifier only needs to rank classes, not produce calibrated probabili-
ties.
Since the denominator is the same for all classes, you can skip it and just compare numerators:
score(class) = P(class) * product of P(feature_i | class)
Pick the class with the highest score.
Maximum likelihood estimation (MLE)
How do you get P(feature|class) from training data? Count.
P("free"|spam) = (number of spam emails containing "free") / (total spam emails)
This is MLE: choose the parameter values that make the observed data most likely. You are
maximizing the likelihood function, which for discrete counts reduces to relative frequency.
Problem: if a word never appears in spam during training, MLE gives it probability zero. One
unseen word kills the entire product. Fix this with Laplace smoothing:
P(word|class) = (count(word, class) + 1) / (total_words_in_class + vocabulary_size)
Adding 1 to every count ensures no probability is ever zero.
Maximum a posteriori (MAP)
MLE asks: what parameters maximize P(data|parameters)?
MAP asks: what parameters maximize P(parameters|data)?
By Bayes’ theorem:
P(parameters|data) proportional to P(data|parameters) * P(parameters)
MAP adds a prior over the parameters themselves. If you believe parameters should be small,
you encode that as a prior that penalizes large values. This is identical to L2 regularization
in ML. The “ridge” penalty in ridge regression is literally a Gaussian prior on the weights.
AIENGINEERINGFROMSCRATCH.COM 129

BAYES’ THEOREM
Estimation Optimizes ML equivalent
MLE P(data|params) Unregularized training
MAP P(data|params) * L2 / L1 regularization
P(params)
Bayesian vs frequentist: the practical difference
Frequentists treat parameters as fixed unknowns. They ask: “If I repeated this experiment
many times, what would happen?”
Bayesians treat parameters as distributions. They ask: “Given what I have observed, what
do I believe about the parameters?”
For building ML systems, the practical difference:
Aspect Frequentist Bayesian
Output Point estimate Distribution over values
Uncertainty Confidence intervals (about Credible intervals (about
procedure) parameter)
Small data Can overfit Prior acts as regularization
Computation Usually faster Often requires sampling
(MCMC)
Most production ML is frequentist (SGD, point estimates). Bayesian methods shine when you
need calibrated uncertainty (medical decisions, safety-critical systems) or when data is scarce
(few-shot learning, cold start).
Why Bayesian thinking matters for ML
The connection is deeper than analogy:
Priors are regularization. A Gaussian prior on weights is L2 regularization. A Laplace prior
is L1. Every time you add a regularization term, you are making a Bayesian statement about
what parameter values you expect.
Posteriors are uncertainty. A single predicted probability tells you nothing about how confi-
dent the model is in that estimate. Bayesian methods give you a distribution: “I think P(spam)
is between 0.8 and 0.95.”
Bayes updates are online learning. Today’s posterior becomes tomorrow’s prior. When
your model sees new data, it updates its beliefs incrementally instead of retraining from
scratch.
Model comparison is Bayesian. Bayesian information criterion (BIC), marginal likelihood,
and Bayes factors all use Bayesian reasoning to choose between models without overfitting.
Interactive figure: bayes-update. This one moves. Watch it animate and drag its controls in
the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/01-math-
foundations/07-bayes-theorem
AIENGINEERINGFROMSCRATCH.COM 130

BAYES’ THEOREM
Build It
Step 1: Bayes theorem function
def bayes(prior, likelihood, false_positive_rate):
evidence = likelihood * prior + false_positive_rate * (1 - prior)
posterior = likelihood * prior / evidence
return posterior
result = bayes(prior=0.0001, likelihood=0.99, false_positive_rate=0.01)
print(f"P(sick|positive) = {result:.4f}")
Step 2: Naive Bayes classifier
import math
from collections import defaultdict
class NaiveBayes:
def __init__(self, smoothing=1.0):
self.smoothing = smoothing
self.class_counts = defaultdict(int)
self.word_counts = defaultdict(lambda: defaultdict(int))
self.class_word_totals = defaultdict(int)
self.vocab = set()
def train(self, documents, labels):
for doc, label in zip(documents, labels):
self.class_counts[label] += 1
words = doc.lower().split()
for word in words:
self.word_counts[label][word] += 1
self.class_word_totals[label] += 1
self.vocab.add(word)
def predict(self, document):
words = document.lower().split()
total_docs = sum(self.class_counts.values())
vocab_size = len(self.vocab)
best_class = None
best_score = float("-inf")
for cls in self.class_counts:
score = math.log(self.class_counts[cls] / total_docs)
for word in words:
count = self.word_counts[cls].get(word, 0)
total = self.class_word_totals[cls]
score += math.log((count + self.smoothing) / (total + self.smoothing * vocab_size))
if score > best_score:
best_score = score
best_class = cls
return best_class
Log probabilities prevent underflow. Multiplying many small probabilities produces numbers
too tiny for floating point. Summing log-probabilities is numerically stable and mathematically
equivalent.
AIENGINEERINGFROMSCRATCH.COM 131

BAYES’ THEOREM
Step 3: Train on spam data
train_docs = [
"win free money now",
"free lottery ticket winner",
"claim your prize today free",
"urgent offer free cash",
"congratulations you won free",
"meeting tomorrow at noon",
"project update attached",
"can we schedule a call",
"quarterly report review",
"lunch on thursday sounds good",
"team standup notes attached",
"please review the pull request",
]
train_labels = [
"spam", "spam", "spam", "spam", "spam",
"ham", "ham", "ham", "ham", "ham", "ham", "ham",
]
classifier = NaiveBayes()
classifier.train(train_docs, train_labels)
test_messages = [
"free money waiting for you",
"meeting rescheduled to friday",
"you won a free prize",
"please review the attached report",
]
for msg in test_messages:
print(f" '{msg}' -> {classifier.predict(msg)}")
Step 4: Inspect the learned probabilities
def show_top_words(classifier, cls, n=5):
vocab_size = len(classifier.vocab)
total = classifier.class_word_totals[cls]
probs = {}
for word in classifier.vocab:
count = classifier.word_counts[cls].get(word, 0)
probs[word] = (count + classifier.smoothing) / (total + classifier.smoothing * vocab_size)
sorted_words = sorted(probs.items(), key=lambda x: x[1], reverse=True)
for word, prob in sorted_words[:n]:
print(f" {word}: {prob:.4f}")
print("\nTop spam words:")
show_top_words(classifier, "spam")
print("\nTop ham words:")
show_top_words(classifier, "ham")
AIENGINEERINGFROMSCRATCH.COM 132

BAYES’ THEOREM
Use It
Scikit-learn ships production-ready naive Bayes implementations:
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import classification_report
vectorizer = CountVectorizer()
X_train = vectorizer.fit_transform(train_docs)
clf = MultinomialNB()
clf.fit(X_train, train_labels)
X_test = vectorizer.transform(test_messages)
predictions = clf.predict(X_test)
for msg, pred in zip(test_messages, predictions):
print(f" '{msg}' -> {pred}")
Same algorithm. CountVectorizer handles tokenization and vocabulary building. Multinomi-
alNB handles smoothing and log-probabilities internally. Your from-scratch version does the
same thing in 40 lines.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/01-math-foundations/07-bayes-theorem
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/01-math-foundations/07-bayes-theorem/code
1. Multiple tests. A patient tests positive twice on independent tests (both 99% accurate,
disease prevalence 1 in 10,000). What is P(sick) after both tests? Use the posterior from
the first test as the prior for the second.
2. Smoothing impact. Run the spam classifier with smoothing values of 0.01, 0.1, 1.0,
and 10.0. How do the top word probabilities change? What happens with smoothing=0
and a word that appears only in ham?
3. Add features. Extend the NaiveBayes class to also use message length (short/long)
as a feature alongside word counts. Estimate P(short|spam) and P(short|ham) from the
training data and fold it into the prediction score.
4. MAP by hand. Given observed data (7 heads in 10 coin flips), compute the MAP estimate
of the bias using a Beta(2,2) prior. Compare it to the MLE estimate (7/10).
Key Terms
Term What people say What it actually means
Prior “My initial guess” P(hypothesis) before observing evidence.
In ML: the regularization term.
AIENGINEERINGFROMSCRATCH.COM 133

BAYES’ THEOREM
Term What people say What it actually means
Likelihood “How well the data fits” P(evidence|hypothesis). How probable the
observed data is under a specific
hypothesis.
Posterior “My updated belief” P(hypothesis|evidence). The prior
multiplied by the likelihood, then
normalized.
Evidence “The normalizing constant” P(data) across all hypotheses. Ensures the
posterior sums to 1.
Naive “That simple text classifier” A classifier that assumes features are
Bayes independent given the class. Works well
despite the false assumption.
Laplace “Add-one smoothing” Adding a small count to every feature to
smoothing prevent zero probabilities from unseen
data.
MLE “Just use the frequencies” Choose parameters that maximize
P(data|parameters). No prior. Can overfit
with small data.
MAP “MLE with a prior” Choose parameters that maximize
P(data|parameters) * P(parameters).
Equivalent to regularized MLE.
Log- “Work in log space” Using log(P) instead of P to avoid
probability floating-point underflow when multiplying
many small numbers.
False “A wrong alarm” The test says positive, but the true state is
positive negative. Drives the base rate fallacy.
Further Reading
• 3Blue1Brown: Bayes’ theorem - visual explanation with the medical test example
• Stanford CS229: Generative Learning Algorithms - naive Bayes and its connection to
discriminative models
• Think Bayes - free book, Bayesian statistics with Python code
• scikit-learn Naive Bayes - production implementations and when to use each variant
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/01-math-foundations/07-bayes-theorem
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/01-math-foundations/07-bayes-theorem/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/01-math-foundations/07-bayes-theorem
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 134