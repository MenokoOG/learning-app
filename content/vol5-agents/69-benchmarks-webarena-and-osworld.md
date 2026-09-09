---
title: "Benchmarks: WebArena and OSWorld"
volume: "vol5-agents"
part: "Part III — Agent Engineering"
chapter_number: 69
source_pages: "332-335"
---

# Benchmarks: WebArena and OSWorld

Benchmarks: WebArena and OSWorld
WebArena tests web-agent capability across four self-hosted apps. OSWorld tests
desktop-agent capability across Ubuntu, Windows, macOS. At release (2023–2024)
both showed a big gap between best-in-class agents and humans. The gap is nar-
rowing; the failure modes haven’t changed.
Type: Learn Languages: Python (stdlib) Prerequisites: Phase 14 · 19 (SWE-bench, GAIA)
Time: ~60 minutes
Learning Objectives
• Describe WebArena’s four self-hosted apps and why execution-based evaluation matters.
• Explain why OSWorld uses real OS screenshots instead of accessibility APIs.
• Name the two primary OSWorld failure modes: GUI grounding and operational knowl-
edge.
• Summarize what OSWorld-G and OSWorld-Human add on top of the base benchmark.
The Problem
Generalist agents can call tools. Can they drive a browser across 20 clicks to complete a
shopping checkout? Can they configure a Linux box using only keyboard and mouse? These
are the questions WebArena and OSWorld answer.
The Concept
WebArena (Zhou et al., ICLR 2024)
• 812 long-horizon tasks across four self-hosted web apps: a shopping site, a forum, a
GitLab-like dev tool, a business CMS.
• Plus utilities: map, calculator, scratchpad.
• Evaluation is execution-based via gym APIs — was the order placed, was the issue closed,
was the CMS page updated?
• At release: best GPT-4 agent hit 14.41% success vs human 78.24%.
The self-hosted framing matters — the benchmark is not flaky because the target apps are
pinned and reproducible.
Extensions
• VisualWebArena — visually grounded tasks where success depends on interpreting
images (screenshots as first-class observations).
• TheAgentCompany (Dec 2024) — adds terminal + coding; more like a real remote-work
environment.
AIENGINEERINGFROMSCRATCH.COM 326

BENCHMARKS: WEBARENA AND OSWORLD
OSWorld (Xie et al., NeurIPS 2024)
• 369 real computer tasks across Ubuntu, Windows, macOS.
• Free-form keyboard and mouse control of real applications.
• 1920×1080 screenshots as the observation.
• At release: best model 12.24% vs human 72.36%.
Primary failure modes
1. GUI grounding. Pixel → element mapping. Models struggle to localize UI elements
reliably in 1920×1080.
2. Operational knowledge. Which menu has the setting, which keyboard shortcut, which
preference pane. Knowledge tail that humans build over years.
Follow-ups
• OSWorld-G — 564-sample grounding suite + Jedi training set. Decomposes grounding
from planning so you can measure them separately.
• OSWorld-Human — manually curated gold action trajectories. Shows top agents use
1.4-2.7x more steps than necessary (the trajectory-efficiency gap).
Why this matters
Claude computer use, OpenAI CUA, Gemini 2.5 Computer Use (Lesson 21) all train on work-
loads shaped by WebArena and OSWorld. The benchmarks are the target; the production
models are the shipped answer.
Where benchmarking goes wrong
• Screenshot-only evals. OSWorld is screenshot-driven; evaluating an agent that uses
DOM or accessibility APIs on OSWorld misses the grounding challenge.
• Ignoring trajectory length. Scoring only success-rate misses the 1.4-2.7x step ineffi-
ciency OSWorld-Human surfaces.
• Stale self-hosted apps. WebArena’s apps pin specific versions; update without re-
curation breaks comparability.
Interactive figure: ae-agent-human-gap. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/14-agent-engineering/20-benchmarks-webarena-osworld
Build It
code/main.py implements a toy web-agent harness:
• A minimal “shopping app” state machine: list_items, add_to_cart, checkout.
• Gold trajectories for 3 tasks.
• A scripted agent that attempts each task.
• Execution-based evaluator (state check) and trajectory-efficiency metric (steps vs gold).
Run it:
python3 code/main.py
Output: per-task success rate and trajectory efficiency, mirroring OSWorld-Human’s method-
ology.
AIENGINEERINGFROMSCRATCH.COM 327

BENCHMARKS: WEBARENA AND OSWORLD
Use It
• WebArena Verified self-hosted on an internal cluster for continuous evaluation.
• OSWorld in a VM fleet for desktop agents.
• Computer-use agents (Lesson 21) — Claude, OpenAI CUA, Gemini — all trained on
workloads like these.
• Your own product flows — capture gold trajectories for your top 20 tasks; run agents
against them weekly.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg0
0/ai-engineering-from-scratch/tree/main/phases/14-agent-engineering/20-benchmarks-
webarena-osworld
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/14-agent-engineering/20-benchmarks-webarena-
osworld/code
1. Extend the toy harness with a second app (a forum). Write 3 tasks plus gold trajectories.
2. Add trajectory-efficiency reporting per task. On your toy, is the agent 1x, 2x, or 3x over
gold?
3. Implement a “distractor” tool — one the gold trajectory never uses. Does the scripted
agent get tempted?
4. Read OSWorld-G. How would you separate grounding failures from planning failures in
your own evals?
5. Read WebArena’s apps README. What breaks when you upgrade one of the pinned app
versions?
Key Terms
Term What people say What it actually means
WebArena “Web agent benchmark” 812 tasks across 4 self-hosted apps;
gym-style evaluation
VisualWebAre“nVaisual WebArena” Visually grounded WebArena; screenshots
are observations
OSWorld “Desktop agent benchmark” 369 tasks on real Ubuntu/Windows/macOS
GUI “Pixel-to-element mapping” Model localizing UI elements in 1920x1080
grounding
Operational “OS know-how” Which menu, which shortcut, which
knowledge preference pane
OSWorld-G “Grounding suite” 564 grounding-only samples + training set
OSWorld- “Gold trajectories” Manual expert action sequences to measure
Human efficiency
Trajectory “Steps over gold” Agent step count divided by human minimum
efficiency
AIENGINEERINGFROMSCRATCH.COM 328

BENCHMARKS: WEBARENA AND OSWORLD
Further Reading
• Zhou et al., WebArena (arXiv:2307.13854) — four-app web benchmark
• Xie et al., OSWorld (arXiv:2404.07972) — cross-OS desktop benchmark
• Anthropic, Introducing computer use — Claude’s benchmark-shaped capability
• OpenAI, Computer-Using Agent — OSWorld and WebArena numbers
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/14-agent-engineering/20-benchmarks-webarena-osworld
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/14-agent-engineering/20-benchmarks-webarena-osworld/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/14-agent-engineering/20-benchmarks-webarena-osworld
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 329