---
title: "Reflexion: Verbal Reinforcement Learning"
volume: "vol5-agents"
part: "Part III — Agent Engineering"
chapter_number: 52
source_pages: "259-262"
---

# Reflexion: Verbal Reinforcement Learning

Reflexion: Verbal Reinforcement Learn-
ing
Gradient-based RL needs thousands of trials and a GPU cluster to fix a failure mode.
Reflexion (Shinn et al., NeurIPS 2023) does it in natural language: after each failed
trial, the agent writes a reflection, stores it in episodic memory, and conditions the
next trial on that memory. This is the pattern behind Letta’s sleep-time compute,
Claude Code’s CLAUDE.md learnings, and pro-workflow’s learn-rule.
Type: Build Languages: Python (stdlib) Prerequisites: Phase 14 · 01 (Agent Loop), Phase
14 · 02 (ReWOO) Time: ~60 minutes
Learning Objectives
• Name the three components of Reflexion (Actor, Evaluator, Self-Reflector) and the role
of episodic memory.
• Implement a stdlib Reflexion loop with binary evaluator, reflection buffer, and fresh re-
attempts.
• Choose between scalar, heuristic, and self-evaluated feedback sources for a given task.
• Explain why verbal reinforcement catches errors that gradient-based RL would need
thousands of trials to fix.
The Problem
An agent fails a task. In standard RL you would run thousands more trials, compute gradients,
update weights. Expensive, slow, and most production agents do not have a training budget
for every failure.
Reflexion (Shinn et al., arXiv:2303.11366) asks a different question: what if the agent just
thought about why it failed and tried again with that thought in its prompt? No weight updates.
No gradient. Just natural language stored between trials.
The result: on ALFWorld it beats ReAct and other non-fine-tuned baselines. On HotpotQA it
improves over ReAct. On code generation (HumanEval/MBPP) it sets state of the art at the
time. All without a single gradient step.
The Concept
The three components
Actor : generates a trajectory (ReAct-style loop)
Evaluator : scores the trajectory — binary, heuristic, or self-eval
Self-Reflector: writes a natural-language reflection on the failure
Plus one data structure:
AIENGINEERINGFROMSCRATCH.COM 253

REFLEXION: VERBAL REINFORCEMENT LEARNING
Episodic memory: list of prior reflections, prepended to the next trial's prompt
One trial runs the Actor. Evaluator scores it. If the score is low, Self-Reflector produces a
reflection (“I picked the wrong tool because I misread the question as asking about X when
it was asking about Y”). The reflection goes into episodic memory. Next trial starts fresh but
sees the reflection.
Three evaluator types
1. Scalar — an external binary signal. ALFWorld succeeds or fails. HumanEval tests pass
or fail. Simplest, highest-signal.
2. Heuristic — predefined failure signatures. “If the agent produced the same action twice
in a row, mark as stuck.” “If the trajectory exceeds 50 steps, mark as inefficient.”
3. Self-evaluated — the LLM scores its own trajectory. Needed when no ground truth
is available. Weaker signal; pairs well with tool-grounded verification (Lesson 05 —
CRITIC).
The 2026 default is a mix: scalar when available, self-eval when not, heuristics as safety rails.
Why this generalizes
Reflexion is not a new algorithm so much as a named pattern. Almost every production “self-
healing” agent runs some variant:
• Letta’s sleep-time compute (Lesson 08): a separate agent reflects on past conversations
and writes to memory blocks.
• Claude Code’s CLAUDE.md / “save memory” pattern: reflections captured as learnings,
prepended to future sessions.
• pro-workflow’s /learn-rule command: corrections captured as explicit rules.
• LangGraph’s reflection nodes: a node that scores output and routes to refine if needed.
All derive from the same insight: natural language is a rich-enough medium to carry “what I
learned from failure” between runs.
When it works and when it does not
Reflexion works when:
• There is a clear failure signal (test failure, tool error, wrong answer).
• The task class is reproducible (the same type of question can be asked again).
• The reflection has room to improve on the trajectory (enough action budget).
Reflexion does not help when:
• The agent already succeeds on the first try.
• The failure is external (network down, tool broken) — reflection on “the network was
down” does not help future runs.
• The reflection turns into superstition — storing a narrative about a one-off flaky run.
2026 pitfall: memory rot. Reflections accumulate; some are obsolete or wrong; re-runs get
slower as the episodic buffer grows. Mitigation: periodic compaction (Lesson 06), TTL on
reflections, or a separate sleep-time cleanup agent (Letta).
Interactive figure: react-trace. This one moves. Watch it animate and drag its controls in
the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/14-agent-
engineering/03-reflexion-verbal-rl
AIENGINEERINGFROMSCRATCH.COM 254

REFLEXION: VERBAL REINFORCEMENT LEARNING
Build It
code/main.py implements Reflexion on a toy puzzle: produce a 3-element list that sums to
a target. The Actor emits candidate lists; the Evaluator checks the sum; the Self-Reflector
writes a line about what went wrong. The reflection goes into episodic memory for the next
trial.
Components:
• Actor — a scripted policy that improves when it sees reflections.
• Evaluator.binary() — pass/fail on the target sum.
• SelfReflector — generates a one-line diagnosis of the failure.
• EpisodicMemory — a bounded list with TTL semantics.
Run it:
python3 code/main.py
The trace shows three trials. Trial 1 fails, a reflection is stored, trial 2 sees the reflection
and improves but still fails, trial 3 succeeds. Compare with a baseline run (no reflection) — it
stays stuck at trial 1’s answer.
Use It
LangGraph ships reflection as a node pattern. Claude Code’s /memory command and pro-
workflow’s /learn-rule externalize the episodic buffer as a markdown file. Letta’s sleep-
time compute runs the Self-Reflector on downtime so the primary agent stays latency-bound.
OpenAI Agents SDK does not ship Reflexion directly; you build it with a custom Guardrail that
rejects trajectories by score and a memory Session that survives across runs.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/03-reflexion-verbal-rl
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/14-agent-engineering/03-reflexion-verbal-rl/code
1. Switch from binary to scalar evaluator that returns a distance metric (how far from tar-
get). Does it converge faster?
2. Add a TTL of 10 trials to reflections. Do older reflections hurt or help after that point?
3. Implement heuristic evaluator: mark the trial as stuck if the same action repeats. How
does this interact with Self-Reflector?
4. Run Reflexion with an adversarial Actor that ignores reflections. What is the minimum
reflection prompt engineering that forces the Actor to notice them?
5. Read Section 4 of the Reflexion paper on AlfWorld. Reproduce the 130% success-rate
improvement conceptually: what is the key delta vs vanilla ReAct?
Key Terms
AIENGINEERINGFROMSCRATCH.COM 255

REFLEXION: VERBAL REINFORCEMENT LEARNING
Term What people say What it actually means
Reflexion “Self-correction” Shinn et al. 2023 — Actor, Evaluator,
Self-Reflector plus episodic memory
Verbal rein- “Learning without gradients” Natural-language reflection prepended to the
forcement next trial’s prompt
Episodic “Per-task reflections” Bounded buffer of prior reflections for one
memory task class
Scalar “Binary success signal” Pass/fail or numeric score from ground truth
evaluator
Heuristic “Pattern-based detector” Predefined failure signatures (e.g. stuck-loop,
evaluator too-many-steps)
Self- “LLM-as-judge on own trace” Lower-signal fallback when no ground truth
evaluator — pair with tool-grounded verification
Memory “Stale reflections” Episodic buffer fills with obsolete entries; fix
rot with compaction/TTL
Sleep-time “Async self-reflection” Run Self-Reflector off the hot path so primary
reflection agent stays fast
Further Reading
• Shinn et al., Reflexion: Language Agents with Verbal Reinforcement Learning
(arXiv:2303.11366) — the canonical paper
• Letta, Sleep-time Compute — async reflection in production
• Anthropic, Effective context engineering for AI agents — managing the episodic buffer
as part of context
• LangGraph overview — reflection node pattern
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/14-agent-engineering/03-reflexion-verbal-rl
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/14-agent-engineering/03-reflexion-verbal-rl/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/14-agent-engineering/03-reflexion-verbal-rl
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 256