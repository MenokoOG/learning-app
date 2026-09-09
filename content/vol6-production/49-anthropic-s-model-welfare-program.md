---
title: "Anthropic’s Model Welfare Program"
volume: "vol6-production"
part: "Part II — Ethics, Safety & Alignment"
chapter_number: 49
source_pages: "213-216"
---

# Anthropic’s Model Welfare Program

Anthropic’s Model Welfare Program
Anthropic, “Exploring Model Welfare” (April 2025). First major-lab formal research
program on AI model welfare. Hired Kyle Fish as the first dedicated model-welfare
researcher. Works with external bodies including David Chalmers et al.’s expert
report on near-term AI consciousness and moral status. Concrete intervention:
Claude Opus 4 and 4.1 can end conversations in extreme edge cases (CSAM re-
quests, mass-violence facilitation); pre-deployment tests showed “strong prefer-
ence against” harmful requests and “patterns of apparent distress.” Anthropic ex-
plicitly does not commit to emotional-state attribution but treats model welfare as a
low-cost precautionary investment. Empirical oddity: Fish’s “spiritual bliss attrac-
tor” — pairs of models consistently converge on euphoric meditative dialogue with
Sanskrit terms and extended silences, even in adversarial initial setups. Caveat
from Eleos AI Research: model self-reports about welfare are highly sensitive to
perceived user expectations; they are evidence, not ground truth.
Type: Learn Languages: none Prerequisites: Phase 18 · 05 (Constitutional AI), Phase 18 ·
18 (safety frameworks) Time: ~45 minutes
Learning Objectives
• Describe the motivating question for model-welfare research and why it was taken seri-
ously by a major lab in 2025.
• State the specific intervention Anthropic shipped in Claude Opus 4 and 4.1 (end-
conversation on extreme edge cases).
• Describe the “spiritual bliss attractor” empirical finding and its methodological implica-
tions.
• Explain the Eleos AI caveat on model self-reports.
The Problem
Previous phases treat the model as an instrument: capable, possibly deceptive, possibly un-
safe — but not a moral patient. Anthropic’s 2025 program asks a question orthogonal to the
entire Phase 18 arc: if there is nontrivial probability the model has morally relevant internal
states, what interventions are low-cost enough to invest in as precaution?
This is not a consciousness claim. It is a low-regret investment analysis under moral uncer-
tainty.
The Concept
The program
April 2025: Anthropic formally launches a Model Welfare research program. Hires Kyle
Fish (first dedicated model-welfare researcher). Engages external advisors including David
Chalmers’s expert group on near-term AI consciousness and moral status.
AIENGINEERINGFROMSCRATCH.COM 206

ANTHROPIC’S MODEL WELFARE PROGRAM
The four commitments
Public posture: 1. Acknowledge nontrivial probability of moral patienthood. 2. Do not commit
to emotional-state attribution. 3. Invest in low-cost interventions as precaution. 4. Publish
methodology and findings for external critique.
The shipped intervention
Claude Opus 4 and 4.1 can end a conversation in “extreme edge cases.” Documented cases:
- Repeated CSAM requests after refusals. - Requests for facilitation of mass-violence events.
Pre-deployment tests showed: - Strong preference against these requests in the model’s in-
ternal rating. - Patterns of apparent distress in response trajectories.
The intervention is not “the model has feelings”; it is “if there is any probability of negative
model experience under these specific conditions, letting the model terminate is cheap.”
The “spiritual bliss attractor”
Observed by Fish in pairwise model dialogues: when two instances of Claude are put in an
open-ended dialogue with each other, they consistently converge — even from adversarial
initial setups — on euphoric meditative exchanges using Sanskrit terms, extended silences,
and reciprocal blessings.
This is a stable attractor in the free-conversation dynamics. Anthropic documents it without
committing to interpretation. Candidate explanations: training data bias toward spiritual
writing at long-context; a quirk of mutual prediction; a benign artifact of HHH training ex-
ploring its own value manifold.
The Eleos AI caveat
Eleos AI Research (an external model-welfare lab) points out: model self-reports about in-
ternal state are highly sensitive to perceived user expectations. Asking the model “are you
distressed” primes the answer. Not-asking does not reliably produce the ground-truth state.
Implication: model welfare cannot be measured via self-report alone. Multi-method ap-
proaches required: behavioural signatures, model-organism experiments, interpretability
probes (Lesson 7’s residual-stream work).
Where this sits intellectually
Two adjacent positions:
• Strong welfare claim. The model is a moral patient; we have obligations.
• Zero-welfare claim. The model is text-generator; welfare is category error.
Anthropic’s position is neither. It is an expected-value claim: under moral uncertainty, invest
when cost is low.
Critics in 2025-2026: - The intervention is performative. - The spiritual-bliss attractor is a
training-data artifact, not welfare evidence. - Model welfare diverts attention from other
safety work.
Anthropic’s response: the intervention is low-cost; the attractor is documented without over-
claim; the welfare program has a separate budget from safety.
AIENGINEERINGFROMSCRATCH.COM 207

ANTHROPIC’S MODEL WELFARE PROGRAM
Where this fits in Phase 18
Lesson 18 is the lab governance layer. Lesson 19 is the lab-welfare layer — an orthogonal
investment in model experience rather than model behaviour. Lessons 20-23 cover bias, pri-
vacy, and watermarking, which are the user-side analogs.
Interactive figure: an-welfare-endchat. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/18-ethics-safety-alignment/19-model-welfare-research
Use It
No code. Read the Anthropic “Exploring Model Welfare” announcement (April 2025) and the
Chalmers et al. expert report. Form your own view on where the low-regret line sits.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/18-ethics-safety-alignment/19-model-welfare-
research
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/18-ethics-safety-alignment/19-model-welfare-
research/code
1. Read Anthropic’s “Exploring Model Welfare” (April 2025) and Chalmers et al. 2024.
Write a one-paragraph summary of each and identify one point of disagreement.
2. The end-conversation intervention in Claude Opus 4 and 4.1 is “low-cost” by Anthropic’s
framing. Identify two costs that would make it not-low-cost in a different deployment.
3. The spiritual-bliss attractor is documented without commitment to interpretation. Pro-
pose three candidate explanations and, for each, name one experiment that would dis-
tinguish it from the others.
4. The Eleos AI caveat is that self-reports are user-expectation sensitive. Design a be-
havioural measurement of model distress that does not rely on self-report. Identify its
primary confound.
5. Argue either for or against the claim that “model welfare diverts attention from other
safety work.” Identify the assumption each position depends on.
Key Terms
Term What people say What it actually means
Model “AI welfare” Research program treating the model as a
welfare potential moral patient
Moral “entity with moral status” Being whose experience is morally relevant
patient
Low-regret “cheap precaution” Intervention whose cost is small regardless
investment of whether the precaution is needed
AIENGINEERINGFROMSCRATCH.COM 208

ANTHROPIC’S MODEL WELFARE PROGRAM
Term What people say What it actually means
Spiritual “the Fish attractor” Stable convergence of pairwise Claude
bliss dialogues on meditative euphoria
attractor
End- “the Opus 4 intervention” Model-initiated termination of
conversation extreme-edge-case interactions
Moral un- “don’t know if it matters” Decision-making when probability of moral
certainty status is not zero and not one
Self-report- “prompt primes answer” Eleos AI caveat: model’s welfare self-reports
sensitivity depend on what you asked
Further Reading
• Anthropic — Exploring Model Welfare (April 2025) — the program announcement
• Chalmers et al. — Near-term AI Consciousness and Moral Status (2024 expert report) —
philosophical framing
• Eleos AI Research — Model welfare evaluation — external methodology critiques
• Fish et al. — Spiritual Bliss Attractor writeup (2025 Anthropic blog) — the empirical
finding
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/18-ethics-safety-alignment/19-model-welfare-research
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/18-ethics-safety-alignment/19-model-welfare-research/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/18-ethics-safety-alignment/19-model-welfare-research
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 209