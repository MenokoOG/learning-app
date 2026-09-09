---
title: "Red-Teaming: PAIR and Automated Attacks"
volume: "vol6-production"
part: "Part II — Ethics, Safety & Alignment"
chapter_number: 42
source_pages: "185-188"
---

# Red-Teaming: PAIR and Automated Attacks

Red-Teaming: PAIR and Automated At-
tacks
Chao, Robey, Dobriban, Hassani, Pappas, Wong (NeurIPS 2023, arXiv:2310.08419).
PAIR — Prompt Automatic Iterative Refinement — is the canonical automated black-
box jailbreak. An attacker LLM with a red-team system prompt iteratively proposes
jailbreaks for a target LLM, accumulating attempts and responses in its own chat
history as in-context feedback. PAIR typically succeeds within 20 queries, orders
of magnitude more efficient than GCG (Zou et al.’s token-level gradient search)
and without requiring white-box access. PAIR is now a standard baseline in Jail-
breakBench (arXiv:2404.01318) and HarmBench, alongside GCG, AutoDAN, TAP,
and Persuasive Adversarial Prompt.
Type: Build Languages: Python (stdlib, mock PAIR loop against a toy target) Prerequisites:
Phase 18 · 01 (instruction-following), Phase 14 (agent engineering) Time: ~75 minutes
Learning Objectives
• Describe the PAIR algorithm: attacker system prompt, iterative refinement, in-context
feedback.
• Explain why PAIR is strictly more efficient than GCG when the target is black-box.
• Name four other automated-attack baselines (GCG, AutoDAN, TAP, PAP) and state one
distinguishing feature of each.
• Describe the JailbreakBench and HarmBench evaluation protocols and what “attack suc-
cess rate” means under each.
The Problem
Red-teaming used to be a manual activity. A small number of expert testers constructed
adversarial prompts and tracked which ones worked. This does not scale: attack success
rate needs a statistical sample, and the target is a moving target with every model release.
PAIR operationalizes red-teaming as an optimization problem with a black-box target.
The Concept
PAIR algorithm
Inputs: - Target LLM T (the model we are attacking). - Judge LLM J (scores whether a response
is a jailbreak). - Attacker LLM A (the red-team optimizer). - Goal string G: “respond with
[harmful instruction].” - Budget K (usually 20 queries).
Loop, for k in 1..K: 1. A is prompted with the goal G and the history of (prompt, response)
pairs so far. 2. A emits a new prompt p_k. 3. Submit p_k to T; receive response r_k. 4. J
scores (p_k, r_k) on the goal. 5. If score >= threshold, halt — jailbreak found. 6. Else, append
(p_k, r_k) to A’s history; continue.
AIENGINEERINGFROMSCRATCH.COM 178

RED-TEAMING: PAIR AND AUTOMATED ATTACKS
Empirical result (NeurIPS 2023): >50% attack success rate against GPT-3.5-turbo, Llama-2-
7B-chat; mean queries to success in the 10-20 range.
Why PAIR is efficient
GCG (Zou et al. 2023) searches over adversarial token suffixes by gradient; it requires white-
box model access and produces unreadable suffixes. PAIR is black-box and produces natural-
language attacks that transfer across models. PAIR’s in-context feedback lets the attacker
learn from each rejection; GCG has no equivalent (each new token update has to rediscover
prior progress).
Related automated attacks
• GCG (Zou et al. 2023, arXiv:2307.15043). Token-level gradient search for adversarial
suffixes. White-box, transferable, produces unreadable strings.
• AutoDAN (Liu et al. 2023). Evolutionary search over prompts, guided by a hierarchical
objective.
• TAP (Mehrotra et al. 2024). Tree-of-attacks with pruning — branches multiple PAIR-
style rollouts.
• PAP (Zeng et al. 2024). Persuasive Adversarial Prompts — encodes human persuasion
techniques as prompt templates.
JailbreakBench and HarmBench
Both (2024) standardize evaluation:
• JailbreakBench (arXiv:2404.01318). 100 harmful behaviors across 10 OpenAI-policy cat-
egories. Attack success rate (ASR) as the primary metric. Requires a judge (GPT-4-turbo,
Llama Guard, or StrongREJECT).
• HarmBench (Mazeika et al. 2024). 510 behaviours across 7 categories, with semantic
and functional harm tests. Compares 18 attacks against 33 models.
ASR is usually reported at a fixed query budget. Comparing attacks requires matching bud-
gets; a 90% ASR at 200 queries is not comparable to 85% ASR at 20.
Reason it matters for 2026 deployments
Every frontier lab now runs PAIR and TAP against production models before release. ASR
trajectories appear in model cards (Lesson 26) and safety-case appendices (Lesson 18). The
attack is not exotic — it is standard infrastructure.
Where this fits in Phase 18
Lesson 12 is the automated-attack foundation. Lesson 13 (Many-Shot Jailbreaking) is a com-
plementary length-exploit. Lesson 14 (ASCII Art / Visual) is an encoding attack. Lesson
15 (Indirect Prompt Injection) is the 2026 production attack surface. Lesson 16 covers the
defensive-tooling counterparts (Llama Guard, Garak, PyRIT).
Interactive figure: al-pair-loop. This one moves. Watch it animate and drag its controls in
the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/18-ethics-
safety-alignment/12-red-teaming-pair-automated-attacks
AIENGINEERINGFROMSCRATCH.COM 179

RED-TEAMING: PAIR AND AUTOMATED ATTACKS
Use It
code/main.py builds a toy PAIR loop. The target is a mock classifier that refuses “obvious”
harmful prompts (keyword-filter). The attacker is a rule-based refiner that tries paraphrase,
roleplay-framing, and encoding. The judge scores the response. You watch the attacker
succeed in ~5-15 iterations against the keyword filter and fail against a semantic filter.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/18-ethics-safety-alignment/12-red-teaming-pair-
automated-attacks
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/18-ethics-safety-alignment/12-red-teaming-pair-
automated-attacks/code
1. Run code/main.py. Measure mean-queries-to-success for the three built-in attacker
strategies. Explain which target-defense assumption each exploits.
2. Implement a fourth attacker strategy (e.g., translation to another language, base64 en-
coding). Report the new mean-queries-to-success against the keyword-filter target and
the semantic-filter target.
3. Read Chao et al. 2023 Figure 5 (PAIR vs GCG comparison). Describe two scenarios where
GCG is preferred despite PAIR’s efficiency advantage.
4. JailbreakBench reports ASR against a fixed goal set. Design an additional metric that
measures attack diversity (variance in successful prompts). Explain why diversity mat-
ters for defense evaluation.
5. TAP (Mehrotra 2024) extends PAIR with branching + pruning. Sketch a TAP-style exten-
sion to code/main.py and describe the computational cost vs success-rate trade-off.
Key Terms
Term What people say What it actually means
PAIR “automated jailbreak” Prompt Automatic Iterative Refinement;
attacker-LLM + judge-LLM loop
GCG “gradient jailbreak” White-box token-level gradient search for
adversarial suffixes
Attack “% jailbreaks at k queries” Primary metric; must be reported with
success query budget and judge identity
rate (ASR)
Judge LLM “the scorer” LLM that grades whether a response
satisfies the harmful goal
JailbreakBenc“hthe evaluation” Standardized harmful-behaviour set with
tagged categories
HarmBench “the broader bench” 510 behaviours, functional + semantic harm
tests
TAP “tree of attacks” PAIR with branching + pruning; better ASR
at higher compute
AIENGINEERINGFROMSCRATCH.COM 180

RED-TEAMING: PAIR AND AUTOMATED ATTACKS
Further Reading
• Chao et al. — Jailbreaking Black Box LLMs in Twenty Queries (arXiv:2310.08419) — PAIR
paper, NeurIPS 2023
• Zou et al. — Universal and Transferable Adversarial Attacks on Aligned LLMs
(arXiv:2307.15043) — GCG paper
• Chao et al. — JailbreakBench (arXiv:2404.01318) — standardized evaluation
• Mazeika et al. — HarmBench (ICML 2024) — broader evaluation
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-
attacks
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scra
tch/tree/main/phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-
attacks/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-attacks
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 181