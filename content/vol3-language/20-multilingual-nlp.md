---
title: "Multilingual NLP"
volume: "vol3-language"
part: "Part I — NLP — Foundations to Advanced"
chapter_number: 20
source_pages: "110-116"
---

# Multilingual NLP

Multilingual NLP
One model, 100+ languages, zero training data for most of them. Cross-lingual
transfer is the practical miracle of the 2020s.
Type: Learn Languages: Python Prerequisites: Phase 5 · 04 (GloVe, FastText, Subword),
Phase 5 · 11 (Machine Translation) Time: ~45 minutes
The Problem
English has billions of labeled examples. Urdu has thousands. Maithili has almost none. Any
practical NLP system that serves a global audience has to work on the long tail of languages
where task-specific training data does not exist.
Multilingual models solve this by training one model on many languages simultaneously. The
shared representation lets the model transfer skills learned in high-resource languages to
low-resource ones. Fine-tune the model on English sentiment analysis, and it produces sur-
prisingly good sentiment predictions on Urdu out of the box. That is zero-shot cross-lingual
transfer, and it has reshaped how NLP ships to the world.
This lesson names the tradeoffs, the canonical models, and the one decision that trips up
teams new to multilingual work: picking a source language for transfer.
The Concept
multilingual embedding space cross-lingual transfer
fine-tune on English run on Hindi, Urdu,
sentiment labels Swahili, French ...
zero-shot transfer.
cat (en)chat (fr)
Katze (de)
gato (es) add 100-500 target accuracy 95-98%
language examples of English baseline
0 2 9 C 0 3 9 F 0 3 9 2 0 4 9 D 0 3 9 2 0 4 9 0 (hi) dog (en) chien (fr)
few-shot fine-tuning.
translations cluster. source language matters.
Hindi source > English source
distant words stay distant.
for Marathi, Bengali, Nepali.
Check LANGRANK / qWALS.
Figure 9: Cross-lingual transfer via shared multilingual embedding space
Shared vocabulary. Multilingual models use a SentencePiece or WordPiece tokenizer
trained on text from all target languages. The vocabulary is shared: the same subword unit
AIENGINEERINGFROMSCRATCH.COM 107

MULTILINGUAL NLP
represents the same morpheme across related languages. anti- in English and Italian gets
the same token.
Shared representation. A transformer pretrained on masked language modeling across
many languages learns that semantically similar sentences in different languages produce
similar hidden states. mBERT, XLM-R, and NLLB all exhibit this. Embeddings for “cat” in
English cluster near “chat” in French and “gato” in Spanish, and so do full-sentence embed-
dings.
Zero-shot transfer. Fine-tune the model on labeled data in one language (usually English).
At inference, run it on any other language the model supports. No target-language labels
needed. Results are strong for typologically related languages and weaker for distant ones.
Few-shot fine-tuning. Add 100-500 labeled examples in the target language. Accuracy
jumps to 95-98% of the English baseline on classification tasks. This is the single most cost-
effective lever in multilingual NLP.
The models
Model Year Coverage Notes
mBERT 2018 104 languages Trained on
Wikipedia. First
practical
multilingual LM.
Weak on
low-resource.
XLM-R 2019 100 languages Trained on
CommonCrawl
(much larger than
Wikipedia). Sets
the cross-lingual
baseline. Base
270M, Large 550M.
XLM-V 2023 100 languages XLM-R with
1M-token
vocabulary (vs
250k). Better on
low-resource.
mT5 2020 101 languages T5 architecture for
multilingual
generation.
NLLB-200 2022 200 languages Meta’s translation
model; includes 55
low-resource
languages.
BLOOM 2022 46 languages + 13 Open 176B LLM
programming trained
multilingually.
Aya-23 2024 23 languages Cohere’s
multilingual LLM.
Strong on Arabic,
Hindi, Swahili.
AIENGINEERINGFROMSCRATCH.COM 108

MULTILINGUAL NLP
Pick by use case. Classification works well with XLM-R-base as the sane default. Generation
tasks call for mT5 or NLLB depending on translation vs open generation. LLM-style work
pairs with Aya-23 or Claude using explicit multilingual prompting.
The source-language decision (2026 research)
Most teams default to English as the fine-tuning source. Recent research (2026) shows this
is often wrong.
Language similarity predicts transfer quality better than raw corpus size. For Slavic targets,
German or Russian often beat English. For Indic targets, Hindi often beats English. The
qWALS similarity metric (2026, based on World Atlas of Language Structures features) quan-
tifies this. LANGRANK (Lin et al., ACL 2019) is a separate, earlier method that ranks can-
didate source languages from a combination of linguistic similarity, corpus size, and genetic
relatedness.
Practical rule: if your target language has a typologically close high-resource relative, try
fine-tuning on that one first, then compare to English fine-tune.
Interactive figure: n5-crosslingual-bridge. This one moves. Watch it animate and drag
its controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=ph
ases/05-nlp-foundations-to-advanced/18-multilingual-nlp
Build It
Step 1: zero-shot cross-lingual classification
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
tok = AutoTokenizer.from_pretrained("joeddav/xlm-roberta-large-xnli")
model = AutoModelForSequenceClassification.from_pretrained("joeddav/xlm-roberta-large-xnli")
def classify(text, candidate_labels, hypothesis_template="This text is about {}."):
scores = {}
for label in candidate_labels:
hypothesis = hypothesis_template.format(label)
inputs = tok(text, hypothesis, return_tensors="pt", truncation=True)
with torch.no_grad():
logits = model(**inputs).logits[0]
entail_score = torch.softmax(logits, dim=-1)[2].item()
scores[label] = entail_score
return dict(sorted(scores.items(), key=lambda x: -x[1]))
print(classify("I love this product!", ["positive", "negative", "neutral"]))
print(classify("(cid:0)(cid:0)(cid:0)(cid:0) (cid:0)(cid:0) (cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0) (cid:0)(cid:0)(cid:0)(cid:0) (cid:0)(cid:0)!", ["positive", "negative", "neutral"]))
print(classify("J'adore ce produit !", ["positive", "negative", "neutral"]))
One model, three languages, same API. XLM-R trained on NLI data transfers well to classifi-
cation via the entailment trick.
AIENGINEERINGFROMSCRATCH.COM 109

MULTILINGUAL NLP
Step 2: multilingual embedding space
from sentence_transformers import SentenceTransformer
import numpy as np
model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
pairs = [
("The cat is sleeping.", "Le chat dort."),
("The cat is sleeping.", "El gato está durmiendo."),
("The cat is sleeping.", "Die Katze schläft."),
("The cat is sleeping.", "The dog is barking."),
]
for eng, other in pairs:
emb_eng = model.encode([eng], normalize_embeddings=True)[0]
emb_other = model.encode([other], normalize_embeddings=True)[0]
sim = float(np.dot(emb_eng, emb_other))
print(f" {eng!r} <-> {other!r}: cos={sim:.3f}")
Translations land close in embedding space. A different English sentence lands further. This
is what makes cross-lingual retrieval, clustering, and similarity work.
Step 3: few-shot fine-tuning strategy
from transformers import TrainingArguments, Trainer
from datasets import Dataset
def few_shot_finetune(base_model, base_tokenizer, examples):
ds = Dataset.from_list(examples)
def tokenize_fn(ex):
out = base_tokenizer(ex["text"], truncation=True, max_length=128)
out["labels"] = ex["label"]
return out
ds = ds.map(tokenize_fn)
args = TrainingArguments(
output_dir="out",
per_device_train_batch_size=8,
num_train_epochs=5,
learning_rate=2e-5,
save_strategy="no",
)
trainer = Trainer(model=base_model, args=args, train_dataset=ds)
trainer.train()
return base_model
For 100-500 target-language examples, num_train_epochs=5 and learning_rate=2e-5 are the
safe defaults. Higher learning rates cause the multilingual alignment to collapse and you get
an English-only model.
AIENGINEERINGFROMSCRATCH.COM 110

MULTILINGUAL NLP
Evaluation that actually works
• Per-language accuracy on held-out sets. Not aggregated. The aggregate hides the
long tail.
• Benchmark against monolingual baseline. For languages with enough data, a mono-
lingual model trained from scratch sometimes beats the multilingual one. Test.
• Entity-level tests. Named entities in the target language. Multilingual models often
have weak tokenization for scripts far from Latin.
• Cross-lingual consistency. Same meaning in two languages should produce the same
prediction. Measure the gap.
Use It
The 2026 stack:
Task Recommended
Classification, 100 XLM-R-base (~270M) fine-tuned
languages
Zero-shot text joeddav/xlm-roberta-large-xnli
classification
Multilingual sentence sentence-transformers/paraphrase-multilingual-MiniLM-L12-
embeddings v2
Translation, 200 facebook/nllb-200-distilled-600M (see lesson 11)
languages
Generative multilingual Claude, GPT-4, Aya-23, mT5-XXL
Low-resource language XLM-V or a domain-specific fine-tune on related high-resource
NLP language
Always budget for fine-tuning in the target language if performance matters. Zero-shot is a
starting point, not a final answer.
The tokenization tax (what goes wrong for low-resource languages)
Multilingual models share one tokenizer across all their languages. That vocabulary is trained
on a corpus dominated by English, French, Spanish, Chinese, German. For any language
outside the dominant set, three taxes compound silently:
• Fertility tax. Low-resource language text tokenizes into far more tokens per word than
English. A Hindi sentence can need 3-5x the tokens of an equivalent English sentence.
That 3-5x eats your context window, training efficiency, and latency.
• Variant recovery tax. Every typo, diacritic variant, Unicode normalization mismatch, or
case variation becomes a cold-start unrelated sequence in embedding space. The model
cannot learn orthographic correspondences that a native speaker takes as obvious.
• Capacity spillover tax. Taxes 1 and 2 consume context positions, layer depth, and
embedding dimensions. What remains for actual reasoning is systematically smaller
than what a high-resource language gets from the same model.
The practical symptom: your model trains normally on Hindi, the loss curve looks right, eval
perplexity looks reasonable, and production outputs are subtly wrong. Morphology collapses
mid-sentence. Rare inflections stay unrecoverable. You cannot data-scale your way out
of a broken tokenizer.
AIENGINEERINGFROMSCRATCH.COM 111

MULTILINGUAL NLP
Mitigations: pick a tokenizer with good coverage for your target language (XLM-V’s 1M-token
vocabulary is a direct fix); verify tokenization fertility on held-out target text before training;
use byte-level fallback (SentencePiece byte_fallback=True, GPT-2-style byte-level BPE) for
truly long-tail scripts so nothing is ever OOV.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohit
g00/ai-engineering-from-scratch/tree/main/phases/05-nlp-foundations-to-advanced/18-
multilingual-nlp
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/05-nlp-foundations-to-advanced/18-multilingual-
nlp/code
1. Easy. Run the zero-shot classification pipeline on 10 sentences per language across
English, French, Hindi, and Arabic. Report accuracy on each. You should see strong
French, decent Hindi, variable Arabic.
2. Medium. Use paraphrase-multilingual-MiniLM-L12-v2 to build a cross-lingual re-
triever over a small mixed-language corpus. Query in English, retrieve documents in
any language. Measure recall@5.
3. Hard. Compare English-source and Hindi-source fine-tuning for a Hindi classification
task. Use 500 target-language examples for few-shot fine-tuning under both regimes.
Report which source produces better Hindi accuracy and by how much. This is the
LANGRANK thesis in miniature.
Key Terms
Term What people say What it actually means
Multilingual One model, many languages Shared vocabulary and parameters across
model languages.
Cross- Train on one language, run on Fine-tune on source, evaluate on target
lingual another without target-language labels.
transfer
Zero-shot No target-language labels Transfer without fine-tuning on the target
language.
Few-shot Small target labels 100-500 target-language examples used for
fine-tuning.
mBERT First multilingual LM 104-language BERT pretrained on
Wikipedia.
XLM-R Standard cross-lingual baseline 100-language RoBERTa pretrained on
CommonCrawl.
NLLB Meta’s 200-language MT No Language Left Behind. Includes 55
low-resource languages.
Further Reading
• Conneau et al. (2019). Unsupervised Cross-lingual Representation Learning at Scale —
the XLM-R paper.
AIENGINEERINGFROMSCRATCH.COM 112

MULTILINGUAL NLP
• Pires, Schlinger, Garrette (2019). How Multilingual is Multilingual BERT? — the analysis
paper that started the cross-lingual transfer research line.
• Costa-jussà et al. (2022). No Language Left Behind — NLLB-200 paper.
• Üstün et al. (2024). Aya Model: An Instruction Finetuned Open-Access Multilingual
Language Model — Aya, Cohere’s multilingual LLM.
• Language Similarity Predicts Cross-Lingual Transfer Learning Performance (2026) —
the qWALS / LANGRANK source-language paper.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/05-nlp-foundations-to-advanced/18-multilingual-nlp
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/05-nlp-foundations-to-advanced/18-multilingual-nlp/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/05-nlp-foundations-to-advanced/18-multilingual-nlp
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 113