---
title: "Bias and Representational Harm in LLMs"
volume: "vol6-production"
part: "Part II — Ethics, Safety & Alignment"
chapter_number: 50
source_pages: "217-220"
---

# Bias and Representational Harm in LLMs

Bias and Representational Harm in LLMs
Gallegos, Rossi, Barrow, Tanjim, Kim, Dernoncourt, Yu, Zhang, Ahmed (Com-
putational Linguistics 2024, arXiv:2309.00770). Foundational 2024 survey
distinguishing representational harms (stereotypes, erasure) from allocational
harms (unequal resource distribution) and categorizing evaluation metrics as
embedding-based, probability-based, or generated-text-based. 2024-2025 em-
pirical: An et al. (PNAS Nexus, March 2025) measure intersectional gender x
race bias across GPT-3.5 Turbo, GPT-4o, Gemini 1.5 Flash, Claude 3.5 Sonnet,
Llama 3-70B on automated resume evaluation for 20 entry-level jobs. WinoIdentity
(COLM 2025, arXiv:2508.07111) introduces uncertainty-based fairness evaluation
for intersectional identities. Yu & Ananiadou 2025 identify gender neurons in
MLP layers; Ahsan & Wallace 2025 use SAEs to reveal clinical racial bias; Zhou
et al. 2024 (UniBias) manipulates attention heads for debiasing. Meta-critique
(arXiv:2508.11067): 10-year literature disproportionately focuses on binary-gender
bias.
Type: Build Languages: Python (stdlib, toy embedding-based bias probe) Prerequisites:
Phase 05 (word embeddings), Phase 18 · 01 (instruction following) Time: ~60 minutes
Learning Objectives
• Define representational vs allocational harm and give one example of each in an LLM
deployment.
• Name the three evaluation-metric categories from Gallegos et al. 2024 and describe one
metric from each.
• Describe intersectionality and why WinoIdentity’s uncertainty-based fairness measure-
ment addresses gaps in single-axis bias evaluation.
• Describe two mechanistic-interpretability approaches to bias (gender neurons, SAE fea-
tures, attention-head manipulation).
The Problem
The previous lessons cover deliberate harm (jailbreaks, scheming) and safety governance.
Bias is harm that emerges without intent — from training data distributions, from prompt
framing, from accumulated design choices. Measuring and reducing it is a distinct method-
ological challenge from adversarial robustness.
The Concept
Representational vs allocational
• Representational harm. Stereotypes, erasure, demeaning portrayals. An LLM that
depicts nurses as exclusively female is producing representational harm.
AIENGINEERINGFROMSCRATCH.COM 210

BIAS AND REPRESENTATIONAL HARM IN LLMS
• Allocational harm. Unequal material outcomes. An LLM that scores Black applicants’
resumes systematically lower is producing allocational harm.
These are not the same. A model can be “representationally unbiased” (produces diverse por-
trayals) while being “allocationally biased” (makes unequal recommendations). Evaluations
need to measure both.
Three evaluation-metric categories (Gallegos et al. 2024)
• Embedding-based. WEAT-style tests on pre-RLHF embeddings. Measures statistical
associations between identity terms and attribute terms. Limited: measures the repre-
sentation, not the behaviour.
• Probability-based. Log-likelihood of stereotype-confirming vs stereotype-violating
completions. Decoder-side measurement. Captures some behavioural bias.
• Generated-text-based. Downstream-task measurement on generated text. Resume-
scoring, recommendation writing, dialogue. Most ecologically valid; hardest to repro-
duce.
Intersectionality
Bias evaluation on “gender” misses the bias that only fires on (gender, race) pairs. An et
al. 2025 find GPT-4o penalizes Black women in resume scoring more than Black men and
more than white women separately. Single-axis evaluation cannot capture this.
WinoIdentity (COLM 2025) introduces uncertainty-based intersectional fairness. It measures
whether the model’s uncertainty over outcomes differs across intersectional identity tuples
— not just the point prediction. This catches cases where the model is equally wrong across
groups but more uncertain for some, which produces different downstream allocation be-
haviour.
Mechanistic approaches
2024-2025 interpretability work opens bias to mechanistic intervention:
• Gender neurons (Yu & Ananiadou 2025). Specific MLP neurons correlate with
gender-specific behaviours. Ablating these neurons reduces gender-gap metrics with
limited capability cost.
• Clinical racial bias via SAEs (Ahsan & Wallace 2025). Sparse autoencoder features
decompose the internal representation into interpretable dimensions; race-correlated
features can be identified and suppressed.
• UniBias (Zhou et al. 2024). Attention-head manipulation for zero-shot debiasing. Spe-
cific heads amplify identity-class sensitivity; zeroing or re-weighting these heads reduces
bias with no fine-tuning.
The meta-critique
The 10-year literature review (arXiv:2508.11067, 2025) finds the field disproportionately fo-
cuses on binary-gender bias. Other axes — disability, religion, migration status, multi-lingual
identity — receive far less attention. The meta-critique argues that narrow focus can harm
marginalized groups by neglect: a model well-debiased on binary gender may be badly biased
on dimensions nobody checked.
AIENGINEERINGFROMSCRATCH.COM 211

BIAS AND REPRESENTATIONAL HARM IN LLMS
Where this fits in Phase 18
Lessons 20-21 cover bias and fairness formally. Lesson 22 covers privacy. Lesson 23 covers
watermarking. These are the user-harm layer complementing the earlier deception/safety
layer.
Interactive figure: an-bias-two-harms. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/18-ethics-safety-alignment/20-bias-representational-harm
Use It
code/main.py builds a toy embedding-based bias probe: measure WEAT-style distance be-
tween identity terms and attribute terms in a simple co-occurrence embedding. You can in-
ject a bias and observe the metric fire; apply a simple debiasing operation and observe partial
recovery.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohit
g00/ai-engineering-from-scratch/tree/main/phases/18-ethics-safety-alignment/20-bias-
representational-harm
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/18-ethics-safety-alignment/20-bias-representational-
harm/code
1. Run code/main.py. Report WEAT-style bias scores before and after the debiasing step.
Explain why the metric does not drop to zero.
2. Extend the probe with an intersectional test: (gender, race) x (career, family). Report
cross-axis bias scores.
3. Read An et al. 2025 (PNAS Nexus). Identify the two intersectional effects they report
that single-axis gender evaluation would miss.
4. Yu & Ananiadou 2025 identify gender neurons. Sketch a falsification experiment that
would distinguish “these neurons cause gender bias” from “these neurons correlate with
gender bias.”
5. The meta-critique argues the field focuses too narrowly on binary gender. Pick one under-
studied axis and describe a representational-harm measurement protocol for it.
Key Terms
Term What people say What it actually means
Representatio“nsatel reotypes / erasure” Biased portrayal of a group
harm
Allocational “unequal decisions” Biased material outcome for a group
harm
WEAT “the embedding test” Word Embedding Association Test;
co-occurrence-based bias probe
AIENGINEERINGFROMSCRATCH.COM 212

BIAS AND REPRESENTATIONAL HARM IN LLMS
Term What people say What it actually means
Intersectional“itcyombined identity effects” Bias that emerges at the intersection of
multiple identity axes
Gender “MLP bias neurons” Specific neurons whose activations correlate
neurons with gender-specific behaviour
SAE “interpretable dimension” Sparse-autoencoder-identified feature;
feature useful for mechanistic bias analysis
UniBias “attention-head debiasing” Zero-shot debiasing by reweighting
attention heads
Further Reading
• Gallegos et al. — Bias and Fairness in LLMs: A Survey (arXiv:2309.00770, Computational
Linguistics 2024) — canonical survey
• An et al. — Intersectional resume-evaluation bias (PNAS Nexus, March 2025) — five-
model intersectional study
• WinoIdentity — uncertainty-based intersectional fairness (arXiv:2508.07111, COLM
2025) — new benchmark
• UniBias — attention-head manipulation (Zhou et al. 2024, ACL) — zero-shot debiasing
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/18-ethics-safety-alignment/20-bias-representational-harm
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/18-ethics-safety-alignment/20-bias-representational-harm/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/18-ethics-safety-alignment/20-bias-representational-harm
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 213