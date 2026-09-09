---
title: "LLM Evaluation — RAGAS, DeepEval, G-Eval"
volume: "vol3-language"
part: "Part I — NLP — Foundations to Advanced"
chapter_number: 29
source_pages: "161-166"
---

# LLM Evaluation — RAGAS, DeepEval, G-Eval

LLM Evaluation — RAGAS, DeepEval, G-
Eval
Exact-match and F1 miss semantic equivalence. Human review does not scale.
LLM-as-judge is the production answer — with enough calibration to trust the num-
ber.
Type: Build Languages: Python Prerequisites: Phase 5 · 13 (Question Answering), Phase
5 · 14 (Information Retrieval) Time: ~75 minutes
The Problem
Your RAG system answers: “June 29th, 2007.” The gold reference is: “June 29, 2007.” Exact
Match scores 0. F1 scores ~75%. A human would score 100%.
Now multiply by 10,000 test cases. Multiply again by every change to the retriever, chunking,
prompt, or model. You need an evaluator that understands meaning, runs cheaply at scale,
does not lie about regressions, and surfaces the right failure modes.
2026 has three frameworks that own this problem.
• RAGAS. Retrieval-Augmented Generation ASsessment. Four RAG metrics (faithfulness,
answer-relevance, context-precision, context-recall) with NLI + LLM-judge backends.
Research-backed, lightweight.
• DeepEval. Pytest for LLMs. G-Eval, task-completion, hallucination, bias metrics. CI/CD-
native.
• G-Eval. A method (and a DeepEval metric): LLM-as-judge with chain-of-thought, custom
criteria, 0-1 score.
All three lean on LLM-as-judge. This lesson builds intuition for the method and the trust layer
around it.
The Concept
LLM-as-judge. Replace a static metric with an LLM that scores outputs given a rubric. Given
(query, context, answer), prompt a judge LLM: “Score 0-1 on faithfulness.” Return the
score.
Why it works: LLMs approximate human judgment at a tiny fraction of the cost. GPT-4o-mini
at ~$0.003 per scored case enables 1000-sample regression eval runs for under $5.
Why it fails silently:
1. Judge bias. Judges prefer longer answers, answers from their own model family, an-
swers that match the prompt style.
2. JSON parsing failures. Bad JSON → NaN score → silently excluded from the aggregate.
RAGAS users know this pain. Gate with try/except + explicit failure mode.
3. Drift over model versions. Upgrading the judge changes every metric. Freeze judge
model + version.
AIENGINEERINGFROMSCRATCH.COM 158

LLM EVALUATION — RAGAS, DEEPEVAL, G-EVAL
RAG evaluation — four dimensions, LLM-as-judge backend
question: "When was iPhone released?" four RAG metrics
LLM judge
retrieved context: faithfulness
"Apple released first iPhone (GPT-4o-mini, Haiku, Mistral-small) claims in answer entailed by context?
June 29, 2007."
score(q, ctx, ans) → 0..1
answer relevance
answer: "June 29, 2007." rubric + chain-of-thought answer addresses the question?
calibrated vs human
context precision
fraction of retrieved chunks relevant
context recall
retrieved set covers gold answer?
cost / calibration / CI
$0.001 – $0.003 per judged case with GPT-4o-mini — <$5 per 1000-sample regression run
required: Spearman ρ > 0.7 vs 50 hand-labeled cases before trusting the number
gate: pytest + DeepEval thresholds; freeze judge model + version; surface bottom-10%
Figure 18: Four evaluation dimensions, LLM-as-judge architecture
The RAG four.
Metric Question Backend
Faithfulness Does each claim in the answer NLI-based entailment
come from the retrieved
context?
Answer relevance Does the answer address the Generate hypothetical
question? questions from answer;
compare to real question
Context precision Of retrieved chunks, what LLM-judge
fraction were relevant?
Context recall Did retrieval return everything LLM-judge against gold
needed? answer
G-Eval. Define a custom criterion: “Did the answer cite the correct source?” The frame-
work auto-expands into chain-of-thought evaluation steps, then scores 0-1. Good for domain-
specific quality dimensions RAGAS does not cover.
Calibration. Never trust the raw judge score until you have a correlation against human
labels. Run 100 hand-labeled examples. Plot judge vs human. Compute Spearman rho. If rho
< 0.7, your judge rubric needs work.
Interactive figure: n5-judge-gauge. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/05-nlp-
foundations-to-advanced/27-llm-evaluation-frameworks
AIENGINEERINGFROMSCRATCH.COM 159

LLM EVALUATION — RAGAS, DEEPEVAL, G-EVAL
Build It
Step 1: faithfulness with NLI (RAGAS-style)
from typing import Callable
from transformers import pipeline
nli = pipeline("text-classification",
model="MoritzLaurer/DeBERTa-v3-large-mnli-fever-anli-ling-wanli",
top_k=None)
# `llm` is any callable: prompt str -> generated str.
# Example: llm = lambda p: client.messages.create(model="claude-haiku-4-5", ...).content[0].text
LLM = Callable[[str], str]
def atomic_claims(answer: str, llm: LLM) -> list[str]:
prompt = f"""Break this answer into simple factual claims (one per line):
{answer}
"""
return llm(prompt).splitlines()
def faithfulness(answer: str, context: str, llm: LLM) -> float:
claims = atomic_claims(answer, llm)
if not claims:
return 0.0
supported = 0
for claim in claims:
result = nli({"text": context, "text_pair": claim})[0]
entail = next((s for s in result if s["label"] == "entailment"), None)
if entail and entail["score"] > 0.5:
supported += 1
return supported / len(claims)
Decompose the answer into atomic claims. NLI-check each claim against the retrieved con-
text. Faithfulness = fraction supported.
Step 2: answer relevance
import numpy as np
from sentence_transformers import SentenceTransformer
# encoder: any model implementing .encode(texts, normalize_embeddings=True) -> ndarray
# e.g., encoder = SentenceTransformer("BAAI/bge-small-en-v1.5")
def answer_relevance(question: str, answer: str, encoder, llm: LLM, n: int = 3) -> float:
prompt = f"Write {n} questions this answer could be the answer to:\n{answer}"
generated = [line for line in llm(prompt).splitlines() if line.strip()][:n]
if not generated:
return 0.0
q_emb = np.asarray(encoder.encode([question], normalize_embeddings=True)[0])
g_embs = np.asarray(encoder.encode(generated, normalize_embeddings=True))
sims = [float(q_emb @ g_emb) for g_emb in g_embs]
AIENGINEERINGFROMSCRATCH.COM 160

LLM EVALUATION — RAGAS, DEEPEVAL, G-EVAL
return sum(sims) / len(sims)
If the answer implies different questions than the one asked, relevance drops.
Step 3: G-Eval custom metric
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams, LLMTestCase
metric = GEval(
name="Correctness",
criteria="The answer should be factually accurate and match the expected output.",
evaluation_steps=[
"Read the expected output.",
"Read the actual output.",
"List factual claims in the actual output.",
"For each claim, mark supported or unsupported by the expected output.",
"Return score = fraction supported.",
],
evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
)
test = LLMTestCase(input="When was the first iPhone released?",
actual_output="June 29th, 2007.",
expected_output="June 29, 2007.")
metric.measure(test)
print(metric.score, metric.reason)
The evaluation steps are the rubric. Explicit steps are more stable than implicit “score 0-1”
prompts.
Step 4: CI gate
import deepeval
from deepeval.metrics import FaithfulnessMetric, ContextualRelevancyMetric
def test_rag_system():
cases = load_regression_cases()
faith = FaithfulnessMetric(threshold=0.85)
rel = ContextualRelevancyMetric(threshold=0.7)
for case in cases:
faith.measure(case)
assert faith.score >= 0.85, f"faithfulness regression on {case.id}"
rel.measure(case)
assert rel.score >= 0.7, f"relevancy regression on {case.id}"
Ship as a pytest file. Run on every PR. Block merges on regressions.
Step 5: toy eval from scratch
See code/main.py. Stdlib-only approximations of faithfulness (overlap of answer claims with
context) and relevance (overlap of answer tokens with question tokens). Not production.
Shows the shape.
AIENGINEERINGFROMSCRATCH.COM 161

LLM EVALUATION — RAGAS, DEEPEVAL, G-EVAL
Pitfalls
• No calibration. A judge with 0.3 correlation to human labels is noise. Require a cali-
bration run before shipping.
• Self-evaluation. Using the same LLM to generate and judge inflates scores by 10-20%.
Use a different model family for the judge.
• Positional bias in pairwise judging. Judges prefer the first option presented. Always
randomize order and run both.
• Raw aggregate hides failures. Mean score 0.85 often hides 5% catastrophic failures.
Always inspect the bottom quantile.
• Golden dataset rot. Unversioned eval sets that drift over time break longitudinal com-
parison. Tag the dataset with every change.
• LLM cost. At scale, judge calls dominate cost. Use the cheapest model that meets
calibration threshold. GPT-4o-mini, Claude Haiku, Mistral-small.
Use It
The 2026 stack:
Use case Framework
RAG quality monitoring RAGAS (4 metrics)
CI/CD regression gates DeepEval + pytest
Custom domain criteria G-Eval within DeepEval
Online live-traffic monitoring RAGAS with reference-free mode
Human-in-the-loop spot checks LangSmith or Phoenix with annotation UI
Red-teaming / safety eval Promptfoo + DeepEval
Typical stack: RAGAS for monitoring, DeepEval for CI, G-Eval for novel dimensions. Run all
three; they disagree usefully.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/05-nlp-foundations-to-advanced/27-llm-
evaluation-frameworks
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/05-nlp-foundations-to-advanced/27-llm-
evaluation-frameworks/code
1. Easy. Use RAGAS on 10 RAG examples with known hallucinations. Verify the faithfulness
metric catches each one.
2. Medium. Hand-label 50 QA answers 0-1 for correctness. Score with G-Eval. Measure
Spearman rho between judge and human.
3. Hard. Build a pytest CI gate with DeepEval. Intentionally regress the retriever. Verify
the gate fails. Add bottom-quantile alerting via threshold check on the lowest 10%.
Key Terms
AIENGINEERINGFROMSCRATCH.COM 162

LLM EVALUATION — RAGAS, DEEPEVAL, G-EVAL
Term What people say What it actually means
LLM-as- Scoring with an LLM Prompt a judge model to score outputs 0-1
judge given a rubric.
RAGAS The RAG metric library Open-source eval framework with 4
reference-free RAG metrics.
Faithfulness Is the answer grounded? Fraction of answer claims entailed by
retrieved context.
Context Were retrieved chunks relevant? Fraction of top-K chunks that actually
precision mattered.
Context Did retrieval find everything? Fraction of gold-answer claims supported
recall by retrieved chunks.
G-Eval Custom LLM judge Rubric + chain-of-thought eval steps + 0-1
score.
Calibration Trust but verify Spearman correlation between judge score
and human score.
Further Reading
• Es et al. (2023). RAGAS: Automated Evaluation of Retrieval Augmented Generation —
the RAGAS paper.
• Liu et al. (2023). G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment —
the G-Eval paper.
• DeepEval docs — open production stack.
• Zheng et al. (2023). Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena — biases,
calibration, limits.
• MLflow GenAI Scorer — unifying framework that integrates RAGAS, DeepEval, Phoenix.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.c
om/lesson.html?path=phases/05-nlp-foundations-to-advanced/27-llm-evaluation-
frameworks
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratch/
tree/main/phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 163