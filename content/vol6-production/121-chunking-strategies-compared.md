---
title: "Chunking Strategies, Compared"
volume: "vol6-production"
part: "Part III — Capstone Projects"
chapter_number: 121
source_pages: "509-513"
---

# Chunking Strategies, Compared

Chunking Strategies, Compared
Chunking decides what your retriever can ever surface. Get the boundaries wrong
and no embedding model, no reranker, no LLM can repair the damage downstream.
Type: Build Languages: Python Prerequisites: Phase 11 lessons 04 (embeddings), 06
(RAG), 07 (advanced RAG); Phase 19 Track B foundations (lessons 20-29) Time: ~90 min-
utes
Learning Objectives
• Implement five chunking strategies from scratch: fixed-window, sentence, recursive-
split, semantic clustering, and structural markdown headers.
• Measure recall@k on a fixture corpus with gold-labeled answer spans and explain why
one strategy wins on prose and a different strategy wins on technical documents.
• Read a chunk-length distribution and recognize the failure modes each strategy injects:
orphan sentences, mid-symbol cuts, header-only chunks, semantic drift.
• Pick a default for a new corpus without running the benchmark by inspecting three
properties: document type, average paragraph length, and whether the format carries
explicit structure.
The Problem
Every RAG pipeline starts by cutting source documents into pieces small enough that an
embedding model fits them and large enough that each piece carries a self-contained idea.
The choice of where to cut is not a hyperparameter. It is the upper bound on what the retriever
can ever return.
A query that asks “what does the budget abort threshold look like” can only succeed if the
chunk that holds the abort threshold is reachable. If the fixed-window splitter cut the thresh-
old value from the surrounding context, the embedding moves to a different cluster, the BM25
score drops, the rerankers see noise, and the answer the LLM generates is wrong. The 2024
paper “LongRAG: Enhancing Retrieval-Augmented Generation with Long-context LLMs” mea-
sured a 35 percent absolute swing in retrieval recall purely from the chunking choice. The
follow-up work in 2025 on contextual chunk headers narrowed the gap but did not close it.
This lesson builds five strategies side by side, runs them against a fixture corpus with gold-
labeled answer spans, and lets you read the recall numbers yourself.
The Concept
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/19-capstone-projects/64-chunking-strategies-advanced
AIENGINEERINGFROMSCRATCH.COM 502

CHUNKING STRATEGIES, COMPARED
Fixed-window
The brute-force baseline. Cut every N characters. Optionally overlap so a sentence cut at po-
sition N appears whole inside the chunk that starts at position N - overlap. Fast, deterministic,
terrible at boundaries. Use it as a control, not a default.
Sentence
Split on sentence boundaries with a regex or a simple state machine. Pack one or more
sentences into a chunk up to a target character budget. Stops cutting mid-word. Still cuts
mid-paragraph and mid-section. The default in many early RAG pipelines and a reasonable
choice for prose with no other structure.
Recursive split
The hierarchy strategy popularized by 2023-era libraries. Try to split on the strongest separa-
tor first (double newline, paragraph), fall back to the next (single newline), then to sentences,
then to characters. The recursion terminates when the chunk fits the budget. Strong on
documents that have inconsistent structure because it adapts per region.
Semantic clustering
Embed every sentence. Cluster contiguous sentences that share a topic centroid. Cut when-
ever the running similarity to the centroid drops below a threshold. The boundaries reflect
meaning, not characters. Slower to build and dependent on the embedding model, but re-
silient against documents that switch topics inside a paragraph.
Structural markdown headers
For documents that carry explicit structure (markdown, reStructuredText, RFC-style num-
bered sections), cut at heading boundaries. Each chunk becomes the heading plus everything
underneath it down to the next heading at the same or higher level. Smallest chunks per topic,
but only available when the corpus is well-formed.
How recall@k measures the boundary choice
A gold-labeled query carries the exact character offsets of the answer span inside the source
document. After chunking, you ask: does any of the top-k chunks the retriever returned
overlap the gold span? If yes, recall@k for that query is 1. If no, it is 0. Average across
the query set. Run the same evaluation for each strategy and the spread shows you which
boundary policy survives the corpus you have.
Interactive figure: ci-chunk-boundaries. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/19-capstone-projects/64-chunking-strategies-advanced
Build It
code/main.py implements:
• fixed_window(text, size, overlap) - the baseline.
• sentence_chunks(text, target) - simple sentence packer.
• recursive_split(text, separators, target) - hierarchical recursion.
AIENGINEERINGFROMSCRATCH.COM 503

CHUNKING STRATEGIES, COMPARED
• semantic_chunks(text, similarity_threshold) - centroid-based clustering on top of a
deterministic mock embedding.
• structural_markdown(text) - header-aware splitter.
• mock_embed(text, dim) - a hash-based embedding so the loop runs offline.
• DenseIndex - the same shape used in Phase 19 Track B’s hybrid retrieval lesson.
• eval_recall(strategy, corpus, queries, k) - the comparison loop.
• A main() that runs every strategy on the fixture corpus and prints a recall@k table.
Run it:
python3 code/main.py
The output is a small table with one row per strategy and one column per k. Sentence loses on
the structured fixture. Structural-markdown wins on the markdown fixture. Recursive holds
its own on the mixed fixture because the recursion adapts. Semantic clustering wins on the
prose fixture where there are no useful structural cues.
Failure modes the table will not hide
Orphan sentences. Sentence packing produces chunks that miss the topic sentence. The
embedding then points at the wrong cluster.
Mid-symbol cuts. Fixed-window inside code or YAML will split an identifier in half. The two
halves embed to noise.
Header-only chunks. Structural markdown emits a chunk containing nothing but ## Title.
Filter those out or attach the next chunk’s first paragraph.
Semantic drift. Semantic clustering under-cuts when the corpus is uniformly on topic. A
5000-character chunk packs many specific answers into one diffuse embedding. Combine
semantic with a hard character cap.
Stale embeddings. Semantic clustering uses an embedding model. If you change the model,
you also change the chunks. Pin the chunk model separately from the retrieval model or
rebuild the index together.
Choosing a default without running the benchmark
Three properties decide the default chunker for a new corpus.
Property Value Default
Document type Prose with no structure Recursive split, target 800
Document type Markdown / RFC / API Structural markdown
docs
Document type Code AST-aware (out of scope; see
Phase 19 lesson 02)
Paragraph length Long, single topic Sentence, target 500
Paragraph length Short, mixed topics Semantic, threshold 0.6
When in doubt, pick recursive split. It is the strongest single-strategy baseline.
AIENGINEERINGFROMSCRATCH.COM 504

CHUNKING STRATEGIES, COMPARED
Use It
Production patterns:
• Run the eval before you ship a new pipeline; do not trust the strategy your library defaults
to.
• Re-run the eval whenever you change the embedding model or the corpus mix; the win-
ner is corpus-dependent.
• Persist the strategy name in each chunk’s metadata so you can attribute regressions
later.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/19-capstone-projects/64-chunking-strategies-
advanced
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/19-capstone-projects/64-chunking-strategies-
advanced/code
1. Add a sixth strategy: token-window using tiktoken instead of character counts. Com-
pare against fixed-window on the same fixture.
2. Inject a 30 percent fraction of code blocks into the prose fixture. Re-run the table. Ex-
plain why every strategy except structural markdown loses recall.
3. Replace the deterministic embedding with the one from your project’s real provider.
Measure the semantic-clustering recall delta. Report whether the spread between strate-
gies widens or narrows.
4. Add a summary field per chunk: a one-sentence centroid description. Re-run the eval with
the summary appended to the chunk body. Measure the recall lift.
Key Terms
Term What people say What it actually means
Recall@k “Did we get the right chunk?” Fraction of queries where any of the top-k
chunks overlaps the gold answer span
Chunk “Sliding window” Re-include the last N characters of the
overlap previous chunk in the next chunk
Structural “Header-aware chunks” Cut at H1/H2/H3 boundaries; the heading
splitter text is part of the chunk
Semantic “Topic-aware chunks” Embed sentences, cluster by centroid
chunker similarity, cut on drift
Centroid “Topic shift” Cosine similarity between the running mean
drift and the next sentence drops past a threshold
Further Reading
• LongRAG: Enhancing Retrieval-Augmented Generation with Long-context LLMs (arXiv
2406.15319)
AIENGINEERINGFROMSCRATCH.COM 505

CHUNKING STRATEGIES, COMPARED
• Anthropic, Contextual Retrieval
• LlamaIndex, Chunking strategies for production RAG
• Phase 11 lesson 06 - RAG fundamentals
• Phase 11 lesson 07 - advanced RAG
• Phase 19 lesson 65 - hybrid retrieval that ranks the chunks produced here
• Phase 19 lesson 68 - the eval harness that scores the strategy choice in production
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/19-capstone-projects/64-chunking-strategies-advanced
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/19-capstone-projects/64-chunking-strategies-advanced/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/19-capstone-projects/64-chunking-strategies-advanced
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 506