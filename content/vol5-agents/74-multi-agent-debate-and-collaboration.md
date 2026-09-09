---
title: "Multi-Agent Debate and Collaboration"
volume: "vol5-agents"
part: "Part III — Agent Engineering"
chapter_number: 74
source_pages: "352-355"
---

# Multi-Agent Debate and Collaboration

Multi-Agent Debate and Collaboration
Du et al. (ICML 2024, “Society of Minds”) run N model instances that independently
propose answers, then iteratively critique each other over R rounds to converge.
Improves factuality, rule-following, reasoning. Sparse topology beats full mesh on
token cost.
Type: Learn + Build Languages: Python (stdlib) Prerequisites: Phase 14 · 12 (Workflow
Patterns), Phase 14 · 05 (Self-Refine and CRITIC) Time: ~60 minutes
Learning Objectives
• Explain the debate protocol: N proposers, R rounds, converge on a shared answer.
• Describe why debate improves factuality, rule-following, and reasoning.
• Explain sparse topology: not every debater needs to see every other.
• Implement a stdlib debate over a scripted LLM with full-mesh and sparse variants; mea-
sure token cost vs accuracy.
The Problem
Self-Refine (Lesson 05) is one model critiquing itself — risks groupthink. CRITIC (Lesson 05)
grounds critique in external tools — not always available. Debate introduces a third mode:
multiple instances, cross-critique, convergence by disagreement.
The Concept
Society of Minds (Du et al., ICML 2024)
• N model instances independently propose answers to the same question.
• Over R rounds, each model reads the others’ proposals and critiques them.
• Models update their answers based on the critiques.
• After R rounds, return the convergent answer.
Original experiments used N=3, R=2 due to cost. Accuracy improves with more agents and
more rounds on hard problems (MMLU, GSM8K, Chess Move Validity, biography generation).
Cross-model combinations beat single-model debates: ChatGPT + Bard together > either
alone.
Sparse topology
“Improving Multi-Agent Debate with Sparse Communication Topology” (arXiv:2406.11776,
2024-2025) showed full-mesh debate is not always optimal. Sparse topologies (star, ring,
hub-and-spoke) can match accuracy at lower token cost. Each debater sees only a subset of
peers.
Implications:
AIENGINEERINGFROMSCRATCH.COM 346

MULTI-AGENT DEBATE AND COLLABORATION
• Full mesh N=5, R=3 = 5 × 3 = 15 proposals, each reading 4 peers = 60 critique ops.
• Star N=5, R=3 (one hub + 4 spokes) = 15 proposals, spokes read only the hub = 12
critique ops.
When debate helps
• Factuality. N independent proposals, cross-check reduces hallucination.
• Rule-following. Chess move validity — one model misses a rule, others catch it.
• Open-ended reasoning. Multiple framings narrow in on the right answer.
When debate hurts
• Latency-sensitive UX. N × R serial rounds is latency you may not have.
• Cost-sensitive scale. N × R tokens per question.
• Simple factual lookups. One lookup is cheaper than five debates.
2026 practical instantiations
• Anthropic orchestrator-workers (Lesson 12) — one variant of debate with a synthesis
step.
• LangGraph supervisor (Lesson 13) — central router + specialist agents can implement
debate as a node.
• OpenAI Agents SDK (Lesson 16) — agents handoff back and forth for iterative critique.
• Multi-agent evals — pair debate + evaluator-optimizer for eval signal.
Where this pattern goes wrong
• Convergence collapse. All agents converge on the first wrong answer. Mitigate with
required disagreement rounds.
• Hub failure. In a star topology, a bad hub corrupts everyone. Rotate or use multiple
hubs.
• Prompt homogenization. All agents use the same prompt; they produce the same
answers. Use diverse prompts and/or models.
Interactive figure: debate-converge. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/14-
agent-engineering/25-multi-agent-debate
Build It
code/main.py implements stdlib debate:
• Debater class (scripted LLM with per-debater opinion drift).
• FullMeshDebate and SparseDebate runners.
• Three questions: one factual, one rule-based, one reasoning.
• Metrics: convergent answer, rounds to convergence, total critique ops.
Run it:
python3 code/main.py
Output: per-protocol accuracy and cost; sparse matches full mesh on 2/3 questions at lower
cost.
AIENGINEERINGFROMSCRATCH.COM 347

MULTI-AGENT DEBATE AND COLLABORATION
Use It
• Anthropic orchestrator-workers for simple 2-3-worker debates.
• LangGraph for stateful multi-round debate with checkpointing.
• Custom for research or specialized correctness guarantees.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/25-multi-agent-debate
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/14-agent-engineering/25-multi-agent-debate/code
1. Implement a “forced disagreement” rule: in round 1, every debater must produce a
distinct proposal. Measure effect on convergence speed.
2. Add a confidence-weighted aggregation: debaters return (answer, confidence); aggre-
gator weights by confidence. Does it help?
3. Swap one “agent” for a different scripted LLM with different opinions. Does heterogene-
ity improve accuracy?
4. Measure token cost for full mesh vs sparse on your 3 questions. Plot cost vs accuracy.
5. Read the Society of Minds paper. Port your toy to N=5, R=3. What breaks? What gets
better?
Key Terms
Term What people say What it actually means
Debate “Multi-agent critique” N proposers, R rounds of cross-critique,
converge
Full mesh “Everyone reads everyone” Every debater reads every peer each round
Sparse “Limited peer view” Debaters read only a subset of peers
topology
Hub-and- “Star topology” One central debater, N-1 spokes read only
spoke the hub
Convergence “Agreement” Debaters converge on a shared answer
Society of “Du et al. debate paper” ICML 2024 multi-agent debate method
Minds
Further Reading
• Du et al., Society of Minds (arXiv:2305.14325) — canonical multi-agent debate
• Sparse Communication Topology (arXiv:2406.11776) — sparse topology results
• Anthropic, Building Effective Agents — orchestrator-workers as a debate variant
• Madaan et al., Self-Refine (arXiv:2303.17651) — single-model self-critique counterpart
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/14-agent-engineering/25-multi-agent-debate
AIENGINEERINGFROMSCRATCH.COM 348

MULTI-AGENT DEBATE AND COLLABORATION
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/14-agent-engineering/25-multi-agent-debate/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/14-agent-engineering/25-multi-agent-debate
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 349