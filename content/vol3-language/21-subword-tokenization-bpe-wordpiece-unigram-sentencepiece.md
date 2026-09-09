---
title: "Subword Tokenization — BPE, WordPiece, Unigram, SentencePiece"
volume: "vol3-language"
part: "Part I — NLP — Foundations to Advanced"
chapter_number: 21
source_pages: "117-121"
---

# Subword Tokenization — BPE, WordPiece, Unigram, SentencePiece

Subword Tokenization — BPE, Word-
Piece, Unigram, SentencePiece
Word tokenizers choke on unseen words. Character tokenizers blow up sequence
length. Subword tokenizers split the difference. Every modern LLM ships on one.
Type: Learn Languages: Python Prerequisites: Phase 5 · 01 (Text Processing), Phase 5 ·
04 (GloVe / FastText / Subword) Time: ~60 minutes
The Problem
Your vocabulary has 50,000 words. A user types “untokenizable”. Your tokenizer returns
[UNK]. The model now has no signal about the word. Worse: the 90th-percentile document in
your corpus has 40 rare words, which means 40 bits of dropped information per document.
Subword tokenization solves this. Common words stay single tokens. Rare words decompose
into meaningful pieces: untokenizable → un, token, izable. Training data covers everything
because any string is ultimately a sequence of bytes.
Every frontier LLM in 2026 ships on one of three algorithms (BPE, Unigram, WordPiece),
wrapped in one of three libraries (tiktoken, SentencePiece, HF Tokenizers). You cannot ship
a language model without picking one.
The Concept
BPE (Byte-Pair Encoding). Start with a character-level vocabulary. Count every adjacent
pair. Merge the most frequent pair into a new token. Repeat until you hit the target vocabu-
lary size. Dominant algorithm: GPT-2/3/4, Llama, Gemma, Qwen2, Mistral.
Byte-level BPE. Same algorithm but over raw bytes (256 base tokens) instead of Unicode
characters. Guarantees zero [UNK] tokens — any byte sequence encodes. GPT-2 uses 50,257
tokens (256 bytes + 50,000 merges + 1 special).
Unigram. Start with a huge vocabulary. Assign each token a unigram probability. Iteratively
prune tokens whose removal least increases the corpus log-likelihood. Probabilistic at infer-
ence: can sample tokenizations (useful for data augmentation via subword regularization).
Used by T5, mBART, ALBERT, XLNet, Gemma.
WordPiece. Merge pairs that maximize likelihood of the training corpus rather than raw
frequency. Used by BERT, DistilBERT, ELECTRA.
SentencePiece vs tiktoken. SentencePiece is the library that trains vocabularies (BPE or
Unigram) directly on raw Unicode text, encoding whitespace as ▁. tiktoken is OpenAI’s fast
encoder against pre-built vocabularies; it does not train.
Rule of thumb:
• Training a new vocabulary: SentencePiece (multilingual, no pre-tokenization) or HF
Tokenizers.
AIENGINEERINGFROMSCRATCH.COM 114

SUBWORD TOKENIZATION — BPE, WORDPIECE, UNIGRAM, SENTENCEPIECE
three algorithms, same token budget
BPE — greedy merge Unigram — probabilistic prune WordPiece — max likelihood
l o w e r start: 50k candidates l ##o ##w ##e ##r
merge most frequent pair
score each by unigram p merge pair that maximizes
lo w e r prune lowest-loss tokens P(ab) / (P(a)·P(b))
low er repeat to target size l ##ow ##er
lower "lower" → {lo+wer, l+ower, low+er} l ##ower
used by: GPT, Llama, Gemma, used by: T5, Gemma, mBART, used by: BERT, DistilBERT,
Qwen, Mistral ALBERT, XLNet ELECTRA
deterministic at inference samplable (subword regularization) ## marks continuation
tokenize once, ship forever — vocabulary is frozen at training time
Figure 10: BPE vs Unigram vs WordPiece, character-by-character
• Fast inference against GPT vocab: tiktoken (cl100k_base, o200k_base).
• Both: HF Tokenizers — one library, training + serving.
Interactive figure: bpe-merge. This one moves. Watch it animate and drag its controls in
the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/05-nlp-
foundations-to-advanced/19-subword-tokenization
Build It
Step 1: BPE from scratch
See code/main.py. The loop:
def train_bpe(corpus, num_merges):
vocab = {tuple(word) + ("</w>",): count for word, count in corpus.items()}
merges = []
for _ in range(num_merges):
pairs = Counter()
for symbols, freq in vocab.items():
for a, b in zip(symbols, symbols[1:]):
pairs[(a, b)] += freq
if not pairs:
break
best = pairs.most_common(1)[0][0]
merges.append(best)
vocab = apply_merge(vocab, best)
return merges
Three facts the algorithm encodes. </w> marks word end so “low” (suffix) and “lower” (prefix)
stay distinct. Frequency weighting makes high-frequency pairs win early. The merge list is
ordered — inference applies merges in training order.
AIENGINEERINGFROMSCRATCH.COM 115

SUBWORD TOKENIZATION — BPE, WORDPIECE, UNIGRAM, SENTENCEPIECE
Step 2: encode with the learned merges
def encode_bpe(word, merges):
symbols = list(word) + ["</w>"]
for a, b in merges:
i = 0
while i < len(symbols) - 1:
if symbols[i] == a and symbols[i + 1] == b:
symbols = symbols[:i] + [a + b] + symbols[i + 2:]
else:
i += 1
return symbols
Naive O(n·|merges|). Production implementations (tiktoken, HF Tokenizers) use merge-rank
lookup with priority queues and run in near-linear time.
Step 3: SentencePiece in practice
import sentencepiece as spm
spm.SentencePieceTrainer.train(
input="corpus.txt",
model_prefix="my_tokenizer",
vocab_size=8000,
model_type="bpe", # or "unigram"
character_coverage=0.9995, # lower for CJK (e.g. 0.9995 for English, 0.995 for Japanese)
normalization_rule_name="nmt_nfkc",
)
sp = spm.SentencePieceProcessor(model_file="my_tokenizer.model")
print(sp.encode("untokenizable", out_type=str))
# ['▁un', 'token', 'izable']
Notice: no pre-tokenization required, space encoded as ▁, character_coverage controls how
aggressively rare characters are preserved vs mapped to <unk>.
Step 4: tiktoken for OpenAI-compatible vocabs
import tiktoken
enc = tiktoken.get_encoding("o200k_base")
print(enc.encode("untokenizable")) # [127340, 101028]
print(len(enc.encode("Hello, world!"))) # 4
Encoding-only. Fast (Rust backend). Exact match with GPT-4/5 tokenization for byte-counting,
cost estimation, context-window budgeting.
Pitfalls that still ship in 2026
• Tokenizer drift. Training on vocab A, deploying against vocab B. Token IDs differ; model
outputs garbage. Check tokenizer.json hash in CI.
• Whitespace ambiguity. BPE “hello” vs ” hello” produce different tokens. Always spec-
ify add_special_tokens and add_prefix_space explicitly.
AIENGINEERINGFROMSCRATCH.COM 116

SUBWORD TOKENIZATION — BPE, WORDPIECE, UNIGRAM, SENTENCEPIECE
• Multilingual undertraining. English-heavy corpora produce vocabularies that
split non-Latin scripts into 5-10x more tokens. Same prompt costs 5-10x more in
Japanese/Arabic on GPT-3.5. o200k_base partially fixed this.
• Emoji splits. A single emoji can take 5 tokens. Checkpoint emoji handling when bud-
geting context.
Use It
The 2026 stack:
Situation Pick
Training a monolingual model from scratch HF Tokenizers (BPE)
Training a multilingual model SentencePiece (Unigram,
character_coverage=0.9995)
Serving an OpenAI-compatible API tiktoken (o200k_base for
GPT-4+)
Domain-specific vocab (code, math, protein) Train custom BPE on domain
corpus, merge with base vocab
Edge inference, small model Unigram (smaller vocabularies
work better)
Vocabulary size is a scaling decision, not a constant. Rough heuristic: 32k for <1B params,
50-100k for 1-10B, 200k+ for multilingual/frontier.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/05-nlp-foundations-to-advanced/19-subword-
tokenization
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/05-nlp-foundations-to-advanced/19-subword-
tokenization/code
1. Easy. Train a 500-merge BPE on code/main.py’s tiny corpus. Encode three held-out
words. How many produced exactly 1 token vs >1 token?
2. Medium. Compare token counts on 100 English Wikipedia sentences between
cl100k_base, o200k_base, and a SentencePiece BPE you train with vocab=32k. Report
the compression ratio of each.
3. Hard. Train the same corpus with BPE, Unigram, and WordPiece. Measure downstream
accuracy when using each on a small sentiment classifier. Does the choice move the
needle by more than 1 point F1?
Key Terms
AIENGINEERINGFROMSCRATCH.COM 117

SUBWORD TOKENIZATION — BPE, WORDPIECE, UNIGRAM, SENTENCEPIECE
Term What people say What it actually means
BPE Byte-Pair Encoding Greedy merge of most-frequent character
pairs until target vocab size hit.
Byte-level No unknown tokens ever BPE over raw 256 bytes; GPT-2 / Llama use
BPE this.
Unigram Probabilistic tokenizer Prunes from a large candidate set using
log-likelihood; used by T5, Gemma.
SentencePieceThe whitespace one Library that trains BPE/Unigram on raw
text; space encoded as ▁.
tiktoken The fast one OpenAI’s Rust-backed BPE encoder for
pre-built vocabs. No training.
Merge list The magic numbers Ordered list of (a, b) → ab merges;
inference applies in order.
Character How rare is too rare? Fraction of characters in training corpus
coverage the tokenizer must cover; ~0.9995 typical.
Further Reading
• Sennrich, Haddow, Birch (2015). Neural Machine Translation of Rare Words with Sub-
word Units — the BPE paper.
• Kudo (2018). Subword Regularization with Unigram Language Model — the Unigram
paper.
• Kudo, Richardson (2018). SentencePiece: A simple and language independent subword
tokenizer — the library.
• Hugging Face — Summary of the tokenizers — concise reference.
• OpenAI tiktoken repo — cookbook + encoding list.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/05-nlp-foundations-to-advanced/19-subword-tokenization
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/05-nlp-foundations-to-advanced/19-subword-tokenization/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/05-nlp-foundations-to-advanced/19-subword-tokenization
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 118