---
title: "Relation Extraction & Knowledge Graph Construction"
volume: "vol3-language"
part: "Part I — NLP — Foundations to Advanced"
chapter_number: 28
source_pages: "155-160"
---

# Relation Extraction & Knowledge Graph Construction

Relation Extraction & Knowledge Graph
Construction
NER found the entities. Entity linking anchored them. Relation extraction finds
the edges between them. A knowledge graph is the sum of nodes, edges, and their
provenance.
Type: Build Languages: Python Prerequisites: Phase 5 · 06 (NER), Phase 5 · 25 (Entity
Linking) Time: ~60 minutes
The Problem
An analyst reads: “Tim Cook became CEO of Apple in 2011.” Four facts:
• (Tim Cook, role, CEO)
• (Tim Cook, employer, Apple)
• (Tim Cook, start_date, 2011)
• (Apple, type, Organization)
Relation Extraction (RE) turns free text into structured triples (subject, relation, object).
Aggregate across a corpus and you have a knowledge graph. Aggregate and query and you
have a reasoning substrate for RAG, analytics, or compliance audits.
The 2026 problem: LLMs extract relations enthusiastically. Too enthusiastically. They hallu-
cinate triples that the source text does not support. Without provenance, you cannot tell real
triples from plausible fiction. The 2026 answer is AEVS-style anchor-and-verify pipelines.
The Concept
Triple form. (subject_entity, relation_type, object_entity). Relations come from a
closed ontology (Wikidata properties, FIBO, UMLS) or an open set (OpenIE-style, anything
goes).
Three extraction approaches.
1. Rule / pattern-based. Hearst patterns: “X such as Y” → (Y, isA, X). Plus hand-crafted
regex. Brittle, precise, explainable.
2. Supervised classifier. Given two entity mentions in a sentence, predict the relation
from a fixed set. Trained on TACRED, ACE, KBP. Standard 2015–2022.
3. Generative LLM. Prompt the model to emit triples. Works out of the box. Needs prove-
nance, or hallucinates plausible-looking junk.
AEVS (Anchor-Extraction-Verification-Supplement, 2026). The current hallucination-
mitigation framework:
• Anchor. Identify every entity span and relation-phrase span with exact positions.
• Extract. Generate triples linked to anchor spans.
• Verify. Match each triple element back to the source text; reject anything unsupported.
• Supplement. A coverage pass ensures no anchored span is dropped.
AIENGINEERINGFROMSCRATCH.COM 152

RELATION EXTRACTION & KNOWLEDGE GRAPH CONSTRUCTION
text → triples → knowledge graph (with provenance)
source text
"Tim Cook became CEO of Apple in 2011. Steve Jobs founded Apple in 1976."
triples (AEVS-verified, with source spans)
(Tim Cook, P169 "CEO of", Apple) span=[0, 30] "Tim Cook became CEO of Apple"
(Steve Jobs, P112 "founded", Apple) span=[38, 63] "Steve Jobs founded Apple"
each triple carries char-span + evidence phrase — audit trail non-negotiable in production
knowledge graph
Tim Cook P169 Apple P112 Steve Jobs
Q265852 (PERSON) Q312 (ORG) Q19837 (PERSON)
CEO of founded
query with SPARQL / Cypher / graph traversal — each edge traces back to source span
Figure 17: Text → triples → knowledge graph
Hallucinations drop sharply. Requires more compute but is auditable.
The open-vs-closed tradeoff.
• Closed ontology. Fixed property list (e.g., Wikidata’s 11,000+ properties). Predictable.
Queryable. Hard to invent.
• Open IE. Any verbal phrase becomes a relation. High recall. Low precision. Messy to
query.
Production KGs usually mix: open IE for discovery, then canonicalize relations onto a closed
ontology before merging into the main graph.
Interactive figure: relation-triples. This one moves. Watch it animate and drag its con-
trols in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/05-
nlp-foundations-to-advanced/26-relation-extraction-kg
Build It
Step 1: pattern-based extraction
PATTERNS = [
(r"(?P<s>[A-Z]\w+) (?:is|was) (?:a|an|the) (?P<o>[A-Z]?\w+)", "isA"),
(r"(?P<s>[A-Z]\w+) (?:is|was) born in (?P<o>\w+)", "bornIn"),
(r"(?P<s>[A-Z]\w+) works? (?:at|for) (?P<o>[A-Z]\w+)", "worksAt"),
(r"(?P<s>[A-Z]\w+) founded (?P<o>[A-Z]\w+)", "founded"),
]
See code/main.py for the full toy extractor. Hearst patterns still ship in domain-specific
pipelines because they are debuggable.
AIENGINEERINGFROMSCRATCH.COM 153

RELATION EXTRACTION & KNOWLEDGE GRAPH CONSTRUCTION
Step 2: supervised relation classification
from transformers import AutoTokenizer, AutoModelForSequenceClassification
tok = AutoTokenizer.from_pretrained("Babelscape/rebel-large")
model = AutoModelForSequenceClassification.from_pretrained("Babelscape/rebel-large")
text = "Tim Cook was born in Alabama. He later became CEO of Apple."
encoded = tok(text, return_tensors="pt", truncation=True)
output = model.generate(**encoded, max_length=200)
triples = tok.batch_decode(output, skip_special_tokens=False)
REBEL is a seq2seq relation extractor: text in, triples out, already in Wikidata property ids.
Fine-tuned on distant-supervision data. Standard open-weights baseline.
Step 3: LLM-prompted extraction with anchoring
prompt = f"""Extract (subject, relation, object) triples from the text.
For each triple, include the exact character span in the source text.
Text: {text}
Output JSON:
[{{"subject": {{"text": "...", "span": [start, end]}},
"relation": "...",
"object": {{"text": "...", "span": [start, end]}}}}, ...]
Only include triples fully supported by the text. No inference beyond what is stated.
"""
Verify every returned span against the source. Reject anything where text[start:end] !=
triple_entity. This is the AEVS “verify” step in its minimal form.
Step 4: canonicalize onto a closed ontology
RELATION_MAP = {
"is the CEO of": "P169", # "chief executive officer"
"was born in": "P19", # "place of birth"
"founded": "P112", # "founded by" (inverted subject/object)
"works at": "P108", # "employer"
}
def canonicalize(relation):
rel_low = relation.lower().strip()
if rel_low in RELATION_MAP:
return RELATION_MAP[rel_low]
return None # drop unmapped open relations or route to manual review
Canonicalization is often 60-80% of the engineering work. Budget for it.
Step 5: build a small graph and query
triples = extract(text)
graph = {}
AIENGINEERINGFROMSCRATCH.COM 154

RELATION EXTRACTION & KNOWLEDGE GRAPH CONSTRUCTION
for s, r, o in triples:
graph.setdefault(s, []).append((r, o))
def neighbors(node, relation=None):
return [(r, o) for r, o in graph.get(node, []) if relation is None or r == relation]
print(neighbors("Tim Cook", relation="P108")) # -> [(P108, Apple)]
This is the atom of every RAG-over-KG system. Scale it with RDF triple stores (Blazegraph,
Virtuoso), property graphs (Neo4j), or vector-augmented graph stores.
Pitfalls
• Coreference before RE. “He founded Apple” — RE needs to know who “he” is. Run
coref first (lesson 24).
• Entity canonicalization. “Apple Inc” and “Apple” must resolve to the same node. Entity
linking first (lesson 25).
• Hallucinated triples. LLMs emit triples the text does not support. Enforce span verifi-
cation.
• Relation canonicalization drift. Open IE relations are inconsistent (“was born in,”
“came from,” “is a native of”). Collapse to canonical ids or the graph is unqueryable.
• Temporal errors. “Tim Cook is CEO of Apple” — true now, false in 2005. Many relations
are time-bounded. Use qualifiers (P580 start time, P582 end time in Wikidata).
• Domain mismatch. REBEL trained on Wikipedia. Legal, medical, and scientific text
often need domain-fine-tuned RE models.
Use It
The 2026 stack:
Situation Pick
Fast production, general domain REBEL or LlamaPred with
Wikidata canonicalization
Domain-specific (biomed, legal) SciREX-style domain fine-tune
+ custom ontology
LLM-prompted, audited output AEVS pipeline: anchor →
extract → verify → supplement
High-volume news IE Pattern-based + supervised
hybrid
Building a KG from scratch Open IE + manual
canonicalization pass
Temporal KG Extract with qualifiers
(start/end time, point in time)
The integration pattern: NER → coref → entity linking → relation extraction → ontology map-
ping → graph load. Every stage is a potential quality gate.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
AIENGINEERINGFROMSCRATCH.COM 155

RELATION EXTRACTION & KNOWLEDGE GRAPH CONSTRUCTION
engineering-from-scratch/tree/main/phases/05-nlp-foundations-to-advanced/26-relation-
extraction-kg
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/05-nlp-foundations-to-advanced/26-relation-
extraction-kg/code
1. Easy. Run the pattern extractor in code/main.py on 5 news-article sentences. Hand-
check precision.
2. Medium. Use REBEL (or a small LLM) on the same sentences. Compare triples. Which
extractor has higher precision? Higher recall?
3. Hard. Build the AEVS pipeline: extract with LLM + verify spans against source. Mea-
sure hallucination rate before vs after the verify step on 50 Wikipedia-style sentences.
Key Terms
Term What people say What it actually means
Triple Subject-relation-object (s, r, o) tuple that is the atomic unit of a
KG.
Open IE Extract anything Open-vocabulary relation phrases; high
recall, low precision.
Closed Fixed schema Bounded set of relation types (Wikidata,
ontology UMLS, FIBO).
CanonicalizatiNonormalize everything Map surface names / relations to canonical
ids.
AEVS Grounded extraction Anchor-Extraction-Verification-Supplement
pipeline (2026).
Provenance Source-of-truth link Every triple carries a doc id + char-span to
its source.
Distant su- Cheap labels Align text with an existing KG to create
pervision training data.
Further Reading
• Mintz et al. (2009). Distant supervision for relation extraction without labeled data —
the distant-supervision paper.
• Huguet Cabot, Navigli (2021). REBEL: Relation Extraction By End-to-end Language
generation — seq2seq RE workhorse.
• Wadden et al. (2019). Entity, Relation, and Event Extraction with Contextualized Span
Representations (DyGIE++) — joint IE.
• AEVS — Anchor-Extraction-Verification-Supplement framework — 2026 hallucination-
mitigation design.
• Wikidata SPARQL tutorial — canonical graph queries.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/05-nlp-foundations-to-advanced/26-relation-extraction-kg
AIENGINEERINGFROMSCRATCH.COM 156

RELATION EXTRACTION & KNOWLEDGE GRAPH CONSTRUCTION
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/05-nlp-foundations-to-advanced/26-relation-extraction-kg/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/05-nlp-foundations-to-advanced/26-relation-extraction-kg
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 157