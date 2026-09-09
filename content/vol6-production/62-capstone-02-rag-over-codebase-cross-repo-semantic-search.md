---
title: "Capstone 02 — RAG over Codebase (Cross-Repo Semantic Search)"
volume: "vol6-production"
part: "Part III — Capstone Projects"
chapter_number: 62
source_pages: "267-271"
---

# Capstone 02 — RAG over Codebase (Cross-Repo Semantic Search)

Capstone 02 — RAG over Codebase (Cross-
Repo Semantic Search)
Every serious engineering org in 2026 runs an internal code search that under-
stands meaning, not just strings. Sourcegraph Amp, Cursor’s codebase answers,
Augment’s enterprise graph, Aider’s repomap, Pinterest’s internal MCP — same
shape. Ingest many repos, parse with tree-sitter, embed function- and class-level
chunks, hybrid-search, re-rank, answer with citations. This capstone asks you to
build one that handles 2M lines of code across 10 repos and survives incremental
re-indexing on every git push.
Type: Capstone Languages: Python (ingestion), TypeScript (API + UI) Prerequisites:
Phase 5 (NLP foundations), Phase 7 (transformers), Phase 11 (LLM engineering), Phase 13
(tools), Phase 17 (infrastructure) Phases exercised: P5 · P7 · P11 · P13 · P17 Time: 30
hours
Problem
By 2026 every frontier coding agent ships with a codebase retrieval layer because context
windows alone do not solve cross-repo questions. Claude’s 1M-token context helps; it does
not eliminate the need for ranked retrieval. Naive cosine search over raw chunks poisons
results on generated code, on monorepo duplication, and on the long tail of rarely-imported
symbols. The production answer is a hybrid (dense + BM25) search over AST-aware chunks
with a re-ranker, backed by a graph of symbol references.
You learn this by indexing a real fleet — not one tutorial repo — and measuring MRR@10,
citation faithfulness, and incremental freshness. The failure modes are infrastructural: a
100k-file monorepo, a push that retouches half the files, a query that needs to cross four
repos to answer correctly.
Concept
An AST-aware ingestion pipeline parses each file with tree-sitter, extracts function and class
nodes, and chunks at node boundaries rather than fixed token windows. Each chunk gets
three representations: a dense embedding (Voyage-code-3 or nomic-embed-code), sparse
BM25 terms, and a short natural-language summary. The summary adds a third retrievable
modality — users ask “how is X authorized” and the summary mentions “authz”, even if the
code only has check_permission.
Retrieval is hybrid. A query fires both dense and BM25 searches, merges top-k, and hands
the union to a cross-encoder re-ranker (Cohere rerank-3 or bge-reranker-v2-gemma-2b). The
re-ranked list goes to a long-context synthesizer (Claude Sonnet 4.7 with prompt caching, or
Llama 3.3 70B self-hosted) with instructions to cite every claim by file and line range. Answers
without citations are rejected by a post-filter.
Incremental freshness is the infrastructure problem. Git push triggers a diff: which files
changed, which symbols changed. Only affected chunks re-embed. Affected cross-file symbol
AIENGINEERINGFROMSCRATCH.COM 260

CAPSTONE 02 — RAG OVER CODEBASE (CROSS-REPO SEMANTIC SEARCH)
edges (imports, method calls) get recomputed. The index stays consistent without reprocess-
ing 2M lines each commit.
Architecture
git push --> webhook --> ingest worker (LlamaIndex Workflow)
|
v
tree-sitter parse + AST chunk
|
+--------------+----------------+
v v v
dense BM25 index summary (LLM)
(Voyage / bge) (Tantivy) (Haiku 4.5)
| | |
+------> Qdrant / pgvector <----+
|
v
symbol graph (Neo4j / kuzu)
|
query --> LangGraph agent (retrieve -> rerank -> synth)
|
v
Claude Sonnet 4.7 1M context
|
v
answer + file:line citations
Stack
• Parsing: tree-sitter with 17 language grammars (Python, TS, Rust, Go, Java, C++, etc.)
• Dense embeddings: Voyage-code-3 (hosted) or nomic-embed-code-v1.5 (self-host), bge-
code-v1 fallback
• Sparse index: Tantivy (Rust) with BM25F, field-weighted on symbol name vs body
• Vector DB: Qdrant 1.12 with hybrid search, or pgvector + pgvectorscale for teams under
50M vectors
• Chunk summary model: Claude Haiku 4.5 or Gemini 2.5 Flash, prompt-cached
• Re-ranker: Cohere rerank-3 or bge-reranker-v2-gemma-2b self-hosted
• Orchestration: LlamaIndex Workflows for ingestion, LangGraph for query agent
• Synthesizer: Claude Sonnet 4.7 (1M context) with prompt caching
• Symbol graph: Neo4j (managed) or kuzu (embedded) for import and call edges
• Observability: Langfuse spans per retrieval + synthesis step
Interactive figure: ce-hybrid-retrieval. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/19-capstone-projects/02-rag-over-codebase
Build It
1. Ingestion walker. Iterate git history on every push hook. Collect changed files. For
each file, parse with tree-sitter, extract function and class nodes with their full source
AIENGINEERINGFROMSCRATCH.COM 261

CAPSTONE 02 — RAG OVER CODEBASE (CROSS-REPO SEMANTIC SEARCH)
span. Emit chunk records {repo, path, start_line, end_line, symbol, body}.
2. Chunk summarizer. Batch chunks into Haiku 4.5 calls with prompt caching on the
system preamble. Prompt: “Summarize this function in one sentence, naming its public
contract and side effects.” Store summary alongside the chunk.
3. Embedding pool. Two parallel queues: dense (Voyage-code-3 batch 128) and summary
(same model, but on the summary string). Write vectors to Qdrant with payload {repo,
path, start_line, end_line, symbol, kind}.
4. BM25 index. Field-weighted Tantivy index: symbol name weight 4, symbol body weight
1, summary weight 2. Enables “find the function named X” queries alongside “find the
function that does X”.
5. Symbol graph. For each chunk, record edges: imports (this file uses symbol Y from
repo Z), calls (this function calls method M on class C), inheritance. Store in kuzu. Used
at query time to expand retrieval across repo boundaries.
6. Query agent. LangGraph with three nodes. retrieve fires dense + BM25 in parallel,
deduplicates by (repo, path, symbol). rerank runs the cross-encoder on top-50 and keeps
top-10. synth calls Claude Sonnet 4.7 with the reranked chunks in context, caches the
system prompt, requires file:line citations.
7. Citation enforcement. Parse the model output; any claim without a (repo/path:start-
end) anchor gets flagged for re-ask or dropped. Return cited-only answer to the user.
8. Incremental re-index. On each webhook, compute the symbol-level diff. Only re-
embed chunks whose text changed. Recompute symbol edges for chunks whose imports
changed. Measure: a 50-file push re-indexed in under 60 seconds for a 2M-LOC fleet.
9. Eval. Label 100 cross-repo questions with gold file:line answers. Measure MRR@10,
nDCG@10, citation faithfulness (fraction of claims with verifiable anchors), and p50/p99
latency.
Use It
$ code-rag ask "how is S3 multipart abort wired into our retry budget?"
[retrieve] 12 chunks dense + 7 chunks bm25, 16 unique after dedup
[rerank] top-5 kept (cohere rerank-3)
[synth] claude-sonnet-4.7, cache hit rate 68%, 2.1s
answer:
Multipart aborts are triggered by `AbortMultipartOnFail` in
services/uploader/retry.go:122-148, which decrements the per-bucket
retry budget defined in config/budgets.yaml:34-51 ...
citations: [services/uploader/retry.go:122-148, config/budgets.yaml:34-51,
libs/s3client/multipart.ts:44-61]
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/19-capstone-projects/02-rag-over-codebase
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/19-capstone-projects/02-rag-over-codebase/code
AIENGINEERINGFROMSCRATCH.COM 262

CAPSTONE 02 — RAG OVER CODEBASE (CROSS-REPO SEMANTIC SEARCH)
1. Swap Voyage-code-3 for nomic-embed-code self-hosted. Measure the MRR@10 delta.
Report whether the gap closes with re-ranking enabled.
2. Inject 20% generated code (LLM-produced boilerplate) into the corpus and re-evaluate.
Observe retrieval poisoning. Add a “generated” flag to the payload and down-weight
those hits.
3. Benchmark Qdrant hybrid search vs pgvector + pgvectorscale at your corpus size. Re-
port p99 at batch size 1.
4. Add a sampling-based drift check: weekly, rerun the 100-question eval. Alert on
MRR@10 drop > 5%.
5. Extend to cross-language symbol resolution: a Python function that calls a Go service
over gRPC. Use the symbol graph to link them.
Key Terms
Term What people say What it actually means
AST-aware “Function-level splits” Cutting code at tree-sitter node boundaries
chunking instead of fixed token windows
Hybrid “Dense + sparse” Run BM25 and vector search in parallel,
search merge top-k, rerank
Cross- “Second-stage rank” Model that scores each (query, candidate)
encoder pair together, more accurate than cosine
rerank
Prompt “Cached system prompt” 2026 Claude / OpenAI feature that discounts
caching repeat prefix tokens up to 90%
Symbol “Code graph” Edges for imports, calls, inheritance across
graph files and repos
Citation “Grounded answer rate” Fraction of claims a user can verify by
faithful- clicking the anchor and reading the
ness referenced span
Incremental “Push-to-search time” Wall-clock from git push to the changed
re-index symbols being queryable
Further Reading
• Sourcegraph Amp — production cross-repo code intelligence
• Sourcegraph Cody RAG architecture — the reference deep-dive for this capstone
• Aider repo-map — tree-sitter ranked repo view
• Augment Code enterprise graph — commercial symbol-graph RAG
• Qdrant hybrid search docs — reference implementation
• Voyage AI code embeddings — Voyage-code-3 details
• Cohere rerank-3 — cross-encoder reference
• Pinterest MCP internal search — internal-platform reference
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/19-capstone-projects/02-rag-over-codebase
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/19-capstone-projects/02-rag-over-codebase/code
AIENGINEERINGFROMSCRATCH.COM 263

CAPSTONE 02 — RAG OVER CODEBASE (CROSS-REPO SEMANTIC SEARCH)
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/19-capstone-projects/02-rag-over-codebase
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 264