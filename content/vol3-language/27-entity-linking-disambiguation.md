---
title: "Entity Linking & Disambiguation"
volume: "vol3-language"
part: "Part I — NLP — Foundations to Advanced"
chapter_number: 27
source_pages: "150-154"
---

# Entity Linking & Disambiguation

Entity Linking & Disambiguation
NER found “Paris.” Entity linking decides: Paris, France? Paris Hilton? Paris,
Texas? Paris (the Trojan prince)? Without linking, your knowledge graph stays
ambiguous.
Type: Build Languages: Python Prerequisites: Phase 5 · 06 (NER), Phase 5 · 24 (Corefer-
ence Resolution) Time: ~60 minutes
The Problem
A sentence reads: “Jordan beat the press.” Your NER tags “Jordan” as PERSON. Good. But
which Jordan?
• Michael Jordan (basketball)?
• Michael B. Jordan (actor)?
• Michael I. Jordan (Berkeley ML professor — yes, this confusion is real in ML papers)?
• Jordan (the country)?
• Jordan (Hebrew first name)?
Entity linking (EL) resolves each mention to a unique entry in a knowledge base: Wikidata,
Wikipedia, DBpedia, or your domain KB. Two subtasks:
1. Candidate generation. Given “Jordan,” which KB entries are plausible?
2. Disambiguation. Given the context, which candidate is the right one?
Both steps are learnable. Both are benchmarked. The combined pipeline has been stable for
a decade — what changes is the quality of the disambiguator.
The Concept
Candidate generation. Given the mention surface form (“Jordan”), look up candidates in an
alias index. Wikipedia alias dictionaries cover most named entities: “JFK” → John F. Kennedy,
Jacqueline Kennedy, JFK airport, JFK (movie). Typical index returns 10-30 candidates per
mention.
Disambiguation: three approaches.
1. Prior + context (Milne & Witten, 2008). P(entity | mention) × context-
similarity(entity, text). Works well, fast, no training.
2. Embedding-based (ESS / REL / Blink). Encode mention + context. Encode each
candidate’s description. Pick max cosine. The 2020-2024 default.
3. Generative (GENRE, 2021; LLM-based, 2023+). Decode the entity’s canonical name
token-by-token. Constrained to a trie of valid entity names so output is guaranteed to be
a valid KB id.
End-to-end vs pipeline. Modern models (ELQ, BLINK, ExtEnD, GENRE) run NER + candi-
date generation + disambiguation in one pass. Pipeline systems still dominate in production
because you can swap components.
AIENGINEERINGFROMSCRATCH.COM 147

ENTITY LINKING & DISAMBIGUATION
entity linking — mention → candidates → disambiguated KB id
input
"Jordan scored 45 points against the Lakers last night."
candidate generation (alias-index lookup for "Jordan")
Q41421 Q810 Q254110 Q3308285
Michael Jordan Jordan (country) Michael B. Jordan Michael I. Jordan (ML)
disambiguation — score each candidate against context
score = Jaccard(context, description) + 0.1 × P(entity | "Jordan")
Q41421 Q810 Q254110 Q3308285
score 0.109 Lakers not in country desc no film keywords in context no ML keywords in context
basketball match
top score wins → Q41421 (Michael Jordan, basketball) — output linked to Wikidata
Figure 16: Entity linking pipeline: mention → candidates → disambiguated entity
The two measurements
• Mention recall (candidate gen). Fraction of gold mentions where the correct KB entry
appears in the candidate list. Floor for the whole pipeline.
• Disambiguation accuracy / F1. Given correct candidates, how often the top-1 is right.
Always report both. A system with 99% disambiguation on 80% candidate recall is an 80%
pipeline.
Interactive figure: gx-entity-linking. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/05-nlp-foundations-to-advanced/25-entity-linking
Build It
Step 1: build an alias index from Wikipedia redirects
alias_to_entities = {
"jordan": ["Q41421 (Michael Jordan)", "Q810 (Jordan, country)", "Q254110 (Michael B. Jordan)"],
"paris": ["Q90 (Paris, France)", "Q663094 (Paris, Texas)", "Q55411 (Paris Hilton)"],
"apple": ["Q312 (Apple Inc.)", "Q89 (apple, fruit)"],
}
Wikipedia alias data: ~18M (alias, entity) pairs. Download from Wikidata dumps. Store as
inverted index.
Step 2: context-based disambiguation
def disambiguate(mention, context, alias_index, entity_desc):
candidates = alias_index.get(mention.lower(), [])
if not candidates:
return None, 0.0
AIENGINEERINGFROMSCRATCH.COM 148

ENTITY LINKING & DISAMBIGUATION
context_words = set(tokenize(context))
best, best_score = None, -1
for entity_id in candidates:
desc_words = set(tokenize(entity_desc[entity_id]))
union = len(context_words | desc_words)
score = len(context_words & desc_words) / union if union else 0.0
if score > best_score:
best, best_score = entity_id, score
return best, best_score
The Jaccard overlap is a toy. Replace with cosine similarity on embeddings (see code/main.py
step-2 for the transformer version).
Step 3: embedding-based (BLINK-style)
from sentence_transformers import SentenceTransformer
encoder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
def embed_mention(text, mention_span):
start, end = mention_span
marked = f"{text[:start]} [MENTION] {text[start:end]} [/MENTION] {text[end:]}"
return encoder.encode([marked], normalize_embeddings=True)[0]
def embed_entity(entity_id, description):
return encoder.encode([f"{entity_id}: {description}"], normalize_embeddings=True)[0]
At index time, embed every KB entity once. At query time, embed the mention + context once,
dot-product against the candidate pool, pick max.
Step 4: generative entity linking (concept)
GENRE decodes the entity’s Wikipedia title character-by-character. Constrained decoding
(see lesson 20) ensures only valid titles can be output. Tight integration with a KB-backed
trie. The modern descendant is REL-GEN and LLM-prompted EL with structured output.
prompt = f"""Text: {text}
Mention: {mention}
List the best Wikipedia title for this mention.
Respond with JSON: {{"title": "..."}}"""
Combined with a whitelist (Outlines choice), this is the simplest EL pipeline to ship in 2026.
Step 5: evaluate on AIDA-CoNLL
AIDA-CoNLL is the standard EL benchmark: 1,393 Reuters articles, 34k mentions, Wikipedia
entities. Report in-KB accuracy (P@1) and out-of-KB NIL-detection rate.
Pitfalls
• NIL handling. Some mentions are not in the KB (emerging entities, obscure people).
Systems must predict NIL instead of guessing the wrong entity. Measured separately.
• Mention boundary errors. Upstream NER misses partial spans (“Bank of America”
tagged as just “Bank”). EL recall drops.
AIENGINEERINGFROMSCRATCH.COM 149

ENTITY LINKING & DISAMBIGUATION
• Popularity bias. Trained systems over-predict frequent entities. A mention of “Michael
I. Jordan” on an ML paper often links to basketball Jordan.
• Cross-lingual EL. Mapping mentions in Chinese text to English Wikipedia entities. Re-
quires a multilingual encoder or a translation step.
• KB staleness. New companies, events, people are not in last year’s Wikipedia dump.
Production pipelines need a refresh loop.
Use It
The 2026 stack:
Situation Pick
General-purpose English + Wikipedia BLINK or REL
Cross-lingual, KB = Wikipedia mGENRE
LLM-friendly, few mentions/day Prompt Claude/GPT-4 with
candidate list + constrained
JSON
Domain-specific KB (medical, legal) Custom BERT with KB-aware
retrieval + fine-tune on domain
AIDA-style set
Extremely low-latency Exact-match prior only
(Milne-Witten baseline)
Research SOTA GENRE / ExtEnD / generative
LLM-EL
Production pattern that ships in 2026: NER → coref → EL on each mention → collapse clusters
to one canonical entity per cluster. Output: one KB id per entity in the document, not one per
mention.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/05-nlp-foundations-to-advanced/25-entity-
linking
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engine
ering-from-scratch/tree/main/phases/05-nlp-foundations-to-advanced/25-entity-linking/code
1. Easy. Implement the prior+context disambiguator in code/main.py on 10 ambiguous
mentions (Paris, Jordan, Apple). Hand-label the correct entity. Measure accuracy.
2. Medium. Encode 50 ambiguous mentions with a sentence transformer. Embed each
candidate’s description. Compare embedding-based disambiguation to Jaccard context
overlap.
3. Hard. Build a 1k-entity domain KB (e.g. employees + products in your company). Imple-
ment NER + EL end-to-end. Measure precision and recall on 100 held-out sentences.
Key Terms
AIENGINEERINGFROMSCRATCH.COM 150

ENTITY LINKING & DISAMBIGUATION
Term What people say What it actually means
Entity Link to Wikipedia Map a mention to a unique KB entry.
linking
(EL)
Candidate Who could it be? Return a shortlist of plausible KB entries
generation for a mention.
DisambiguatioPnick the right one Score candidates using context, pick the
winner.
Alias index The lookup table Map from surface form → candidate
entities.
NIL Not in KB Explicit prediction that no KB entry
matches.
KB Knowledge base Wikidata, Wikipedia, DBpedia, or your
domain KB.
AIDA- The benchmark 1,393 Reuters articles with gold entity
CoNLL links.
Further Reading
• Milne, Witten (2008). Learning to Link with Wikipedia — the foundational prior+context
approach.
• Wu et al. (2020). Zero-shot Entity Linking with Dense Entity Retrieval (BLINK) — the
embedding-based workhorse.
• De Cao et al. (2021). Autoregressive Entity Retrieval (GENRE) — generative EL with
constrained decoding.
• Hoffart et al. (2011). Robust Disambiguation of Named Entities in Text (AIDA) — the
benchmark paper.
• REL: An Entity Linker Standing on the Shoulders of Giants (2020) — the open production
stack.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/05-nlp-foundations-to-advanced/25-entity-linking
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/05-nlp-foundations-to-advanced/25-entity-linking/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/05-nlp-foundations-to-advanced/25-entity-linking
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 151