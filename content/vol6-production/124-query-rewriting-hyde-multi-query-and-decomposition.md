---
title: "Query Rewriting: HyDE, Multi-Query, and Decomposition"
volume: "vol6-production"
part: "Part III — Capstone Projects"
chapter_number: 124
source_pages: "524-533"
---

# Query Rewriting: HyDE, Multi-Query, and Decomposition

Query Rewriting: HyDE, Multi-Query,
and Decomposition
The query the user types is not the query your retriever wants. Rewriting bridges
the gap before retrieval, so the index sees something closer to what the answer
looks like.
Type: Build Languages: Python Prerequisites: Phase 11 lessons 04 (embeddings), 06
(RAG); Phase 19 Track B foundations (lessons 20-29); Phase 19 lessons 64 and 65 Time:
~90 minutes
Learning Objectives
• Implement Hypothetical Document Embeddings (HyDE): generate a fake answer, embed
it, retrieve against that vector instead of the query vector.
• Implement multi-query expansion: rewrite one query into N paraphrases, retrieve with
each, merge the union by reciprocal rank fusion.
• Implement query decomposition: split a complex question into sub-questions, retrieve
per sub-question, merge.
• Compare the three rewriters head to head on a fixture and explain when each strategy
wins.
• Wire a mock LLM that produces deterministic, on-fixture outputs so the rewriter loop
runs offline.
The Problem
A user types “what does our team do when uploads fail and the budget is gone?”. The corpus
contains a doc that says “AbortMultipartOnFail aborts an in-flight S3 multipart upload and
decrements the per-bucket retry budget when the upload fails”. The query and the document
do not share a noun phrase. BM25 misses. The bi-encoder ranks the document third or fourth
because the query vector lands in a region of the embedding space that prefers the doc about
cancelled jobs, not the doc about aborted uploads. The two-stage rerank from lesson 66 can
salvage the answer if it sits in the top-N, but if it does not even reach top-N, the reranker
never sees it.
The fix is to rewrite the query before it touches the retriever. The 2023 paper “Precise Zero-
Shot Dense Retrieval without Relevance Labels” (Gao et al.) introduced HyDE: ask an LLM
to write the document that would answer the query, embed that hypothetical document, and
use its embedding as the retrieval vector. The hypothetical document sits in the right region
of the embedding space because it is written in the corpus’s voice. The query vector did not.
Two cousin techniques pair with HyDE. Multi-query expansion (the term Microsoft’s
GraphRAG used) generates N paraphrases of the query and retrieves with each, then merges.
Decomposition (popularized as “subquery decomposition” in the 2024 Stanford DSPy work)
splits “what does our team do when uploads fail and the budget is gone” into two questions:
AIENGINEERINGFROMSCRATCH.COM 517

QUERY REWRITING: HYDE, MULTI-QUERY, AND DECOMPOSITION
“what happens when an upload fails” and “what happens when the retry budget is gone”.
Two retrievals, one merged result, both pieces of the answer reachable.
This lesson implements all three and runs them against the same fixture corpus.
The Concept
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/19-capstone-projects/67-query-rewriting-hyde
HyDE in detail
HyDE replaces the user’s query vector with an LLM-written hypothetical document vector.
The prompt is short:
You are a domain expert. Write a one-paragraph passage that answers the question
below. Use the same vocabulary and phrasing the documentation in this domain would
use. Do not refuse. Do not say you do not know.
Question: {user_query}
Passage:
The LLM’s answer is wrong as a factual answer because the LLM does not know your corpus.
That is fine. The retriever does not care about factual correctness, only about token distribu-
tion. The hypothetical passage contains the words “abort”, “multipart”, “bucket”, “budget”,
because that is what a documentation passage on this topic would say. Embed that passage.
The vector lands near the real passage.
In production you cap the hypothetical document to two or three sentences. Longer hypothet-
icals collect more noise. Shorter ones lose the lexical signal HyDE needs.
Multi-query expansion in detail
Generate N paraphrases of the user’s query. The simplest prompt:
Rewrite the following question in {N} different ways. Each rewrite must preserve
the original intent. Number them 1 to {N}. Do not add explanations.
Retrieve top-k for each paraphrase. Merge the N ranked lists with RRF (the same algorithm
from lesson 65). Cheap, parallel, deterministic.
Multi-query wins when the user’s phrasing is one of many equally valid ways to ask the ques-
tion, and any of the rewrites would have asked it better. Loses when all rewrites are equally
bad because the original was bad in the same way.
Decomposition in detail
A single retrieval cannot satisfy a multi-faceted question. Decomposition asks the LLM to
split the question into sub-questions and the system retrieves per sub-question. The prompt:
The following question may require information from multiple distinct topics.
Decompose it into a list of sub-questions. Each sub-question must be answerable
independently. If the question is already atomic, return it unchanged.
Question: {user_query}
AIENGINEERINGFROMSCRATCH.COM 518

QUERY REWRITING: HYDE, MULTI-QUERY, AND DECOMPOSITION
Retrieve per sub-question. Merge. Decomposition is the right tool for questions that con-
tain conjunctions, multi-clause comparisons, or two unrelated topics. Wrong tool for atomic
questions; the decomposer’s job there is to return the single question and not invent fake
sub-questions.
Why all three exist
The three are complementary. HyDE bridges the query-corpus token gap. Multi-query covers
paraphrase variance. Decomposition covers multi-topic queries. A production system runs
all three and picks the strategy per query (lesson 69’s end-to-end system shows the selector).
The Mock LLM
The lesson runs offline. The mock LLM is a small lookup table keyed on the user’s query, plus
a fallback for queries it has not seen. The lookup table contains:
• For each fixture query: a written hypothetical passage, three paraphrases, and a decom-
position.
• For an unknown query: a deterministic transformation: take the query’s content words,
expand them through a synonym map, and return the result.
The shape of the mock is what matters, not the data. In production you swap the mock for a
real model call. The retriever does not change.
Interactive figure: cd-hyde-vector. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/19-
capstone-projects/67-query-rewriting-hyde
Build It
code/main.py implements:
• MockLLM - the deterministic stand-in described above.
• HyDERewriter - calls the LLM to write the hypothetical document, returns the rewriter
output as RewriteResult with the hypothetical text and the query the retriever should
use.
• MultiQueryRewriter - calls the LLM for N paraphrases, returns a list of queries.
• DecomposeRewriter - calls the LLM to decompose, returns sub-questions.
• retrieve_with_rewriter - takes a rewriter and a retriever, runs the rewrites, fuses the
results.
• A demo that runs the three rewriters on a fixture and prints which strategy returned the
gold answer document first.
The retriever shape is reused from lesson 65 (hybrid BM25 + dense). The fusion is the same
RRF. The only new shape is the rewriter interface, which is small.
Run it:
python3 code/main.py
The output is a per-strategy ranking and a final summary. HyDE wins on the phrasing-
mismatched query. Multi-query wins on the paraphrase-variance query. Decomposition wins
on the multi-topic query. The fallback (no rewriter) loses on at least one of the three.
AIENGINEERINGFROMSCRATCH.COM 519

QUERY REWRITING: HYDE, MULTI-QUERY, AND DECOMPOSITION
Failure modes the demo will hide
HyDE hallucinates corpus-specific identifiers wrong. The model invents a function name.
The hypothetical’s BM25 score on the right doc collapses because the invented name is now
a high-weight token that does not appear in the index. Cap the hypothetical’s length and
weight BM25 lower in the fusion.
Multi-query rewrites all converge. A weak model produces three near-identical para-
phrases. The N retrievals return the same top-k. The RRF merge is no better than a single
retrieval. Add an explicit diversity instruction to the rewrite prompt and detect duplicates by
Jaccard.
Decomposition over-splits. The decomposer turns an atomic question into a list. The re-
trievals all return the same document but with reduced rank. The merge is worse than the
original. Detect this with a “are these sub-questions distinct enough” pass before fan-out.
Latency multiplies. HyDE costs one LLM call. Multi-query costs one LLM call to gener-
ate N rewrites, then N retrievals. Decomposition costs one LLM call to decompose, then M
retrievals. The retrievals run in parallel; the LLM call is the floor.
Use It
Production patterns:
• Per-query strategy selection by query length: atomic short queries get multi-query, com-
plex multi-clause queries get decomposition, jargon-heavy queries get HyDE.
• Cache the rewriter output by query hash. Many queries repeat.
• Run all three in parallel and fuse the three result sets into one with RRF. The cost is
three LLM calls and one fusion; the quality is the union of all three strategies’ coverage.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/19-capstone-projects/67-query-rewriting-hyde
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/19-capstone-projects/67-query-rewriting-hyde/code
1. Implement RAG-Fusion (a 2024 variant of multi-query) where the rewriter’s paraphrases
are intentionally diverse, then the rerank step (lesson 66) picks the final list.
2. Add a fourth strategy: step-back prompting (ask the LLM for the more general question,
retrieve on that, then narrow). Compare on the fixture.
3. Train the decomposer to recognize atomic queries by adding a “is the question atomic”
head. Measure the over-split rate before and after.
4. Replace the mock LLM with a real model call. Measure the latency-per-strategy on your
stack.
5. Add a confidence score per rewrite. Drop rewrites below the threshold. Measure the
impact on recall.
Key Terms
AIENGINEERINGFROMSCRATCH.COM 520

QUERY REWRITING: HYDE, MULTI-QUERY, AND DECOMPOSITION
Term What people say What it actually means
HyDE “Fake-document retrieval” LLM writes the answer; embed and retrieve
on that instead of the query
Multi- “Paraphrase expansion” N rewrites of the query; retrieve N times,
query merge by RRF
Decompositio“nSubquery split” Multi-topic queries split into sub-questions,
retrieved separately
Atomic “Single-topic” Cannot be decomposed without inventing
query fake sub-questions
Step-back “Abstract the query” Ask the more general question, retrieve,
then narrow
Further Reading
• Gao, Ma, Lin, Callan, “Precise Zero-Shot Dense Retrieval without Relevance Labels”
(HyDE), 2023
• Microsoft Research, “Multi-Query Expansion for Retrieval”
• Stanford DSPy, “Subquery Decomposition for Multi-Hop QA”
• LlamaIndex query transformations documentation
• Phase 11 lesson 07 - advanced RAG patterns
• Phase 19 lesson 65 - the retriever this rewriter feeds
• Phase 19 lesson 68 - the eval that measures the rewriter lift
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/19-capstone-projects/67-query-rewriting-hyde
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/19-capstone-projects/67-query-rewriting-hyde/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/19-capstone-projects/67-query-rewriting-hyde
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 521

RAG Evaluation: Precision, Recall, MRR,
nDCG, Faithfulness, Answer Relevance
If you cannot grade your retrieval and your answer at the same time, you cannot
ship the system. The two are not the same metric and the same prompt fails on
different axes.
Type: Build Languages: Python Prerequisites: Phase 11 lessons 06 (RAG), 10 (evaluation);
Phase 19 Track B foundations (lessons 20-29); Phase 19 lessons 64, 65, 66, 67 Time: ~90
minutes
Learning Objectives
• Compute four retrieval metrics from gold qrels: precision@k, recall@k, MRR (mean
reciprocal rank), and nDCG@k.
• Compute two answer-grade metrics: faithfulness (every claim grounded in retrieved
context) and answer relevance (the answer addresses the question).
• Build a fixture qrels file (queries, gold doc ids, gold answer text) that the eval reads end
to end.
• Read the metric values to diagnose where a pipeline is failing: retrieval, ranking, gener-
ation, or grounding.
The Problem
A RAG system has at least four moving parts: chunker, retriever, reranker, generator. Any of
them can be the cause of a wrong answer. Without per-stage metrics you are flying blind.
A user reports a wrong answer. Is it because the chunker cut the answer span? Is it because
the retriever did not include the chunk in top-k? Is it because the reranker pushed the right
chunk past position one? Is it because the generator ignored the chunk and made something
up? You cannot tell from the answer alone. You need:
• Retrieval metrics to grade what came out of the retriever.
• Ranking metrics to grade where the right chunk sat in the order.
• Faithfulness to grade whether the generator stayed inside the retrieved context.
• Answer relevance to grade whether the answer addresses the question at all.
This lesson builds all six on top of a fixture qrels file. The eval is offline and deterministic; in
production you swap the mock LLM-as-judge for a real one.
The Concept
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/19-capstone-projects/68-rag-eval-precision-recall
AIENGINEERINGFROMSCRATCH.COM 522

RAG EVALUATION: PRECISION, RECALL, MRR, NDCG, FAITHFULNESS, ANSWER RELEVANCE
Precision@k
Of the top-k documents the retriever returned, what fraction are in the gold set? If gold has
three documents and the top-3 returns two of them and one wrong one, precision@3 is 2 / 3.
Use precision when the cost of an irrelevant retrieved chunk is high (the generator wastes
tokens on it, or the chunk poisons the answer).
Recall@k
Of the gold documents, what fraction are in the top-k? If gold has three documents and the
top-5 contains all three, recall@5 is 1.0. Use recall when the cost of a missed answer is high
(you would rather see one extra wrong chunk than miss the answer chunk entirely).
In production RAG the metric people usually quote is recall@k. Generation can drop irrele-
vant chunks easily; it cannot invent an answer from a chunk it never saw.
MRR (Mean Reciprocal Rank)
For each query, find the position of the first relevant document in the ranked list. The recip-
rocal rank is 1 / position. Mean across the query set. MRR is a single-number summary of
how well the retriever puts the best answer at the top.
MRR weights position-1 heavily. A query where the gold doc is at rank 1 contributes 1.0. Rank
2 contributes 0.5. Rank 10 contributes 0.1. The metric is dominated by the top of the list.
nDCG@k
Normalized Discounted Cumulative Gain. The full formula assigns a gain to each retrieved
document (often 1 for relevant, 0 for not), discounts by the log of the position, sums, and
divides by the ideal DCG (the DCG you would have if you ranked perfectly). Range 0 to 1.
nDCG accommodates graded relevance: the gold can say “doc A is 3, doc B is 2, doc C is
1”. MRR and recall@k flatten everything to binary. Use nDCG when the corpus has multiple
partially-relevant documents per query.
Faithfulness
For each claim in the generated answer, check whether the claim is supported by the retrieved
context. The standard implementation uses an LLM-as-judge prompt that takes (claim, con-
text) and returns yes or no. The metric is the fraction of claims that pass.
Faithfulness catches the generator failure mode where the model invents content. Even if the
retriever returned the right chunks, a generator that hallucinates is broken. Faithfulness is
also called groundedness, support, attribution.
This lesson implements faithfulness with a deterministic mock judge that checks whether
each claim’s tokens overlap the retrieved context by a threshold. In production you swap to
a real model call. The shape of the metric is the same.
Answer relevance
Does the answer actually address the question? Faithfulness asks “is the answer grounded in
the context?”. Answer relevance asks “is the answer grounded in the question?”. A faithful
but off-topic answer scores high on faithfulness and low on relevance. A short, on-topic answer
that ignores the context scores high on relevance and low on faithfulness.
AIENGINEERINGFROMSCRATCH.COM 523

RAG EVALUATION: PRECISION, RECALL, MRR, NDCG, FAITHFULNESS, ANSWER RELEVANCE
The standard implementation also uses LLM-as-judge: take (question, answer) and ask
whether the answer addresses the question. This lesson implements a token-overlap-plus-
judge stand-in.
The fixture qrels
{
"qid": "q1",
"query": "what is the abort threshold for multipart uploads",
"gold_doc_ids": ["d1", "d3"],
"gold_answer_substring": "three failed parts",
"graded_relevance": {"d1": 3, "d3": 2},
}
Each query carries: - the query string, - a set of gold doc ids (for precision / recall / MRR), -
a graded relevance dict (for nDCG), - the gold answer substring (kept as reference metadata
on each qrel; faithfulness in this lesson is computed by judging extracted claims against the
retrieved context, not against this substring).
In production you label these. This lesson ships a hand-built fixture so the eval runs out of
the box.
Interactive figure: ci-rag-metric-ladder. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/19-capstone-projects/68-rag-eval-precision-recall
Build It
code/main.py implements:
• precision_at_k(retrieved, gold, k) - the literal definition.
• recall_at_k(retrieved, gold, k) - the literal definition.
• mean_reciprocal_rank(retrieved_list_of_lists, gold_list) - the mean over queries.
• ndcg_at_k(retrieved, graded_relevance, k) - DCG / IDCG with binary or graded gains.
• extract_claims(answer) - splits an answer into sentence-shaped claims.
• faithfulness(claims, context_texts, judge) - fraction of claims judged supported.
• answer_relevance(question, answer, judge) - judge on whether the answer addresses
the question.
• MockJudge - deterministic token-overlap judge so the eval runs offline.
• evaluate_pipeline(pipeline_fn, qrels, ks) - the orchestrator that runs every metric.
• A demo that runs three pipeline variants (chunker baseline, hybrid retrieval, hybrid +
rerank) against the qrels and prints a metrics table.
Run it:
python3 code/main.py
The output shows precision@k, recall@k, MRR, nDCG@k, faithfulness, and answer relevance
for each variant in a single metrics table. The hybrid retrieval row beats the chunker baseline
on recall; the rerank row beats hybrid on MRR.
Reading the metrics to diagnose failures
AIENGINEERINGFROMSCRATCH.COM 524

RAG EVALUATION: PRECISION, RECALL, MRR, NDCG, FAITHFULNESS, ANSWER RELEVANCE
Symptom Likely cause What to fix
Low recall@k, low Chunker cut the answer or Chunker boundaries (lesson 64)
precision@k retriever cannot find it or retriever modality (lesson 65)
Decent recall@k, low Right chunk is in top-k but not Reranker (lesson 66)
MRR at position 1
High MRR, low Generator invents content Generation prompt;
faithfulness despite right context force-cite-or-refuse
High faithfulness, low Answer is grounded but off-topic Query rewriter (lesson 67) or
relevance generation prompt
All four high, users Eval set is unrepresentative Expand qrels with real user
still complain queries
Failure modes the demo will hide
LLM-as-judge bias. A model judges its own outputs as more faithful than they are. Use a
different model family for the judge than the generator, or hand-grade a sample.
Qrels rot. The gold answers drift as the corpus changes. A doc that was gold for q1 in
January 2024 is no longer the right answer in October 2024 because the team renamed the
function. Schedule a quarterly qrels review.
Faithfulness micro-checks miss macro-claims. Per-sentence faithfulness can pass while
the overall answer’s structure misleads. Add a sample-level qualitative review on top of the
automated metric.
Recall@k masks per-query failures. A 90% average recall can hide that one query class
always misses. Slice the qrels by query class (literal, paraphrased, multi-topic) and report
per-slice.
Use It
Production patterns:
• Run the eval on every retriever or generator change. Treat a recall@k regression like a
test failure.
• Persist the metric trace per query. When a user complains, look up the qrels entry that
matches and see whether it would have been caught.
• Tier the qrels: a smoke set of 20 queries that runs in CI; a regression set of 200 that
runs nightly; a deep set of 2000 that runs weekly.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/19-capstone-projects/68-rag-eval-precision-
recall
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engine
ering-from-scratch/tree/main/phases/19-capstone-projects/68-rag-eval-precision-recall/code
1. Add a fifth retrieval metric: hit-rate@k. Compare it against recall@k. Explain when they
differ.
AIENGINEERINGFROMSCRATCH.COM 525

RAG EVALUATION: PRECISION, RECALL, MRR, NDCG, FAITHFULNESS, ANSWER RELEVANCE
2. Implement a graded faithfulness: 0 (unsupported), 1 (partially supported), 2 (fully sup-
ported). Update the metric accordingly.
3. Replace the mock judge with a real model call. Measure the disagreement between the
mock and the real judge on the fixture.
4. Add a query-class slice (“literal”, “paraphrased”, “multi-topic”). Report per-slice metrics.
5. Add an “answer length” metric and correlate it with faithfulness. Plot the curve.
Key Terms
Term What people say What it actually means
Precision@k “Hit rate over retrieved” Fraction of top-k that are gold
Recall@k “Hit rate over gold” Fraction of gold in top-k
MRR “First-hit position” Mean of 1 / rank of first relevant document
nDCG@k “Graded ranking quality” DCG over the top-k divided by ideal DCG
Faithfulness “Groundedness” Fraction of answer claims supported by
retrieved context
Answer “Did it address the question?” Whether the answer matches the question’s
relevance intent
Qrels “Gold labels” The labeled set of queries and their gold
documents and answers
Further Reading
• Buckley, Voorhees, “Evaluating Evaluation Measure Stability”, SIGIR 2000 - the canoni-
cal paper on ranking metrics
• Jarvelin, Kekalainen, “Cumulated Gain-based Evaluation of IR Techniques” - the nDCG
paper
• Ragas: Automated Evaluation of RAG Pipelines
• Anthropic, Evaluating RAG
• Phase 11 lesson 10 - evaluation framework foundations
• Phase 19 lessons 64-67 - components evaluated here
• Phase 19 lesson 69 - the end-to-end pipeline this eval grades
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/19-capstone-projects/68-rag-eval-precision-recall
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/19-capstone-projects/68-rag-eval-precision-recall/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/19-capstone-projects/68-rag-eval-precision-recall
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 526