---
title: "Chunking Strategies for RAG"
volume: "vol3-language"
part: "Part I — NLP — Foundations to Advanced"
chapter_number: 25
source_pages: "139-144"
---

# Chunking Strategies for RAG

Chunking Strategies for RAG
Chunking configuration influences retrieval quality as much as the choice of embed-
ding model (Vectara NAACL 2025). Get chunking wrong and no amount of reranking
saves you.
Type: Build Languages: Python Prerequisites: Phase 5 · 14 (Information Retrieval), Phase
5 · 22 (Embedding Models) Time: ~60 minutes
The Problem
You put a 50-page contract into a RAG system. User asks: “What is the termination clause?”
The retriever returns the cover page. Why? Because the model was trained on 512-token
chunks and the termination clause sits 20 pages in, split across a page break, with no local
keywords tying it to the query.
The fix is not “buy a better embedding model.” The fix is chunking. How big? Overlap? Where
to split? With surrounding context?
Feb 2026 benchmarks show surprising results:
• Vectara’s 2026 study: recursive 512-token chunking beat semantic chunking 69% → 54%
accuracy.
• SPLADE + Mistral-8B on Natural Questions: overlap provided zero measurable benefit.
• Context cliff: response quality drops sharply around 2,500 tokens of context.
The “obvious” answer (semantic chunking, 20% overlap, 1000 tokens) is often wrong. This
lesson builds intuition for six strategies and tells you when to reach for which.
The Concept
Fixed chunking. Split every N characters or tokens. Simplest baseline. Breaks mid-
sentence. Good compression, bad coherence.
Recursive. LangChain’s RecursiveCharacterTextSplitter. Try splitting on \n\n first, then
\n, then ., then space. Falls back cleanly. The 2026 default.
Semantic. Embed each sentence. Compute cosine similarity between adjacent sentences.
Split where similarity drops below a threshold. Preserves topic coherence. Slower; some-
times produces tiny 40-token fragments that hurt retrieval.
Sentence. Split on sentence boundaries. One sentence per chunk or a window of N sentences.
Matches semantic chunking up to ~5k tokens at a fraction of the cost.
Parent-document. Store small child chunks for retrieval and the larger parent chunk for
context. Retrieve by child; return parent. Degrades gracefully: bad child chunks still return
reasonable parents.
Late chunking (2024). Embed the whole document at the token level first, then pool token
embeddings into chunk embeddings. Preserves cross-chunk context. Works with long-context
embedders (BGE-M3, Jina v3). Higher compute.
AIENGINEERINGFROMSCRATCH.COM 136

CHUNKING STRATEGIES FOR RAG
six chunking strategies on the same document
fixed (size=N)
hard split every N chars — breaks mid-sentence
recursive (\n\n → \n → . → ' ')
try separators in order; 2026 default
semantic (embedding similarity)
split where adjacent-sentence similarity drops
parent-document (child for retrieval, parent for context)
embed the small boxes, return the large boxes — degrades gracefully
late chunking (embed full doc first, then pool)
token embeddings across full doc
pool token embeddings into chunk vectors — preserves cross-chunk context
Figure 14: Six chunking strategies visualized on one passage
Contextual retrieval (Anthropic, 2024). Prepend each chunk with an LLM-generated sum-
mary of its position in the document (“This chunk is section 3.2 of the termination clauses…”).
35-50% retrieval improvement in Anthropic’s own benchmark. Expensive to index.
The rule that beats every default
Match the chunk size to the query type:
Query type Chunk size
Factoid (“what is the CEO’s name?”) 256-512 tokens
Analytical / multi-hop 512-1024 tokens
Whole-section comprehension 1024-2048 tokens
NVIDIA’s 2026 benchmark. The chunk should be big enough to contain the answer plus local
context, small enough that the retriever’s top-K returns focus on the answer rather than
context noise.
Interactive figure: n5-chunk-cuts. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/05-nlp-
foundations-to-advanced/23-chunking-strategies-rag
Build It
Step 1: fixed and recursive chunking
def chunk_fixed(text, size=512, overlap=0):
step = size - overlap
return [text[i:i + size] for i in range(0, len(text), step)]
AIENGINEERINGFROMSCRATCH.COM 137

CHUNKING STRATEGIES FOR RAG
def chunk_recursive(text, size=512, seps=("\n\n", "\n", ". ", " ")):
if len(text) <= size:
return [text]
for sep in seps:
if sep not in text:
continue
parts = text.split(sep)
chunks = []
buf = ""
for p in parts:
if len(p) > size:
if buf:
chunks.append(buf)
buf = ""
chunks.extend(chunk_recursive(p, size=size, seps=seps[1:] or (" ",)))
continue
candidate = buf + sep + p if buf else p
if len(candidate) <= size:
buf = candidate
else:
if buf:
chunks.append(buf)
buf = p
if buf:
chunks.append(buf)
return [c for c in chunks if c.strip()]
return chunk_fixed(text, size)
Step 2: semantic chunking
def chunk_semantic(text, encoder, threshold=0.6, min_chars=200, max_chars=2048):
sentences = split_sentences(text)
if not sentences:
return []
embs = encoder.encode(sentences, normalize_embeddings=True)
chunks = [[sentences[0]]]
for i in range(1, len(sentences)):
sim = float(embs[i] @ embs[i - 1])
current_len = sum(len(s) for s in chunks[-1])
if sim < threshold and current_len >= min_chars:
chunks.append([sentences[i]])
else:
chunks[-1].append(sentences[i])
result = []
for group in chunks:
text_group = " ".join(group)
if len(text_group) > max_chars:
result.extend(chunk_recursive(text_group, size=max_chars))
else:
result.append(text_group)
return result
AIENGINEERINGFROMSCRATCH.COM 138

CHUNKING STRATEGIES FOR RAG
Tune threshold on your domain. Too high → fragments. Too low → one giant chunk.
Step 3: parent-document
def chunk_parent_child(text, parent_size=2048, child_size=256):
parents = chunk_recursive(text, size=parent_size)
mapping = []
for p_idx, parent in enumerate(parents):
children = chunk_recursive(parent, size=child_size)
for child in children:
mapping.append({"child": child, "parent_idx": p_idx, "parent": parent})
return mapping
def retrieve_parent(child_query, mapping, encoder, top_k=3):
child_embs = encoder.encode([m["child"] for m in mapping], normalize_embeddings=True)
q_emb = encoder.encode([child_query], normalize_embeddings=True)[0]
scores = child_embs @ q_emb
top = np.argsort(-scores)[:top_k]
seen, parents = set(), []
for i in top:
if mapping[i]["parent_idx"] not in seen:
parents.append(mapping[i]["parent"])
seen.add(mapping[i]["parent_idx"])
return parents
Key insight: dedupe parents. Multiple children can map to the same parent; returning all
would waste context.
Step 4: contextual retrieval (Anthropic pattern)
def contextualize_chunks(document, chunks, llm):
context_prompts = [
f"""<document>{document}</document>
Here is the chunk to situate: <chunk>{c}</chunk>
Write 50-100 words placing this chunk in the document's context."""
for c in chunks
]
contexts = llm.batch(context_prompts)
return [f"{ctx}\n\n{c}" for ctx, c in zip(contexts, chunks)]
Index the contextualized chunks. At query time, retrieval benefits from the extra surrounding
signal.
Step 5: evaluate
def recall_at_k(queries, corpus_chunks, encoder, k=5):
chunk_embs = encoder.encode(corpus_chunks, normalize_embeddings=True)
hits = 0
for q_text, gold_idxs in queries:
q_emb = encoder.encode([q_text], normalize_embeddings=True)[0]
top = np.argsort(-(chunk_embs @ q_emb))[:k]
if any(i in gold_idxs for i in top):
AIENGINEERINGFROMSCRATCH.COM 139

CHUNKING STRATEGIES FOR RAG
hits += 1
return hits / len(queries)
Always benchmark. The “best” strategy for your corpus may not match any blog post.
Pitfalls
• Chunking evaluated only on factoid queries. Multi-hop queries reveal very different
winners. Use a query-type-stratified eval set.
• Semantic chunking without a minimum size. Produces 40-token fragments that hurt
retrieval. Always enforce min_tokens.
• Overlap as cargo cult. 2026 studies find overlap often provides zero benefit and dou-
bles index cost. Measure, do not assume.
• No min/max enforcement. Chunks of 5 tokens or 5000 tokens both break retrieval.
Clamp.
• Cross-doc chunking. Never let a chunk span two documents. Always chunk per-doc,
then merge.
Use It
The 2026 stack:
Situation Strategy
First build, unknown corpus Recursive, 512 tokens, no overlap
Factoid QA Recursive, 256-512 tokens
Analytical / multi-hop Recursive, 512-1024 tokens +
parent-document
Heavy cross-reference (contracts, papers) Late chunking or contextual retrieval
Conversational / dialog corpus Turn-level chunks + speaker metadata
Short utterances (tweets, reviews) One document = one chunk
Start with recursive 512. Measure recall@5 on a 50-query eval set. Tune from there.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/05-nlp-foundations-to-advanced/23-chunking-
strategies-rag
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/05-nlp-foundations-to-advanced/23-chunking-
strategies-rag/code
1. Easy. Chunk one 20-page document with fixed(512, 0), recursive(512, 0), and recur-
sive(512, 100). Compare chunk counts and boundary quality.
2. Medium. Build a 30-query eval set over 5 documents. Measure recall@5 for recursive,
semantic, and parent-document. Which wins? Does it match the blog posts?
3. Hard. Implement contextual retrieval. Measure MRR improvement over baseline recur-
sive. Report index cost (LLM calls) vs accuracy gain.
AIENGINEERINGFROMSCRATCH.COM 140

CHUNKING STRATEGIES FOR RAG
Key Terms
Term What people say What it actually means
Chunk A piece of a doc Sub-document unit that gets embedded,
indexed, and retrieved.
Overlap Safety margin N tokens shared between adjacent chunks;
often useless in 2026 benchmarks.
Semantic Smart chunking Split where adjacent-sentence embedding
chunking similarity drops.
Parent- Two-level retrieval Retrieve small children, return larger
document parents.
Late Chunk after embedding Embed full doc at token level, pool into
chunking chunk vectors.
Contextual Anthropic’s trick LLM-generated summary prepended to
retrieval each chunk before indexing.
Context 2500-token wall Quality drop observed around 2.5k context
cliff tokens in RAG (Jan 2026).
Further Reading
• Yepes et al. / LangChain — Recursive Character Splitting docs — the default in produc-
tion.
• Vectara (2024, NAACL 2025). Chunking configurations analysis — chunking matters as
much as embedding choice.
• Jina AI — Late Chunking in Long-Context Embedding Models (2024) — the late chunking
paper.
• Anthropic — Contextual Retrieval — 35-50% retrieval improvement with LLM-generated
context prefixes.
• NVIDIA 2026 chunk-size benchmark — Premai summary — chunk size by query type.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/05-nlp-foundations-to-advanced/23-chunking-strategies-rag
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/05-nlp-foundations-to-advanced/23-chunking-strategies-rag/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/05-nlp-foundations-to-advanced/23-chunking-strategies-rag
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 141