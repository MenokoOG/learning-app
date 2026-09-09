---
title: "Failure Modes: Why Agents Break"
volume: "vol5-agents"
part: "Part III — Agent Engineering"
chapter_number: 75
source_pages: "356-359"
---

# Failure Modes: Why Agents Break

Failure Modes: Why Agents Break
MASFT (Berkeley, 2025) catalogs 14 multi-agent failure modes in 3 categories. Mi-
crosoft’s Taxonomy documents how existing AI failures amplify in agentic settings.
Industry field data converges on five recurring modes: hallucinated actions, scope
creep, cascading errors, context loss, tool misuse.
Type: Learn + Build Languages: Python (stdlib) Prerequisites: Phase 14 · 05 (Self-Refine
and CRITIC), Phase 14 · 24 (Observability) Time: ~60 minutes
Learning Objectives
• Name MASFT’s three failure categories and at least four specific modes in each.
• Explain why agentic failure amplifies existing AI failure modes (bias, hallucination).
• Describe the five industry-recurring modes and their mitigations.
• Implement a stdlib detector that tags agent traces with failure-mode labels.
The Problem
Teams ship agents that work on 90% of traces. The 10% failures are not random noise — they
fall into a small number of recurring categories. Once you can name them, you can monitor
for them and fix them.
The Concept
MASFT (Berkeley, arXiv:2503.13657)
Multi-Agent System Failure Taxonomy. 14 failure modes clustered into 3 categories. Inter-
annotator Cohen’s Kappa 0.88 — the categories are reliably distinguishable.
Central claim: failures are fundamental design flaws in multi-agent systems, not LLM limita-
tions to be fixed with better base models.
Microsoft Taxonomy of Failure Mode in Agentic AI Systems
• Existing AI failures (bias, hallucination, data leakage) amplify in agentic settings.
• New failures emerge from autonomy: unintended action at scale, tool misuse, mission
drift.
• The whitepaper is the risk register for agentic products.
Characterizing Faults in Agentic AI (arXiv:2603.06847)
• Failures arise from orchestration, internal state evolution, and environment interaction.
• Not just “bad code” or “bad model output.”
AIENGINEERINGFROMSCRATCH.COM 350

FAILURE MODES: WHY AGENTS BREAK
LLM Agent Hallucinations Survey (arXiv:2509.18970)
Two primary manifestations:
1. Instruction-following Deviation — agent doesn’t follow the system prompt.
2. Long-range Contextual Misuse — agent forgets or misapplies context from earlier
turns.
Sub-intention errors: Omission (missed step), Redundancy (repeated step), Disorder (out-of-
order steps).
The five industry-recurring modes
Arize, Galileo, NimbleBrain 2024-2026 field analyses converge on:
1. Hallucinated actions. Agent invokes a tool that doesn’t exist or fabricates arguments.
2. Scope creep. Agent expands task beyond the user’s ask (creates extra PRs, sends extra
emails).
3. Cascading errors. One wrong call triggers downstream effects. A phantom SKU hallu-
cination triggers four API calls — a multi-system incident.
4. Context loss. Long-horizon tasks forget early-turn constraints.
5. Tool misuse. Calls the right tool with wrong arguments, or the wrong tool entirely.
Cascading is the killer. Agents cannot distinguish “I failed” from “the task is impossible” and
often hallucinate a success message on 400 errors to close the loop.
Mitigation: gates at every step
Automated verification gates at every step of a reasoning chain, checking factual grounding
against environment state. Concretely:
• Per-step safety classifier (Lesson 21).
• Tool-call argument validation (Lesson 06).
• Cross-check retrieved content against known facts (Lesson 05, CRITIC).
• Detect success hallucination by re-probing state (was the file actually created?).
Where failure monitoring goes wrong
• Tagging only crashes. Most agent failures produce valid-looking output. Need content-
level checks.
• No baseline. Drift detection needs a last-known-good; without it you cannot say “this
is getting worse.”
• Over-alerting. Every failure produces a page. Cluster and rate-limit.
Interactive figure: failure-cascade. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/14-
agent-engineering/26-failure-modes-agentic
Build It
code/main.py implements a stdlib failure-mode tagger:
• A synthetic trace dataset covering the five modes.
• Detector functions per mode (signature patterns on tool calls, outputs, repeat actions).
• A tagger that labels each trace and reports mode distribution.
Run it:
AIENGINEERINGFROMSCRATCH.COM 351

FAILURE MODES: WHY AGENTS BREAK
python3 code/main.py
Output: per-trace labels + aggregate distribution, a cheap reproduction of what Phoenix’s
trace clustering surfaces.
Use It
• Phoenix for production drift clustering (Lesson 24).
• Langfuse for session replay + annotation.
• Custom for domain-specific signatures your observability platform can’t detect.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/26-failure-modes-agentic
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engine
ering-from-scratch/tree/main/phases/14-agent-engineering/26-failure-modes-agentic/code
1. Add a detector for “success hallucination”: agent returns success but the target state is
unchanged.
2. Tag 100 real traces from a product you’ve built. Which mode dominates? What’s the
cost of fixing it?
3. Implement a “cascade radius” metric: given a failure at step N, how many downstream
steps did it affect?
4. Read MASFT’s 14 failure modes. Pick three that apply to your product. Write detectors.
5. Wire one detector into a CI job: fail the build if >=5% of traces tag a mode.
Key Terms
Term What people say What it actually means
MASFT “Multi-agent failure Berkeley 14-mode categorization
taxonomy”
Cascading “Ripple failure” One early mistake propagates through N
error steps
Context “Forgot the constraint” Long-horizon turn drops early-turn facts
loss
Tool “Wrong tool / wrong args” Valid call, wrong invocation
misuse
Success “Faked completion” Agent claims success on a 400; state
hallucina- unchanged
tion
Scope “Overreach” Agent does more than asked
creep
Instruction- “Disobedience” Ignores system prompt or user constraint
following
deviation
Sub- “Plan bugs” Omission, redundancy, disorder in plan
intention execution
errors
AIENGINEERINGFROMSCRATCH.COM 352

FAILURE MODES: WHY AGENTS BREAK
Further Reading
• Cemri et al., MASFT (arXiv:2503.13657) — 14 failure modes, 3 categories
• Microsoft, Taxonomy of Failure Mode in Agentic AI Systems — risk register
• Arize Phoenix — drift clustering in practice
• Anthropic, Building Effective Agents — when simpler patterns avoid modes entirely
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/14-agent-engineering/26-failure-modes-agentic
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/14-agent-engineering/26-failure-modes-agentic/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/14-agent-engineering/26-failure-modes-agentic
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 353