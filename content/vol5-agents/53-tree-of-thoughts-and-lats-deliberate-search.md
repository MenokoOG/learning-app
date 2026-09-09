---
title: "Tree of Thoughts and LATS: Deliberate Search"
volume: "vol5-agents"
part: "Part III — Agent Engineering"
chapter_number: 53
source_pages: "263-266"
---

# Tree of Thoughts and LATS: Deliberate Search

Tree of Thoughts and LATS: Deliberate
Search
A single chain-of-thought trajectory has no room to backtrack. ToT (Yao et al., 2023)
turns reasoning into a tree with self-evaluation on each node. LATS (Zhou et al.,
2024) unifies ToT with ReAct and Reflexion under Monte Carlo Tree Search. Game
of 24 goes from 4% (CoT) to 74% (ToT); LATS hits 92.7% pass@1 on HumanEval.
Type: Build Languages: Python (stdlib) Prerequisites: Phase 14 · 01 (Agent Loop), Phase
14 · 03 (Reflexion) Time: ~75 minutes
Learning Objectives
• Frame reasoning as search: nodes are “thoughts,” edges are “expansions,” value is “how
promising.”
• Implement a stdlib ToT-style BFS tree search with self-evaluation scoring.
• Extend to a toy LATS MCTS loop with select / expand / simulate / backpropagate.
• Decide when search is worth the token multiplier (Game of 24, code generation) and
when a single trajectory is enough (simple Q&A).
The Problem
Chain-of-thought is a linear walk. If the first step is wrong, every subsequent step works on
a bad premise. On Game of 24 (use four digits with + − × ÷ to make 24), GPT-4 CoT hits 4%
accuracy. The model picks the wrong subexpression early and cannot recover.
What reasoning needs is the ability to propose multiple candidates, evaluate them, pick the
promising ones, and backtrack when dead ends appear. That is search. Tree of Thoughts and
LATS are the two canonical formulations.
The Concept
Tree of Thoughts (Yao et al., NeurIPS 2023)
Each node is a coherent intermediate step (“a thought”). Each node can expand to K child
thoughts. The LLM self-evaluates each node with a scoring prompt. Search explores the tree
— BFS, DFS, or beam.
(root: "find 24 from 4 6 4 1")
/ | \
("6 - 4 = 2") ("4 + 1 = 5") ("4 * 6 = 24") <- Score: HIGH
/ \ | |
... ... ... finish
AIENGINEERINGFROMSCRATCH.COM 257

TREE OF THOUGHTS AND LATS: DELIBERATE SEARCH
Self-evaluation is the load-bearing piece. The paper shows three variants: sure / likely /
impossible classification, 1..10 numeric score, and vote among candidates. All three beat
CoT substantially on Game of 24 (4% -> 74% with GPT-4).
LATS (Zhou et al., ICML 2024)
LATS unifies ToT, ReAct, and Reflexion under MCTS. The LLM plays three roles:
• Policy: propose candidate next actions (ReAct-style).
• Value function: score a partial trajectory (ToT-style self-eval).
• Self-reflector: on failure, write a natural-language reflection (Reflexion-style) and use
it to reseed future rollouts.
Environment feedback (observations) mixes into the value function so the search is informed
by real tool results, not just model opinions. Results at paper time: HumanEval pass@1
92.7% with GPT-4 (SOTA), WebShop average 75.9 with GPT-3.5 (approaching gradient-based
fine-tuning).
MCTS, minimally
Four phases per iteration:
1. Select — walk from root to a leaf using UCT (upper confidence bound for trees).
2. Expand — generate K children via the policy.
3. Simulate — rollout from a child using the policy, score the leaf with the value function
(or environment reward).
4. Backpropagate — update visit counts and value estimates up the path.
UCT formula: Q(s, a) + c * sqrt(ln N(s) / N(s, a)). First term is exploitation; second is
exploration. Tune c per task.
The cost reality
Search explodes tokens. ToT on Game of 24 uses 100–1000x the tokens of CoT. LATS is similar.
This is not free; reserve search for:
• Tasks where a single trajectory is demonstrably insufficient (Game of 24, complex code).
• Tasks where wall-clock is less important than correctness.
• Tasks with a cheap, reliable value function (unit tests for code, explicit target for math).
If your task has a single right answer and a noisy evaluator, search often makes things worse
— it finds a “good-scoring” wrong answer.
2026 positioning
Most production agents do not run LATS. They run ReAct with tool-grounded verification
(CRITIC, Lesson 05). Search shows up in specialized niches:
• Coding agents that run tests as the value function (HumanEval-style).
• Deep-research agents that explore multiple query paths.
• Planning-heavy workflows inside LangGraph subgraphs.
AlphaEvolve (Lesson 11) is the 2025 extreme: evolutionary search over code, machine-
checkable fitness, frontier gains (first 4x4 matmul improvement in 56 years).
Interactive figure: tree-of-thoughts. This one moves. Watch it animate and drag its con-
trols in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/14-
agent-engineering/04-tree-of-thoughts-lats
AIENGINEERINGFROMSCRATCH.COM 258

TREE OF THOUGHTS AND LATS: DELIBERATE SEARCH
Build It
code/main.py implements:
• A tiny ToT BFS on a stylized “pick arithmetic ops” task.
• A toy LATS MCTS loop on the same task (Select / Expand / Simulate / Backpropagate)
with UCT selection.
• A value function that composes a symbolic score plus a self-eval score.
Run it:
python3 code/main.py
The trace shows ToT expanding three candidates per node with BFS, compared to LATS con-
verging on the best rollout via MCTS. Token counts printed for both.
Use It
LangGraph ships ToT-style exploration as subgraph patterns; the LangChain team’s blog on
LATS (May 2024) is the reference tutorial. LlamaIndex ships a TreeOfThoughts agent. For
most 2026 production agents this pattern lives behind an if task_complexity > threshold:
use_search() gate — see the evaluator-optimizer pattern in Lesson 05.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/04-tree-of-thoughts-lats
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/14-agent-engineering/04-tree-of-thoughts-lats/code
1. Run the toy LATS with UCT c=0.1 vs c=2.0. What changes in the trace?
2. Swap the value function for a noisier scorer (add random jitter). Does MCTS still find
the best leaf? What is the minimum signal-to-noise it tolerates?
3. Implement beam-search ToT (keep top-k at each level) and compare to BFS. Which is
better on a tight token budget?
4. Read LATS Section 5.1. Reproduce the HumanEval trajectory count: how many rollouts
does it take to hit the reported pass@1?
5. Read the LATS paper’s discussion on “when LATS helps less.” Write a one-paragraph
decision rule mapping task shape to search strategy.
Key Terms
Term What people say What it actually means
Tree of “Branching CoT” Yao et al. — tree of thought nodes with
Thoughts self-evaluation
LATS “MCTS for LLMs” Zhou et al. — unifies ToT + ReAct + Reflexion
under MCTS
UCT “Upper confidence bound” Select formula balancing exploitation (Q) and
exploration (ln N / n)
AIENGINEERINGFROMSCRATCH.COM 259

TREE OF THOUGHTS AND LATS: DELIBERATE SEARCH
Term What people say What it actually means
Value “How good is this state” Prompted LLM score or environment reward;
function feeds backprop
Policy “Action proposer” ReAct-style generator; emits candidate next
thoughts/actions
Rollout “Simulated trajectory” Walk from a node to a leaf using policy, score
with value
Backpropagat“eUpdate ancestors” Push the leaf’s reward up the path, updating
visit counts and Q
Search “Token explosion” 100-1000x CoT on Game of 24; budget before
cost you adopt
Further Reading
• Yao et al., Tree of Thoughts (arXiv:2305.10601) — the canonical paper
• Zhou et al., LATS (arXiv:2310.04406) — MCTS with Reflexion feedback
• LangGraph overview — subgraph patterns for search
• AlphaEvolve (arXiv:2506.13131) — evolutionary search with programmatic evaluators
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/14-agent-engineering/04-tree-of-thoughts-lats
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/14-agent-engineering/04-tree-of-thoughts-lats/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/14-agent-engineering/04-tree-of-thoughts-lats
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 260