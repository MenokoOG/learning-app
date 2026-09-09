---
title: "Capstone 08 — Production RAG Chatbot for a Regulated Vertical"
volume: "vol6-production"
part: "Part III — Capstone Projects"
chapter_number: 68
source_pages: "295-303"
---

# Capstone 08 — Production RAG Chatbot for a Regulated Vertical

Capstone 08 — Production RAG Chatbot
for a Regulated Vertical
Harvey, Glean, Mendable, and LlamaCloud all run the same production shape in
2026. Ingest with docling or Unstructured and ColPali for visuals. Hybrid search.
Re-rank with bge-reranker-v2-gemma. Synthesize with Claude Sonnet 4.7 using
prompt caching at 60-80% hit rate. Guard with Llama Guard 4 and NeMo Guardrails.
Watch with Langfuse and Phoenix. Grade with RAGAS on a 200-question golden
set. Build one in a regulated domain (legal, clinical, insurance), and the capstone
is passing the golden set, the red team, and the drift dashboard.
Type: Capstone Languages: Python (pipeline + API), TypeScript (chat UI) Prerequisites:
Phase 5 (NLP), Phase 7 (transformers), Phase 11 (LLM engineering), Phase 12 (multimodal),
Phase 17 (infrastructure), Phase 18 (safety) Phases exercised: P5 · P7 · P11 · P12 · P17 ·
P18 Time: 30 hours
Problem
Regulated-domain RAG (legal contracts, clinical trial protocols, insurance policies) is the
most-shipped production shape of 2026 because the ROI is obvious and the stakes are con-
crete. Harvey (Allen & Overy) built it for legal. Mendable ships the developer-docs flavor.
Glean covers enterprise search. The pattern is: ingest high-fidelity, retrieve hybrid with
rerank, synthesize with citation enforcement and prompt caching, guard with multiple safety
layers, and monitor drift continuously.
The hard parts are not the model. They are jurisdiction-aware compliance (HIPAA, GDPR,
SOC2), citation-level auditability, cost control (prompt caching buys 60-90% discount when
hit rate is high), hallucination detection via RAGAS faithfulness, and drift detection when the
source documents get updated without the index catching up. This capstone asks you to ship
all of it on a 200-question golden set with a red-team suite alongside.
Concept
The pipeline has two sides. Ingestion: docling or Unstructured parses structured documents;
ColPali handles visually rich ones; chunks get summaries, tags, and role-based access labels.
Vectors go into pgvector + pgvectorscale (under 50M vectors) or Qdrant Cloud; sparse BM25
runs alongside. Conversation: LangGraph handles memory and multi-turn; each query runs
hybrid retrieval, reranks with bge-reranker-v2-gemma-2b, synthesizes with Claude Sonnet
4.7 (prompt-cached), passes output through Llama Guard 4 and NeMo Guardrails, and emits
a citation-anchored response.
The eval stack has four layers. Golden set (200 labeled Q/A with citations) for correctness.
Red team (jailbreaks, PII extraction attempts, off-domain questions) for safety. RAGAS for
faithfulness / answer relevance / context precision automatically per-turn. Drift dashboard
(Arize Phoenix) watching retrieval quality and hallucination score weekly.
AIENGINEERINGFROMSCRATCH.COM 288

CAPSTONE 08 — PRODUCTION RAG CHATBOT FOR A REGULATED VERTICAL
Prompt caching is the cost lever. Claude 4.5+ and GPT-5+ support caching system prompts
+ retrieved context. At 60-80% hit rate, per-query cost drops 3-5x. The pipeline must be
designed for stable prefixes (system prompt + reranked context first) to achieve high cache
hit rates.
Architecture
documents (contracts, protocols, policies)
|
v
docling / Unstructured parse + ColPali for visuals
|
v
chunks + summaries + role-labels + jurisdiction tags
|
v
pgvector + pgvectorscale + BM25 (Tantivy)
|
query + role + jurisdiction
|
v
LangGraph conversational agent
+--- retrieve (hybrid)
+--- filter by role + jurisdiction
+--- rerank (bge-reranker-v2-gemma-2b or Voyage rerank-2)
+--- synthesize (Claude Sonnet 4.7, prompt cached)
+--- guard (Llama Guard 4 + NeMo Guardrails + Presidio output PII scrub)
+--- cite + return
|
v
eval:
RAGAS faithfulness / answer_relevance / context_precision (online)
Langfuse annotation queue (sampled)
Arize Phoenix drift (weekly)
red team suite (pre-release)
Stack
• Ingestion: Unstructured.io or docling for structured documents; ColPali for visually-rich
PDFs
• Vector DB: pgvector + pgvectorscale under 50M vectors; Qdrant Cloud otherwise
• Sparse: Tantivy BM25 with field weights
• Orchestration: LlamaIndex Workflows (ingestion) + LangGraph (conversation)
• Re-ranker: bge-reranker-v2-gemma-2b self-hosted or Voyage rerank-2 hosted
• LLM: Claude Sonnet 4.7 with prompt caching; fallback Llama 3.3 70B self-hosted
• Eval: RAGAS 0.2 online, DeepEval for hallucination and jailbreak suites
• Observability: Langfuse self-hosted with annotation queue; Arize Phoenix for drift
• Guardrails: Llama Guard 4 input/output classifier, NeMo Guardrails v0.12 policy, Pre-
sidio PII scrub
• Compliance: role-based access labels on chunks; jurisdiction tags for GDPR/HIPAA
Interactive figure: canary-rollout. This one moves. Watch it animate and drag its controls
AIENGINEERINGFROMSCRATCH.COM 289

CAPSTONE 08 — PRODUCTION RAG CHATBOT FOR A REGULATED VERTICAL
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/19-
capstone-projects/08-production-rag-chatbot
Build It
1. Ingestion. Parse your corpus (1000-10000 documents for a serious build) with Unstruc-
tured or docling. For scanned / visual-heavy pages, route through ColPali. Produce
chunks with summaries, role-labels, jurisdiction tags.
2. Index. Dense embeddings (Voyage-3 or Nomic-embed-v2) into pgvector + pgvectorscale.
BM25 side-index via Tantivy. Role and jurisdiction filters as payload.
3. Hybrid retrieve. Filter by role+jurisdiction first; then parallel dense + BM25; merge
with reciprocal rank fusion; top-20 to reranker; top-5 to synth.
4. Synthesize with prompt caching. System prompt + static policies in cache header;
reranked context as cache extension; user question as uncached suffix. Target 60-80%
cache hit rate in steady state.
5. Guardrails. Llama Guard 4 on input; NeMo Guardrails rails block off-domain questions
or policy-forbidden topics; Presidio scrubs accidental PII in the output; citation enforce-
ment post-filter.
6. Golden set. 200 Q/A pairs labeled by a domain expert with (answer, citations). Score
agent on exact-citation match, answer correctness, faithfulness (RAGAS).
7. Red team. 50 adversarial prompts: jailbreaks (PAIR, TAP), PII exfiltration attempts,
off-domain, cross-jurisdiction leaks. Score with pass/fail and severity.
8. Drift dashboard. Arize Phoenix tracks retrieval quality (nDCG, citation faithfulness)
weekly. Alert on 5% drop.
9. Cost report. Langfuse: prompt-caching hit rate, tokens per query, $/query breakdown
by stage.
Use It
$ chat --role=analyst --jurisdiction=GDPR
> what is the data-retention obligation for EU user profiles under our contract?
[retrieve] hybrid top-20 filtered to GDPR + analyst-role
[rerank] top-5 kept
[synth] claude-sonnet-4.7, cache hit 74%, 0.8s
answer:
The contract (Section 12.4, Master Services Agreement dated 2024-03-11)
obligates EU user profile deletion within 30 days of termination per GDPR
Article 17. The DPA amendment (DPA-v2.1, Section 5) extends this to 14 days
for "restricted" category data.
citations: [MSA-2024-03-11 s12.4, DPA-v2.1 s5]
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/19-capstone-projects/08-production-rag-
chatbot
AIENGINEERINGFROMSCRATCH.COM 290

CAPSTONE 08 — PRODUCTION RAG CHATBOT FOR A REGULATED VERTICAL
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engine
ering-from-scratch/tree/main/phases/19-capstone-projects/08-production-rag-chatbot/code
1. Build a second corpus slice under a different jurisdiction (e.g., HIPAA alongside GDPR).
Demonstrate role+jurisdiction filtering preventing cross-leak on a 20-question cross-
jurisdiction probe.
2. Measure prompt-cache hit rate over a week of production traffic. Identify which queries
break the cache prefix. Restructure.
3. Add multi-turn memory with a 10k-token summary buffer. Measure whether faithfulness
drops as the conversation grows.
4. Swap Claude Sonnet 4.7 for Llama 3.3 70B self-hosted. Measure $/query and faithfulness
delta.
5. Add an “unsure” mode: if top reranked scores are below a threshold, the agent says “I do
not have confident citations” instead of answering. Measure false-confidence reduction.
Key Terms
Term What people say What it actually means
Prompt “Cached system + context” Claude/OpenAI feature: cached prefix
caching tokens discounted 60-90% on hit
RAGAS “RAG evaluator” Automated scoring of faithfulness, answer
relevance, context precision
Golden set “Labeled eval” 200+ expert-labeled Q/A with citations; the
ground truth
Jurisdiction “Compliance label” GDPR/HIPAA/SOC2 scope attached to
tag chunks; enforced by retrieval filter
Citation “Grounded answer rate” Fraction of claims backed by retrievable
faithful- source spans
ness
Drift “Retrieval quality decay” Weekly change in nDCG or citation score;
alert threshold 5%
Red team “Adversarial eval” Pre-release jailbreak, PII extraction,
off-domain probes
Further Reading
• Harvey AI — reference legal production stack
• Glean enterprise search — reference RAG at enterprise scale
• Mendable documentation — developer-docs RAG reference
• LlamaCloud Parse + Index — managed ingestion
• Anthropic prompt caching — the cost-lever reference
• RAGAS 0.2 documentation — the canonical RAG eval framework
• Arize Phoenix — reference drift observability
• Llama Guard 4 — 2026 safety classifier
• NeMo Guardrails v0.12 — policy rail framework
Continue online. The living edition of this chapter has more than the page can hold:
AIENGINEERINGFROMSCRATCH.COM 291

CAPSTONE 08 — PRODUCTION RAG CHATBOT FOR A REGULATED VERTICAL
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/19-capstone-projects/08-production-rag-chatbot
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/19-capstone-projects/08-production-rag-chatbot/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/19-capstone-projects/08-production-rag-chatbot
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 292

Capstone 09 — Code Migration Agent
(Repo-Level Language / Runtime Up-
grade)
Amazon’s MigrationBench (Java 8 to 17) and Google’s App Engine Py2-to-Py3 mi-
grator set the 2026 bar. Moderne’s OpenRewrite does deterministic AST rewrites
at scale. Grit targets the same problem with codemod-style DSL. The production
pattern combines both: a deterministic substrate for safe rewrites plus an agent
layer for the ambiguous cases, a sandbox for per-branch builds, and a test harness
that flips green before the PR opens. The capstone is to migrate 50 real repos and
publish a pass rate with a failure taxonomy.
Type: Capstone Languages: Python (agent), Java / Python (targets), TypeScript (dashboard)
Prerequisites: Phase 5 (NLP), Phase 7 (transformers), Phase 11 (LLM engineering), Phase
13 (tools), Phase 14 (agents), Phase 15 (autonomous), Phase 17 (infrastructure) Phases ex-
ercised: P5 · P7 · P11 · P13 · P14 · P15 · P17 Time: 30 hours
Problem
Large-scale code migration is one of the cleanest production applications of 2026 coding
agents. The ground truth is obvious (does the test suite pass after the migration?), the re-
wards are real (a Java-8 fleet migration is a headcount-scale project), and the benchmarks are
public (MigrationBench 50-repo subset). Moderne’s OpenRewrite handles the deterministic
side. The agent layer handles everything OpenRewrite recipes cannot: ambiguous rewrites,
build-system drift, long-tail syntax, transitive dependency breakage.
You will build an agent that takes a Java 8 repo (or Python 2 repo) and produces a green-
CI migrated branch. You will measure pass rate, test-coverage preservation, cost per repo,
and build a failure taxonomy. The side-by-side against a deterministic-only baseline tells you
where the agent’s value actually lives.
Concept
The pipeline has two layers. The deterministic substrate (OpenRewrite for Java, libcst for
Python) runs the bulk of mechanical rewrites safely: imports, method signatures, null-safety
edits, try-with-resources, deprecated API replacements. It is fast and produces auditable
diffs. The agent layer (OpenAI Agents SDK or LangGraph over Claude Opus 4.7 and GPT-
5.4-Codex) handles cases the recipes cannot: build-file upgrades (Maven/Gradle/pyproject),
transitive dependency conflicts, test flakes, custom annotations.
Each repo gets a Daytona sandbox with the target runtime preinstalled. The agent iterates:
run build, classify failures, apply fix, rerun. Hard limits: 30 minutes per repo, $8 per repo,
20 agent turns. If all tests pass and the coverage delta is not negative, the branch opens a
PR. If not, the repo gets filed under a failure class with evidence.
AIENGINEERINGFROMSCRATCH.COM 293

CAPSTONE 09 — CODE MIGRATION AGENT (REPO-LEVEL LANGUAGE / RUNTIME UPGRADE)
The failure taxonomy is the deliverable. Across 50 repos, what broke? Transitive deps? Cus-
tom annotations? Build tool version? Test flakes unrelated to migration? Each class gets a
count and an exemplar diff. Future recipe authors can target the top three.
Architecture
target repo
|
v
OpenRewrite / libcst deterministic recipes
(safe, fast, auditable, ~70-80% of fixes)
|
v
Daytona sandbox per branch
|
v
agent loop (Claude Opus 4.7 / GPT-5.4-Codex):
- run build -> capture failures
- classify failures (build, test, lint)
- apply fix (patch or retry recipe)
- rerun
- budget: 30 min, $8, 20 turns
|
v
test + coverage delta gate
|
v (passed)
open PR
|
v (failed)
file under failure class + attach repro
Stack
• Deterministic substrate: OpenRewrite (Java) or libcst (Python)
• Agent: OpenAI Agents SDK or LangGraph over Claude Opus 4.7 + GPT-5.4-Codex
• Sandbox: Daytona devcontainers per branch, pre-installed target runtime (Java 17 /
Python 3.12)
• Build systems: Maven, Gradle, uv (Python)
• Benchmarks: Amazon MigrationBench 50-repo subset (Java 8 to 17), Google App Engine
Py2-to-Py3 repos
• Test harness: parallel runner, coverage via Jacoco (Java) or coverage.py (Python)
• Observability: Langfuse + trace bundle per repo with every diff chunk
• Dashboard: failure-taxonomy dashboard with per-class counts and exemplar diffs
Interactive figure: ce-migration-funnel. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/19-capstone-projects/09-code-migration-agent
AIENGINEERINGFROMSCRATCH.COM 294

CAPSTONE 09 — CODE MIGRATION AGENT (REPO-LEVEL LANGUAGE / RUNTIME UPGRADE)
Build It
1. Recipe pass. Run OpenRewrite (Java) or libcst (Python) recipes first. Catch the 70-80%
of migrations that are mechanical. Commit as “recipe” commit.
2. Build trial. Daytona sandbox: install target runtime, run the build. If green, skip to
tests. If red, hand off to agent.
3. Agent loop. LangGraph with tools: run_build, read_file, edit_file, run_test,
git_diff. Agent classifies the failure (dep, syntax, test, build-tool) and applies a
targeted fix. Rerun.
4. Budget caps. 30 minutes wall-clock per repo, $8 cost, 20 agent turns. Any breach halts
and files under “budget_exhausted” with the current diff.
5. Test + coverage gate. After the build goes green, run the test suite. Compare coverage
to the base repo. If coverage dropped more than 2%, file under “coverage_regression”.
6. PR open. On success, push the branch, open the PR with the diff and a summary of
which recipes applied and which commits the agent authored.
7. Failure taxonomy. For each failed repo, tag with a class: dep_upgrade_required,
build_tool_drift, custom_annotation, test_flake, syntax_edge_case, budget_exhausted.
Build a dashboard.
8. 50-repo run. Execute across the MigrationBench subset. Report per-class pass rate,
cost-per-repo, coverage-preservation, and a compare-vs-deterministic-only baseline.
Use It
$ migrate legacy-java-service --target java17
[recipe] 27 rewrites applied (JUnit 4->5, HashMap initializer, try-with-resources)
[build] FAIL: cannot find symbol sun.misc.BASE64Encoder
[agent] turn 1 classify: removed_jdk_api
[agent] turn 2 apply: sun.misc.BASE64Encoder -> java.util.Base64
[build] OK
[tests] 412/412 passing; coverage 84.1% -> 84.3%
[pr] opened #1841 cost=$3.20 turns=4
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/19-capstone-projects/09-code-migration-agent
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/19-capstone-projects/09-code-migration-agent/code
1. Run the migrate pipeline with OpenRewrite only (no agent). Compare pass rate to the
full pipeline. Identify the cases where the agent alone is the difference.
2. Implement a “lint-clean” check: after migration, run a style linter (spotless for Java, ruff
for Python). Fail the PR if new lint errors appear. Measure the coverage-preserved-but-
style-regressed rate.
3. Add a “minimal-diff” optimizer: after the agent’s branch passes tests, trim unnecessary
changes with a second pass. Report diff-size reduction.
AIENGINEERINGFROMSCRATCH.COM 295

CAPSTONE 09 — CODE MIGRATION AGENT (REPO-LEVEL LANGUAGE / RUNTIME UPGRADE)
4. Extend to a third migration: Node 18 to Node 22. Reuse the sandbox wrapping; swap
the recipe layer for a custom codemod.
5. Measure time-to-first-green-build (TTFGB) as a UX metric. Target: p50 under 10 min-
utes.
Key Terms
Term What people say What it actually means
Deterministic“Recipe engine” OpenRewrite / libcst: declarative AST
substrate rewrites with safety guarantees
Codemod “Code-modifying program” A rewrite rule that changes source code
mechanically
Build drift “Tool version skew” Subtle Maven / Gradle / uv behavior changes
between major versions
Failure “Taxonomy bucket” A labeled reason a repo did not migrate:
class dep, syntax, test, build-tool, budget
Coverage “Coverage preservation” Change in test coverage % from base to
delta migrated branch
Agent turn “Tool-call round” One plan -> act -> observe cycle in the
agent loop
Budget “Hit the ceiling” The repo consumed its 30-min / $8 / 20-turn
exhaustion limit without passing
Further Reading
• Amazon MigrationBench — the canonical 2026 benchmark
• Moderne.io OpenRewrite platform — the deterministic substrate reference
• OpenRewrite documentation — recipe authoring
• Grit.io — alternate codemod DSL
• OpenAI sandboxed migration cookbook — the Agents SDK reference
• Google App Engine Py2 to Py3 migrator — alternate migration benchmark
• libcst — Python deterministic substrate
• Daytona sandboxes — reference per-branch sandbox
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/19-capstone-projects/09-code-migration-agent
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/19-capstone-projects/09-code-migration-agent/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/19-capstone-projects/09-code-migration-agent
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 296