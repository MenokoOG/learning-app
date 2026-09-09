---
title: "Benchmarks: SWE-bench, GAIA, AgentBench"
volume: "vol5-agents"
part: "Part III — Agent Engineering"
chapter_number: 68
source_pages: "328-331"
---

# Benchmarks: SWE-bench, GAIA, AgentBench

Benchmarks: SWE-bench, GAIA, Agent-
Bench
Three benchmarks anchor agent evaluation in 2026. SWE-bench tests code patch-
ing. GAIA tests generalist tool use. AgentBench tests multi-environment reasoning.
Know their composition, their contamination story, and what they do not measure.
Type: Learn Languages: Python (stdlib) Prerequisites: Phase 14 · 06 (Tool Use) Time:
~60 minutes
Learning Objectives
• Name SWE-bench’s test harness (FAIL_TO_PASS) and explain why it gates on unit tests.
• Explain why SWE-bench Verified (OpenAI, 500 tasks) exists and what it removes.
• Describe GAIA’s design: simple for humans, hard for AI; three difficulty levels.
• Name AgentBench’s eight environments and its primary blocker for open-source LLMs.
• Summarize the SWE-bench+ contamination finding and its implications.
The Problem
Leaderboards tell you which model wins on one benchmark. They do not tell you:
• Whether the benchmark is contaminated (solutions in training data, test leakage).
• Whether the benchmark measures what you care about (code vs browsing vs generalist).
• Whether the evaluator is robust (AST matching, state checks, human review).
Know the three anchoring benchmarks and their failure modes before you quote a number.
The Concept
SWE-bench (Jimenez et al., ICLR 2024 oral)
• 2,294 real GitHub issues from 12 popular Python repos.
• Agent gets: the codebase at the pre-fix commit + natural-language issue description.
• Agent produces: a patch.
• Evaluator: apply patch, run the repo’s test suite. The patch must flip FAIL_TO_PASS
tests (previously failing, now passing) without breaking PASS_TO_PASS tests.
SWE-agent (Yang et al., 2024) hit 12.5% at release by emphasizing agent-computer interfaces
(file editor commands, search syntax the model understands).
SWE-bench Verified
OpenAI, Aug 2024. Human-curated 500-task subset. Removes ambiguous issues, unreliable
tests, and tasks where the fix was unclear. Primary benchmark for “does your agent ship real
patches?”
AIENGINEERINGFROMSCRATCH.COM 322

BENCHMARKS: SWE-BENCH, GAIA, AGENTBENCH
Contamination
• Over 94% of SWE-bench issues predate most model cutoffs.
• SWE-bench+ found 32.67% of successful patches leaked solutions in the issue text
(model saw the fix in the description), and 31.08% were suspicious due to weak test
coverage.
• Verified is cleaner but not contamination-free.
Practical implication: a model that scores 50% on SWE-bench may score 35% on SWE-bench+.
Always report both if you claim SWE-bench performance.
GAIA (Mialon et al., Nov 2023)
• 466 questions; 300 retained for the private leaderboard at huggingface.co/gaia-
benchmark.
• Design philosophy: “conceptually simple for humans (92%) but hard for AI (GPT-4 with
plugins: 15%).”
• Tests reasoning, multi-modality, web, tool use.
• Three difficulty levels; Level 3 requires long tool chains across modalities.
GAIA is what you run to measure “generalist capability.” Do not confuse with code-specific
benchmarks.
AgentBench (Liu et al., ICLR 2024)
• 8 environments across code (Bash, DB, KG), games (Alfworld, LTP), web (WebShop,
Mind2Web), and open-ended generation.
• Multi-turn, ~4k-13k turns per split.
• Primary finding: long-term reasoning, decision-making, and instruction following are
the blockers for OSS LLMs catching up to commercial.
What these do not measure
• Real-world operational cost (tokens, wall-clock).
• Safety behavior in adversarial conditions.
• Performance on your domain (use your own evals, Lesson 30).
• Tail failures (benchmarks average; production operators care about the worst 1%).
Where benchmarking goes wrong
• Single-number fixation. SWE-bench 50% tells you less than the P50/P75/P95 cost +
step distribution.
• Contaminated claims. Reporting SWE-bench without mentioning Verified or SWE-
bench+ is misleading.
• Benchmark-as-development-target. Optimizing for the benchmark diverges from
production usefulness.
Interactive figure: ae-swebench-gate. This one moves. Watch it animate and drag its con-
trols in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/14-
agent-engineering/19-benchmarks-swebench-gaia
Build It
code/main.py implements a toy SWE-bench-like harness:
AIENGINEERINGFROMSCRATCH.COM 323

BENCHMARKS: SWE-BENCH, GAIA, AGENTBENCH
• Synthetic bug-fix tasks (3 tasks).
• A scripted “agent” that proposes patches.
• A test runner that checks FAIL_TO_PASS (bug now fixed) and PASS_TO_PASS (nothing
broken).
• A GAIA-style difficulty classifier based on question decomposition depth.
Run it:
python3 code/main.py
The output shows resolution rate per task + per difficulty and makes the evaluator rules
concrete.
Use It
• SWE-bench Verified for code agents. Always report Verified scores.
• GAIA for generalist agents. Use the private leaderboard split.
• AgentBench for multi-environment comparison.
• Custom evals (Lesson 30) for your product’s actual shape.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg0
0/ai-engineering-from-scratch/tree/main/phases/14-agent-engineering/19-benchmarks-
swebench-gaia
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/14-agent-engineering/19-benchmarks-swebench-
gaia/code
1. Port the toy harness to run on a real repo (pick one of yours). Write 3 FAIL_TO_PASS
tests for known bugs.
2. Add a step-count metric. On your 3 tasks, how many agent steps per resolution?
3. Read the SWE-bench+ paper. Implement a solution-leakage check (pattern-match the
issue text against the diff).
4. Download a GAIA question from the public split. Trace what a GPT-4-class agent would
do. What tools does it need?
5. Read AgentBench’s per-environment breakdown. Which environment mirrors your prod-
uct surface? What does “SOTA” look like there?
Key Terms
Term What people say What it actually means
SWE- “Code agent benchmark” 2,294 GitHub issues; patch must flip
bench FAIL_TO_PASS tests
SWE- “Clean SWE-bench” 500 human-curated tasks, OpenAI
bench
Verified
FAIL_TO_PASS“Fix gate” Tests previously failing that must pass after
the patch
PASS_TO_PAS“SNo-regression gate” Tests that were passing and must still pass
AIENGINEERINGFROMSCRATCH.COM 324

BENCHMARKS: SWE-BENCH, GAIA, AGENTBENCH
Term What people say What it actually means
GAIA “Generalist benchmark” 466 human-easy / AI-hard multi-tool
questions
AgentBench “Multi-env benchmark” 8 environments; long-horizon multi-turn
Contamination“Training-set leak” Benchmark tasks present in model training
SWE- “Contamination audit” 32.67% solution leakage found in successful
bench+ SWE-bench patches
Further Reading
• Jimenez et al., SWE-bench (arXiv:2310.06770) — the original benchmark
• OpenAI, SWE-bench Verified — the curated subset
• Mialon et al., GAIA (arXiv:2311.12983) — generalist benchmark
• Liu et al., AgentBench (arXiv:2308.03688) — multi-environment suite
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/14-agent-engineering/19-benchmarks-swebench-gaia
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/14-agent-engineering/19-benchmarks-swebench-gaia/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/14-agent-engineering/19-benchmarks-swebench-gaia
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 325