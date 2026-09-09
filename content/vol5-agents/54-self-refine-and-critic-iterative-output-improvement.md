---
title: "Self-Refine and CRITIC: Iterative Output Improvement"
volume: "vol5-agents"
part: "Part III — Agent Engineering"
chapter_number: 54
source_pages: "267-270"
---

# Self-Refine and CRITIC: Iterative Output Improvement

Self-Refine and CRITIC: Iterative Output
Improvement
Self-Refine (Madaan et al., 2023) uses one LLM in three roles — generate, feedback,
refine — in a loop. Average gain: +20 absolute on 7 tasks. CRITIC (Gou et al.,
2023) hardens the feedback step by routing verification through external tools. In
2026 this pattern ships in every framework as “evaluator-optimizer” (Anthropic) or
a guardrail loop (OpenAI Agents SDK).
Type: Build Languages: Python (stdlib) Prerequisites: Phase 14 · 01 (Agent Loop), Phase
14 · 03 (Reflexion) Time: ~60 minutes
Learning Objectives
• State Self-Refine’s three prompts (generate, feedback, refine) and explain why history
matters for the refine prompt.
• Explain CRITIC’s critical insight: LLMs are unreliable at self-verification without exter-
nal grounding.
• Implement a stdlib Self-Refine loop with history and an optional external verifier.
• Map this pattern to Anthropic’s “evaluator-optimizer” workflow and OpenAI Agents
SDK’s output guardrails.
The Problem
An agent produces an answer that is almost right. Maybe a line of code has a syntax error.
Maybe a summary is too long. Maybe a plan misses an edge case. What you want is: the
agent critiques its own output, then fixes it.
Self-Refine shows this works with a single model, no training data, no RL. But there is a catch:
LLMs are bad at self-verification on hard facts. CRITIC names the fix — route the verify step
through external tools (search, code interpreter, calculator, test runner).
Together these two papers define the 2026 default for iterative improvement: generate, verify
(externally when possible), refine, stop when the verifier passes.
The Concept
Self-Refine (Madaan et al., NeurIPS 2023)
One LLM, three roles:
generate(task) -> output_0
feedback(task, output_0) -> critique_0
refine(task, output_0, critique_0, history) -> output_1
feedback(task, output_1) -> critique_1
refine(task, output_1, critique_1, history) -> output_2
AIENGINEERINGFROMSCRATCH.COM 261

SELF-REFINE AND CRITIC: ITERATIVE OUTPUT IMPROVEMENT
...
stop when feedback says "no issues" or budget exhausted.
Key detail: refine sees the full history — all prior outputs and critiques — so it does not
repeat mistakes. The paper ablates this: drop history and quality drops sharply.
Headline: +20 absolute improvement averaged across 7 tasks (math, code, acronym, dialog)
including GPT-4. No training, no external tools, single model.
CRITIC (Gou et al., arXiv:2305.11738, v4 Feb 2024)
Self-Refine’s weakness: the feedback step is an LLM scoring itself. For factual claims this
is unreliable (a hallucination often looks convincing to the model that produced it). CRITIC
replaces feedback(task, output) with verify(task, output, tools) where tools includes:
• A search engine for factual claims.
• A code interpreter for code correctness.
• A calculator for arithmetic.
• Domain-specific verifiers (unit tests, type checkers, linters).
The verifier produces a structured critique grounded in tool results. The refiner then condi-
tions on this critique.
Headline: CRITIC outperforms Self-Refine on factual tasks because the critique is grounded.
On tasks without external verifiers (creative writing, formatting), CRITIC reduces to Self-
Refine.
The stop condition
Two common shapes:
1. Verifier passes. External test returns success. Preferred when available (unit tests,
type checker, guardrail assertion).
2. No feedback issued. Model says “the output is fine.” Cheaper but unreliable; pair with
a max-iteration cap.
2026 default: combine them. “Stop if verifier passes OR model says fine AND iterations >=
2 OR iterations >= max_iterations.”
Evaluator-Optimizer (Anthropic, 2024)
Anthropic’s Dec 2024 post names this as one of the five workflow patterns. Two roles:
• Evaluator: scores the output and produces a critique.
• Optimizer: revises the output given the critique.
Loop until the evaluator passes. This is Self-Refine/CRITIC in Anthropic’s framing. The crit-
ical engineering detail Anthropic adds: the evaluator and optimizer prompts should be sub-
stantially different so the model does not just rubber-stamp.
OpenAI Agents SDK output guardrails
OpenAI Agents SDK ships this pattern as “output guardrails.” A guardrail is a validator that
runs on the final output of an agent. If the guardrail trips (raises OutputGuardrailTrip-
wireTriggered), the output is rejected and the agent can retry. Guardrails can call tools
(CRITIC-style) or be pure functions (Self-Refine-style).
AIENGINEERINGFROMSCRATCH.COM 262

SELF-REFINE AND CRITIC: ITERATIVE OUTPUT IMPROVEMENT
2026 pitfalls
• Rubber-stamp loops. Same model doing generation and critique with the same prompt
style converges on “looks good to me.” Use structurally different prompts, or a smaller
cheap model for critique.
• Over-refinement. Each refine pass adds latency and tokens. Budget 1-3 passes; after
that, escalate to human review.
• CRITIC on trivial tasks. If there is no external verifier, CRITIC degenerates to Self-
Refine; do not pay the latency for a stub verifier.
Interactive figure: self-refine. This one moves. Watch it animate and drag its controls in
the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/14-agent-
engineering/05-self-refine-and-critic
Build It
code/main.py implements Self-Refine and CRITIC on a toy task: produce a short bullet list
given a topic. The verifier checks format (3 bullets, each under 60 chars). CRITIC adds an
external “fact verifier” that penalizes known hallucinations.
Components:
• generate — scripted producer.
• feedback — LLM-style self-critique.
• verify_external — CRITIC-style grounded verifier.
• refine — rewrites output given history.
• Stop condition — verifier passes or max 4 iterations.
Run it:
python3 code/main.py
Compare the Self-Refine vs CRITIC runs. CRITIC catches a factual error Self-Refine missed
because the external verifier has grounding the self-critic does not.
Use It
Anthropic’s evaluator-optimizer is this pattern in Claude-friendly language. OpenAI Agents
SDK’s output guardrails are CRITIC-shaped (guardrails can call tools). LangGraph ships a
reflection node that reads like Self-Refine. Google’s Gemini 2.5 Computer Use adds a per-
step safety evaluator that is a CRITIC variant: every action is verified before commit.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/05-self-refine-and-critic
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/14-agent-engineering/05-self-refine-and-critic/code
1. Run the toy with max_iterations=1. Does CRITIC still help?
2. Replace the external verifier with a noisy one (random 30% false positives). What does
the loop do? This is the 2026 reality of most guardrail stacks.
AIENGINEERINGFROMSCRATCH.COM 263

SELF-REFINE AND CRITIC: ITERATIVE OUTPUT IMPROVEMENT
3. Implement a “generator-critic on different models” variant: big model generates, small
model critiques. Does it beat same-model?
4. Read CRITIC Section 3 (arXiv:2305.11738 v4). Name the three verification-tool cate-
gories and give an example for each.
5. Map OpenAI Agents SDK’s output_guardrails to CRITIC’s verifier role. What does the
SDK get wrong, and what does it get right?
Key Terms
Term What people say What it actually means
Self-Refine “LLM that fixes itself” Generate -> feedback -> refine loop in one
model, with history
CRITIC “Tool-grounded verification” Replace feedback with an external verifier
(search, code, calc, tests)
Evaluator- “Anthropic workflow pattern” Two roles — evaluator scores, optimizer
Optimizer revises — looped to convergence
Output “Post-hoc check” OpenAI Agents SDK validator that runs after
guardrail an agent produces output
Verify step “Critique phase” The load-bearing decision: grounded or
self-rated
Refine “What the model already Prior outputs + critiques prepended to refine
history tried” prompt; drop and quality collapses
Rubber- “Self-agreement failure” Same-prompt critique returns “looks good”;
stamp loop fix with structurally different prompts
Stop “Convergence test” Verifier passes OR no feedback AND iteration
condition cap; never single-condition
Further Reading
• Madaan et al., Self-Refine (arXiv:2303.17651) — the canonical paper
• Gou et al., CRITIC (arXiv:2305.11738) — tool-grounded verification
• Anthropic, Building Effective Agents — evaluator-optimizer workflow pattern
• OpenAI Agents SDK docs — output guardrails as CRITIC-shaped verifiers
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/14-agent-engineering/05-self-refine-and-critic
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/14-agent-engineering/05-self-refine-and-critic/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/14-agent-engineering/05-self-refine-and-critic
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 264