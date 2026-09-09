---
title: "A/B Testing LLM Features — GrowthBook, Statsig, and the Vibes Problem"
volume: "vol6-production"
part: "Part I — Infrastructure & Production"
chapter_number: 23
source_pages: "102-105"
---

# A/B Testing LLM Features — GrowthBook, Statsig, and the Vibes Problem

A/B Testing LLM Features — Growth-
Book, Statsig, and the Vibes Problem
Traditional A/B testing was not built for non-deterministic LLMs. The critical
distinction: evals answer “can the model do the job?” A/B tests answer “do
users care?” Both are required; shipping on vibe checks is over. What to test
in 2026: prompt engineering (wording), model selection (GPT-4 vs GPT-3.5 vs
OSS; accuracy vs cost vs latency), generation parameters (temperature, top-p).
Real cases: a chatbot reward-model variant delivered +70% conversation length
and +30% retention; Nextdoor AI subject-line experiments delivered +1% CTR
after reward-function refinement; Khan Academy Khanmigo iterated on a latency-
vs-math-accuracy axis. Platform split: Statsig (acquired by OpenAI for $1.1B
in September 2025) — sequential testing, CUPED, all-in-one. GrowthBook —
open-source, warehouse-native, Bayesian + Frequentist + Sequential engines,
CUPED, SRM checks, Benjamini-Hochberg + Bonferroni corrections. You pick
based on warehouse-SQL preference and whether “acquired by OpenAI” matters
to your organization.
Type: Learn Languages: Python (stdlib, toy sequential test simulator) Prerequisites: Phase
17 · 13 (Observability), Phase 17 · 20 (Progressive Deployment) Time: ~60 minutes
Learning Objectives
• Distinguish evals (“can the model do the job”) from A/B tests (“do users care”).
• Enumerate three testable axes (prompt, model, parameters) and pick the metric for each.
• Explain CUPED, sequential testing, and Benjamini-Hochberg multiple-comparison cor-
rections.
• Pick Statsig or GrowthBook based on warehouse-SQL posture and corporate acquisition
stance.
The Problem
You hand-tuned a system prompt. It feels better. You ship it. Conversion changes by noise.
You blame the metric. Or you shipped a new model and conversion didn’t move — did the
model degrade or was the change too small to detect? You don’t know, because you shipped
without an A/B.
Evals answer whether the model can do a task on a labeled set. They do not answer whether
users prefer the output. Only a controlled online experiment answers that, and only if the
experiment has enough power, controls for non-determinism, and corrects for multiple com-
parisons.
AIENGINEERINGFROMSCRATCH.COM 95

A/B TESTING LLM FEATURES — GROWTHBOOK, STATSIG, AND THE VIBES PROBLEM
The Concept
Evals vs A/B tests
Evals — offline, labeled set, judge (rubric or LLM-as-judge or human). Answer: “Is the output
correct / helpful / safe on this fixed distribution?”
A/B test — online, live users, randomized. Answer: “Does the new variant move the user-level
metric that matters?”
Both required. Evals catch regressions before exposure; A/B confirms product impact after.
What to test
1. Prompt engineering — wording, system-prompt structure, examples. Metric: task
success, user retention, cost/request.
2. Model selection — GPT-4 vs GPT-3.5-Turbo vs Llama-OSS. Metric: accuracy (task) +
cost/request + latency P99. Multi-objective.
3. Generation parameters — temperature, top-p, max_tokens. Metric: task-specific (out-
put diversity vs determinism).
CUPED — variance reduction
Controlled-experiments Using Pre-Experiment Data. Regress out pre-period variance before
comparing post-period. Typical variance reduction: 30-70%. Effective sample size goes up
for free.
Implementation: both Statsig and GrowthBook implement.
Sequential testing
Classical A/B assumes fixed sample size. Sequential tests (“peek-and-decide”) control false-
positive rate under repeated looks. Always-valid sequential procedures (mSPRT, Howard’s
confidence sequences) let you stop early on clear winners.
Multiple-comparison corrections
Running 20 A/B tests at 95% confidence produces one false positive by chance. Bonferroni cor-
rection tightens α per-test; Benjamini-Hochberg controls false-discovery rate. GrowthBook
implements both.
SRM — sample ratio mismatch
Assignment hash randomizes users to variants. If 50/50 split delivers 47/53, something is
broken — SRM check flags it. Both platforms implement.
Statsig vs GrowthBook
Statsig: - Acquired by OpenAI for $1.1B (September 2025). Hosted, SaaS. - Sequential test-
ing, CUPED, held-out populations. - All-in-one: feature flags + experimentation + observabil-
ity. - Best fit: team already wants a bundled product, doesn’t care about OpenAI ownership.
GrowthBook: - Open-source (MIT); warehouse-native (reads from Snowflake/BigQuery/Redshift
directly). - Multiple engines: Bayesian, Frequentist, Sequential. - CUPED, SRM, Bonferroni,
AIENGINEERINGFROMSCRATCH.COM 96

A/B TESTING LLM FEATURES — GROWTHBOOK, STATSIG, AND THE VIBES PROBLEM
BH corrections. - Self-host or managed cloud. - Best fit: warehouse-SQL shop, data team
controls the metric layer, wants OSS.
Non-determinism complicates power
Same prompt produces varying outputs. Traditional power calculations assume IID obser-
vations. With LLM non-determinism, effective sample size is lower than nominal. Multiply
required sample size by ~1.3-1.5x as a safety margin.
Real case outcomes
• Chatbot reward model variant: +70% conversation length, +30% retention.
• Nextdoor subject lines: +1% CTR after reward-function refinement.
• Khan Academy Khanmigo: iterative latency-vs-math-accuracy trade.
The anti-pattern: shipping on vibes
Every senior engineer can name a feature that was shipped because “it feels better” with no
A/B. Most of them regressed product metrics the team didn’t notice for months. A/B is the
forcing function.
Numbers you should remember
• Statsig acquired by OpenAI: $1.1B, September 2025.
• GrowthBook: open-source MIT; Bayesian + Frequentist + Sequential.
• CUPED variance reduction: 30-70%.
• LLM non-determinism → +30-50% sample-size buffer.
Interactive figure: mx-sequential-test. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/17-infrastructure-and-production/21-ab-testing-llm-features
Use It
code/main.py simulates a sequential A/B test with fixed and sequential boundaries. Shows
how sequential lets you stop early.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/17-infrastructure-and-production/21-ab-testing-
llm-features
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/17-infrastructure-and-production/21-ab-testing-
llm-features/code
1. Run code/main.py. For an expected 5% lift with baseline 3% conversion, what sample
size to 80% power?
2. Pick Statsig or GrowthBook for a healthcare-regulated on-prem customer.
AIENGINEERINGFROMSCRATCH.COM 97

A/B TESTING LLM FEATURES — GROWTHBOOK, STATSIG, AND THE VIBES PROBLEM
3. Design an A/B that tests GPT-4 vs GPT-3.5 on cost-per-resolved-ticket. What’s the primary
metric, guardrail metric, secondary?
4. Your canary passes but A/B shows -1.2% conversion. Do you ship? Write the escalation
criteria.
5. Apply CUPED to a pre-period with 60% of the variance of post. Compute the effective-
sample-size boost.
Key Terms
Term What people say What it actually means
Eval “offline test” Labeled-set evaluation of model capability
A/B test “experiment” Live randomized comparison on users
CUPED “variance reduction” Pre-period regression to reduce variance
Sequential “peek-ok test” Always-valid procedure allowing early stop
test
Multiple “the family error” Running many tests inflates false positives
compari-
son
Bonferroni “tight correction” Divide α by number of tests
Benjamini- “BH FDR” False-discovery-rate control, less
Hochberg conservative
SRM “bad split” Sample ratio mismatch; assignment bug
Statsig “OpenAI owned” Commercial all-in-one, acquired 2025
GrowthBook “the OSS one” MIT warehouse-native platform
mSPRT “sequential probability ratio Classical sequential procedure
test”
Further Reading
• GrowthBook — How to A/B Test AI
• Statsig — Beyond Prompts: Data-Driven LLM Optimization
• Statsig vs GrowthBook comparison
• Deng et al. — CUPED
• Howard — Confidence Sequences
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/17-infrastructure-and-production/21-ab-testing-llm-features
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/17-infrastructure-and-production/21-ab-testing-llm-features/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/17-infrastructure-and-production/21-ab-testing-llm-features
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 98