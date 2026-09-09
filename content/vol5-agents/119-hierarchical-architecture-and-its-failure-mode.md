---
title: "Hierarchical Architecture and Its Failure Mode"
volume: "vol5-agents"
part: "Part V — Multi-Agent & Swarms"
chapter_number: 119
source_pages: "578-581"
---

# Hierarchical Architecture and Its Failure Mode

Hierarchical Architecture and Its Failure
Mode
Hierarchical is supervisor nested. Manager agents over sub-managers over work-
ers. CrewAI Process.hierarchical is the textbook version: a manager_llm dynam-
ically delegates tasks and validates outputs. The LangGraph equivalent is cre-
ate_supervisor(create_supervisor(...)). It is the natural pattern when the task
is a real org chart. It is also the pattern most likely to collapse into managerial
looping — manager agents assign work poorly, misinterpret sub-outputs, or fail to
reach consensus. Sequential often beats it.
Type: Learn + Build Languages: Python (stdlib) Prerequisites: Phase 16 · 05 (Supervisor
Pattern) Time: ~60 minutes
Problem
Once the supervisor pattern clicks, the natural next step is “what if the workers are them-
selves supervisors?” Teams have sub-teams; companies have departments of departments.
Hierarchical architectures mirror that.
The issue: LLM managers are not the same as human managers. A human manager has stable
priors about what their reports know. An LLM manager re-reasons the org every turn from
whatever is in its context. Tiny drift in that context, and the whole tree misallocates work.
Concept
The shape
Manager
┌─────┐
└──┬──┘
┌────────┴────────┐
▼ ▼
Sub-Mgr A Sub-Mgr B
┌─────┐ ┌─────┐
└──┬──┘ └──┬──┘
┌┴──┬──┐ ┌┴──┐
▼ ▼ ▼ ▼ ▼
W1 W2 W3 W4 W5
Every internal node plans, delegates, and synthesizes. Only leaves do work.
Where it shines
• Clear org mapping. If the real task is departmental (“legal review the doc, finance
review the doc, engineering review the doc, then summarize for exec”), the hierarchy is
AIENGINEERINGFROMSCRATCH.COM 572

HIERARCHICAL ARCHITECTURE AND ITS FAILURE MODE
explicit.
• Local summarization. Each sub-manager synthesizes its team’s output before the top
manager sees it. Top manager sees three sub-manager summaries, not fifteen worker
outputs.
Where it breaks
Three failure modes the 2026 post-mortems keep finding:
1. Task assignment error. The manager reads the goal, hallucinates a decomposition,
and delegates to the wrong sub-manager. Because the sub-manager obediently works
on what it was given, the error only surfaces at the top synthesis — one level removed
from where a human could have caught it.
2. Output misinterpretation. Sub-manager returns “unable to verify claim X.” Top man-
ager summarizes as “claim X not confirmed.” Meaning drifts at every level.
3. Consensus loops. Two sub-managers disagree; top manager asks them to reconcile;
they re-delegate down; workers re-run; sub-managers return slightly different answers;
loop. CrewAI’s Process.hierarchical guards against this with step limits, but the limit
itself is now a hyperparameter.
The deciding question
Sequential (linear pipeline) vs hierarchical: does your task actually have independent sub-
teams, or is it one linear flow pretending to be a tree? If the latter, use sequential. If the
former, use hierarchical but budget explicit reconciliation rules.
Role-framework implementation
CrewAI’s Process.hierarchical wires a manager LLM over specialist crews. The manager:
• receives the top-level task,
• assigns subtasks to crews,
• evaluates crew outputs,
• decides whether to accept, re-delegate, or iterate.
Documentation: https://docs.crewai.com/en/introduction (look for “Hierarchical Process” un-
der Core Concepts).
Graph-framework implementation
LangGraph uses nested create_supervisor calls. The inner supervisor has its own graph;
the outer supervisor treats the inner graph as an opaque node. This is cleaner than CrewAI
for debugging (you can step through each graph separately) but harder to express dynamic
reshaping of the tree.
Reference: https://reference.langchain.com/python/langgraph-supervisor.
Interactive figure: swarm-hierarchy-token. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/16-multi-agent-and-swarms/06-hierarchical-architecture
Build It
code/main.py runs a 3-level hierarchy:
AIENGINEERINGFROMSCRATCH.COM 573

HIERARCHICAL ARCHITECTURE AND ITS FAILURE MODE
• top manager: splits a task into “engineering” and “legal” branches,
• engineering sub-manager: splits into “frontend” and “backend” workers,
• legal sub-manager: one worker.
Demo contrasts happy path (everyone agrees) against a perturbed path where the top man-
ager’s decomposition mislabels “legal” as “finance” and watches the error cascade — the
sub-manager obediently does finance work, the top synthesizer reports finance findings, the
original legal question goes unanswered.
Run:
python3 code/main.py
Output shows both paths with a clear side-by-side of “what was asked” vs “what was deliv-
ered.”
Use It
outputs/skill-hierarchy-fitness.md evaluates whether a given task should use hierarchi-
cal, sequential, or flat supervisor. Inputs: task description, org structure, reconciliation bud-
get. Output: pattern recommendation with the specific failure modes to guard against.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/16-multi-agent-and-swarms/06-hierarchical-
architecture
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/16-multi-agent-and-swarms/06-hierarchical-
architecture/code
1. Run code/main.py and compare happy vs perturbed. How many levels of manager hand-
off does it take before the top output fully diverges from the user’s question?
2. Add a third level (top → sub → sub-sub → worker). Measure how often the perturbed path
corrects itself vs fully diverges as depth grows.
3. Implement a “canary” worker at each sub-manager that is always asked the original user
question unchanged. Use the canary answer to detect decomposition drift. How should
the manager react when the canary disagrees with the synthesized answer?
4. Read CrewAI’s Process.hierarchical docs. Identify one concrete guardrail CrewAI ap-
plies (step limit, manager_llm constraint) and describe what failure mode it targets.
5. Compare nested LangGraph supervisors to CrewAI hierarchical. Which makes reconcil-
iation loops cheaper to detect?
Key Terms
Term What people say What it actually means
Hierarchical “Org chart pattern” Supervisors over supervisors; only leaves do
work.
Manager “The boss” The LLM that decomposes, assigns, and
LLM validates at an internal node.
AIENGINEERINGFROMSCRATCH.COM 574

HIERARCHICAL ARCHITECTURE AND ITS FAILURE MODE
Term What people say What it actually means
Decomposition“The boss lost the plot” Top manager’s split no longer covers the
drift original question.
Reconciliation“Endless meetings” Sub-managers disagree; top re-delegates;
loop workers re-run; loop until budget exhausted.
Depth-2 “Don’t go deeper than 2 Empirical guardrail: 3+ levels collapses
ceiling levels” observability.
Canary “Ground truth at every level” A worker that is always asked the original
question query unchanged, to detect drift.
Provenance “Who said what” Trace from each synthesis back to the leaf
chain outputs that produced it.
Further Reading
• CrewAI introduction — Process.hierarchical — textbook hierarchical with a manager
LLM
• LangGraph supervisor reference — nested supervisor via create_supervisor
• Anthropic engineering — Research system — why Anthropic deliberately chose flat su-
pervisor over hierarchical
• Cemri et al. — Why Do Multi-Agent LLM Systems Fail? — MAST taxonomy; section on
coordination failures documents decomposition drift
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/16-multi-agent-and-swarms/06-hierarchical-architecture
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/16-multi-agent-and-swarms/06-hierarchical-architecture/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 575