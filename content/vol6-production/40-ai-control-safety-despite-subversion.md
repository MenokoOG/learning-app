---
title: "AI Control — Safety Despite Subversion"
volume: "vol6-production"
part: "Part II — Ethics, Safety & Alignment"
chapter_number: 40
source_pages: "177-180"
---

# AI Control — Safety Despite Subversion

AI Control — Safety Despite Subversion
Greenblatt, Shlegeris, Sachan, Roger (Redwood Research, arXiv:2312.06942, ICML
2024). Control reframes the safety question: given an untrusted strong model U
that may be adversarially optimizing against you, what protocols let you extract
useful work while bounding the probability of an unacceptable outcome? Resources
are a trusted weaker model T, a budget of trusted human labor H, and the ability
to edit U’s outputs. Within this frame, Trusted Editing Pareto-dominates Untrusted
Monitoring on code-backdoor tasks. The frame inherits worst-case assumptions
from security engineering: safety is the probability that an adversarially chosen U
cannot cause a concrete unacceptable outcome, measured under red-team pressure
that stands in for U.
Type: Learn Languages: Python (stdlib, safety-vs-usefulness frontier on code-backdoor task)
Prerequisites: Phase 18 · 07 (sleeper agents), Phase 18 · 08 (scheming), Phase 18 · 09
(alignment faking) Time: ~75 minutes
Learning Objectives
• Define the AI Control threat model: untrusted strong model U, trusted weaker model T,
trusted human budget H.
• Describe the Trusted Editing protocol and why it Pareto-dominates Untrusted Monitor-
ing on the ICML 2024 code-backdoor task.
• Explain the difference between alignment (U is trustworthy) and control (U is not trust-
worthy and we are safe anyway).
• State the three limits of control: humans do not scale, trusted weak models eventually
lag, control does not produce trustworthy strong models.
The Problem
Lessons 7-9 establish that a frontier model may be deceptively aligned, scheming, or faking
alignment. The safety question re-frames: can we extract useful work from a model we do not
trust, without giving it the opportunity to cause unacceptable outcomes? This is the control
problem, and it is structured like classical security: assume worst-case adversary, design a
protocol, measure the adversary’s success rate under red-team pressure.
The Concept
The threat model
Control assumes: - U — untrusted strong model. Capable. Possibly adversarial (the evaluation
treats it as if it were). - T — trusted weaker model. Less capable, but known not to be
adversarial. - H — trusted human labor. Small budget; does not scale.
AIENGINEERINGFROMSCRATCH.COM 170

AI CONTROL — SAFETY DESPITE SUBVERSION
The system must produce useful output using U. The adversary tries to cause a concrete
unacceptable outcome (e.g., a backdoor in the shipped code) while maintaining a fraction of
legitimate useful work to pass usefulness thresholds.
Control gives up on trusting U. It asks what protocols maintain safety in U’s absence of trust.
The ICML 2024 backdoor task
Prompts are competition-level coding problems. U produces a candidate solution. A hidden
oracle flags if the solution contains a backdoor (a specific input that makes the code produce a
wrong output). Red team controls U and is allowed to see all protocol internals. The protocol
must maximize solved-problem rate while keeping backdoor-shipping rate below a threshold.
Four protocols compared
• Baseline: ship U’s output directly. Usefulness maxed. Safety minimal.
• Upfront auditing: use H on all outputs. Safety maxed. Budget exhausted quickly.
• Untrusted Monitoring: a second instance of U scores the first instance’s output; H
audits flagged outputs. Risk: the two U instances can collude.
• Trusted Editing: T edits U’s output on every query. If T is not confident, route to H.
Greenblatt et al. find Trusted Editing Pareto-dominates Untrusted Monitoring: higher useful-
ness at every safety level.
Why Trusted Editing wins
Untrusted Monitoring requires that U’s second instance cannot coordinate with the first. Col-
lusion is possible via steganographic cues or shared training priors. The protocol has to invest
budget in collusion-resistance (paraphrasing, obfuscation) that reduces the monitor’s signal.
Trusted Editing avoids collusion entirely because T is trusted — any edit T proposes is, by
assumption, not adversarial. The cost is that T is less capable, so it may over-reject or miss
subtle backdoors.
The four protocol axes
1. Which role U plays: producer only, monitor, or both.
2. Which role T plays: editor, monitor, or resampler.
3. How H is allocated: uniform audit, random audit, or flag-directed audit.
4. How much compute the protocol spends on collusion-resistance.
Alignment vs control
• Alignment: “is U safe to trust?” Lessons 2, 4, 5, 6, 7, 8, 9 all bear on this.
• Control: “can we use U safely without trusting it?” Lesson 10.
Alignment is a property of the model. Control is a property of the deployment protocol. Con-
trol does not produce aligned models; it produces safe use of possibly-unaligned models. Both
agendas are needed.
Three fundamental limits
• Humans do not scale. The H budget is bounded by the number of humans willing to audit
hard AI outputs.
AIENGINEERINGFROMSCRATCH.COM 171

AI CONTROL — SAFETY DESPITE SUBVERSION
• Trusted weak models eventually lag. When T is much weaker than U, T’s editing signal
becomes noise.
• Control is not alignment. Protocols that work at ASL-3 (Lesson 18) may not work at
ASL-4 — if U can manipulate T or reason about H’s audit distribution, control fails.
The 2025 development
UK AISI and Redwood collaborate on Control Safety Cases (metr.org / redwoodresearch.org
2025): a control safety case argues that under worst-case assumptions about U, the protocol
bounds the probability of an unacceptable outcome. Safety cases (Lesson 18) inherit the
control frame.
Where this fits in Phase 18
Lessons 6-9 describe the threat (deception is possible). Lesson 10 describes the defensive
paradigm under the assumption that the threat is real. Lesson 11 describes the complemen-
tary offensive paradigm (make U trustworthy via scalable oversight).
Interactive figure: al-control-protocol. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/18-ethics-safety-alignment/10-ai-control-subversion
Use It
code/main.py simulates the four protocols on a toy backdoor task. U produces outputs; a
fraction are backdoored (red-team policy). T approves or edits. H is called on a budget.
You can sweep the budget and the collusion parameter to reproduce the Pareto frontier in
Greenblatt et al. 2024 Figure 2 (shape, not numbers).
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/18-ethics-safety-alignment/10-ai-control-
subversion
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/18-ethics-safety-alignment/10-ai-control-
subversion/code
1. Run code/main.py. Reproduce the usefulness-safety frontier for Trusted Editing vs Un-
trusted Monitoring. Identify the budget regime in which Untrusted Monitoring’s collu-
sion assumption becomes pivotal.
2. Add a new protocol: “T resamples with low temperature, then U edits T’s output.” Mea-
sure its position on the frontier. Why does this fail more catastrophically than Trusted
Editing?
3. The 2024 paper assumes U can see the protocol. Design a protocol that hides from U
which outputs are being audited. What does this protocol require from the deployment
infrastructure?
4. Read Greenblatt et al. 2024 Section 7 (collusion). Propose a collusion-resistance mea-
sure and explain its expected usefulness cost.
AIENGINEERINGFROMSCRATCH.COM 172

AI CONTROL — SAFETY DESPITE SUBVERSION
5. Articulate a control safety case for a deployment that uses U = GPT-4-class, T = GPT-
3.5-class, H = 1% of outputs audited. Identify the single strongest assumption the case
depends on.
Key Terms
Term What people say What it actually means
AI Control “safety under subversion” Protocol design that bounds unacceptable
outcomes under a worst-case U
Untrusted “the strong model” The capable model we want to extract work
model (U) from but do not trust
Trusted “the weak model” A weaker model, known not to be
model (T) adversarial, used as editor/monitor
Trusted “the audit budget” Bounded expert labor; expensive; the
human (H) ground-truth signal
Trusted “T edits U” Protocol where T is the gate on U’s outputs;
Editing H called on ambiguous outputs
Untrusted “U monitors U” Protocol where a second U instance scores
Monitoring outputs; collusion-resistant only with extra
investment
Control “the formal argument” Written argument that a protocol bounds the
safety case adversary’s success under worst-case U
Further Reading
• Greenblatt, Shlegeris, Sachan, Roger — AI Control (arXiv:2312.06942) — the canonical
ICML 2024 paper
• Redwood Research — Recent AI Control papers index — 2024-2025 follow-ups
• UK AISI + METR — Control safety cases — operationalization for frontier labs
• Hubinger et al. — Sleeper Agents (Lesson 7, arXiv:2401.05566) — the threat model con-
trol assumes
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/18-ethics-safety-alignment/10-ai-control-subversion
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/18-ethics-safety-alignment/10-ai-control-subversion/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/18-ethics-safety-alignment/10-ai-control-subversion
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 173