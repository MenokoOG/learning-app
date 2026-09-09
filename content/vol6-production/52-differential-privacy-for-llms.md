---
title: "Differential Privacy for LLMs"
volume: "vol6-production"
part: "Part II — Ethics, Safety & Alignment"
chapter_number: 52
source_pages: "225-228"
---

# Differential Privacy for LLMs

Differential Privacy for LLMs
DP-SGD remains the standard — noise-injected gradient updates provide formal (ep-
silon, delta) guarantees. Overhead in compute, memory, and utility is substantial;
parameter-efficient DP fine-tuning (LoRA + DP-SGD) is the common 2025 config-
uration (ACM 2025). Two bodies of evidence in tension: canary-based member-
ship inference (Duan et al., 2024) reports limited success against language models;
training-data extraction (Carlini et al., 2021; Nasr et al., 2025) recovers substantial
verbatim memorization. Resolution (arXiv:2503.06808, March 2025): the gap is
in what is measured — inserted canaries vs “most extractable” data. New canary
designs enable loss-based MIA without shadow models and yield the first nontrivial
DP audit of an LLM trained on real data with realistic DP guarantees. Alterna-
tives: PMixED (arXiv:2403.15638) — private prediction at inference time via mix-
ture of experts on next-token distributions; DP synthetic data generation (Google
Research 2024). Emerging attack: Differential Privacy Reversal via LLM Feedback
— confidence-score leakage.
Type: Build Languages: Python (stdlib, DP-SGD noise-injection and ε-δ accountant demon-
stration) Prerequisites: Phase 01 · 09 (information theory), Phase 10 · 01 (large-model train-
ing) Time: ~60 minutes
Learning Objectives
• Define (epsilon, delta)-differential privacy and state the DP-SGD recipe.
• Explain the 2024-2025 tension: canary MIA vs training-data extraction give different
pictures.
• Describe PMixED and why inference-time private prediction is an alternative to DP train-
ing.
• Describe the Differential Privacy Reversal via LLM Feedback attack.
The Problem
LLMs memorize. Carlini et al. 2021 showed production language models reproduce verbatim
training text on demand. DP is the formal defense: train so that the output is provably insen-
sitive to any single training example. The 2024-2025 evidence shows DP-SGD is necessary
but the deployed ε values may not match the threat model.
The Concept
(ε, δ)-differential privacy
A randomized algorithm M is (ε, δ)-DP if for any two datasets differing in one example and
any event S: P(M(D) in S) <= e^ε * P(M(D’) in S) + δ.
Interpretation: the output distribution is close enough (parametrized by ε) that the contribu-
tion of any single individual cannot be reliably inferred, except with probability δ.
AIENGINEERINGFROMSCRATCH.COM 218

DIFFERENTIAL PRIVACY FOR LLMS
DP-SGD
Abadi et al. 2016. The standard recipe: 1. Sample a mini-batch. 2. Compute per-example
gradients. 3. Clip each per-example gradient to a threshold C. 4. Sum the clipped gradients
and add Gaussian noise with std σ * C. 5. Use the noisy sum to update parameters.
Privacy cost is tracked by an accountant (Moments Accountant, Rényi DP accountant). Re-
ported ε values in the LLM literature vary widely by threat model, data sensitivity, and utility
target; there is no universally “safe” default ε. Published examples span roughly ε ≈ 1–10 in
some LLM training settings, but these are illustrative — not recommended defaults. Lower ε
generally requires more noise and can increase utility loss.
LoRA + DP-SGD
Full DP-SGD of a frontier model is prohibitive. LoRA (Hu et al. 2022) limits gradient updates
to a small adapter, reducing per-example gradient storage. LoRA + DP-SGD is the common
2025 configuration. DP guarantees apply to the adapter; the base model is held fixed.
The 2024-2025 tension
Two lines of evidence:
• Canary MIA (Duan et al. 2024). Insert unique canaries into training data, measure
whether a membership-inference attacker can identify them. Reports limited success on
language models. Suggests MIA is hard.
• Training-data extraction (Carlini 2021, Nasr et al. 2025). Prompt the model with
a prefix; measure whether it recovers verbatim text from training. Reports substantial
memorization. Suggests MIA is easy in the relevant sense.
March 2025 resolution (arXiv:2503.06808): the two measure different things. MIA asks “is
example e in D?” on inserted canaries. Extraction asks “what can I recover of D?” The “most
extractable” example is what matters for privacy; canaries under-report this because they
are not optimized to be extractable.
New canary designs. Loss-based MIA without shadow models. First nontrivial DP audit of an
LLM on real data with realistic DP guarantees.
Alternatives to DP training
• PMixED (arXiv:2403.15638). Private prediction at inference time. Mixture of experts
on next-token distributions; each expert sees a shard of training data; aggregation adds
noise for DP. Avoids DP training entirely.
• DP synthetic data generation (Google Research 2024). LoRA-fine-tune with DP-
SGD, sample synthetic data, train a downstream classifier on the synthetic data.
Both sidestep the utility cost of full DP training at the cost of a different threat model.
Differential Privacy Reversal via LLM Feedback
Emerging 2025 attack. Use a DP-trained model’s confidence scores as an oracle to re-identify
individuals. Even when outputs do not leak, confidence distributions can.
The defense: do not expose confidences, or truncate/quantize them before exposure. This is
an additional requirement beyond (ε, δ)-DP training.
AIENGINEERINGFROMSCRATCH.COM 219

DIFFERENTIAL PRIVACY FOR LLMS
Where this fits in Phase 18
Lessons 20-21 are bias/fairness. Lesson 22 is privacy. Lesson 23 is provenance via water-
marking. Lesson 27 covers the regulatory data-provenance layer.
Interactive figure: an-dp-clip-noise. This one moves. Watch it animate and drag its con-
trols in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/18-
ethics-safety-alignment/22-differential-privacy-for-llms
Use It
code/main.py simulates DP-SGD on a toy binary-classification dataset. You can sweep the
noise multiplier σ and the clipping norm C and track the (ε, δ) budget and the accuracy cost.
A “canary attack” inserts a unique training example and measures whether a log-loss test can
detect it before and after DP.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/18-ethics-safety-alignment/22-differential-
privacy-for-llms
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/18-ethics-safety-alignment/22-differential-
privacy-for-llms/code
1. Run code/main.py. Sweep σ in {0.5, 1.0, 2.0} and report the (ε, δ)-accuracy trade-off.
Identify the point at which utility collapses.
2. Implement a canary insertion and a log-loss test. Measure detection rate before and
after DP-SGD at σ = 1.0.
3. Read Nasr et al. 2025 on training-data extraction. Why does extraction success not
collapse under moderate ε? What does this imply about MIA-as-evaluation?
4. Design a deployment using PMixED (arXiv:2403.15638) that operates entirely at infer-
ence time. What is the threat model that PMixED addresses that DP-SGD does not?
5. Sketch the DP Reversal via LLM Feedback attack. Design a countermeasure that limits
confidence-score leakage and estimate its deployment cost.
Key Terms
Term What people say What it actually means
DP “(ε, δ)-differential privacy” Formal privacy: output distribution close
under neighbouring-dataset change
DP-SGD “noise-injected SGD” Gradient clipping + Gaussian noise addition;
standard DP training
LoRA + “efficient private fine-tune” DP-SGD on low-rank adapters; standard
DP-SGD 2025 configuration
MIA “membership inference” Attack that determines whether an example
was in training data
AIENGINEERINGFROMSCRATCH.COM 220

DIFFERENTIAL PRIVACY FOR LLMS
Term What people say What it actually means
Canary “inserted watermark example” Unique training example used to measure
DP leakage
PMixED “private inference mixture” Inference-time DP via mixture-of-experts on
next-token distributions
DP “confidence leakage attack” Attack that uses a model’s confidence as an
Reversal oracle for re-identification
Further Reading
• Abadi et al. — DP-SGD (arXiv:1607.00133) — the standard DP training algorithm
• Carlini et al. — Extracting Training Data (arXiv:2012.07805) — the canonical extraction
paper
• Duan et al. — Canary MIA on LLMs (arXiv:2402.07841, 2024) — limited-success MIA
• Kowalczyk et al. — Auditing DP for LLMs (arXiv:2503.06808, March 2025) — resolution
of the tension
• PMixED (arXiv:2403.15638) — inference-time private prediction
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/18-ethics-safety-alignment/22-differential-privacy-for-llms
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/18-ethics-safety-alignment/22-differential-privacy-for-llms/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/18-ethics-safety-alignment/22-differential-privacy-for-llms
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 221