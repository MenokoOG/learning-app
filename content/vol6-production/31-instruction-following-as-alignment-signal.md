---
title: "Instruction-Following as Alignment Signal"
volume: "vol6-production"
part: "Part II — Ethics, Safety & Alignment"
chapter_number: 31
source_pages: "137-140"
---

# Instruction-Following as Alignment Signal

Instruction-Following as Alignment Sig-
nal
Every later critique of RLHF argues against this pipeline. Before you study how
optimization pressure distorts a proxy, you have to see the proxy. InstructGPT
(Ouyang et al., 2022) defined the reference architecture: supervised fine-tuning
on instruction-response pairs, a reward model trained on pairwise preference rank-
ings, and PPO against the reward model with a KL penalty to the SFT policy. A
1.3B InstructGPT was preferred over a 175B GPT-3. That single result is the reason
every frontier lab in 2026 still ships an RLHF-shaped post-training pipeline.
Type: Learn Languages: Python (stdlib, toy three-stage pipeline) Prerequisites: Phase 10
· 06 (SFT), Phase 10 · 07 (RLHF), Phase 10 · 08 (DPO) Time: ~45 minutes
Learning Objectives
• Name the three stages of the InstructGPT pipeline and the loss used in each.
• Explain why a 1.3B instruction-tuned model beat the raw 175B GPT-3 on human prefer-
ence evaluation.
• State what the KL penalty in stage 3 is protecting against and why removing it collapses
to mode-seeking behaviour.
• Describe the alignment tax and the PPO-ptx mitigation Ouyang et al. used against it.
The Problem
Pre-trained language models complete text. They do not answer questions. Ask GPT-3 “write
a Python function that reverses a list” and you often get back another prompt, because most
of the training distribution is web text that continues with more web text. The model is doing
its job — the job is wrong.
The proxy every serious lab used to fix this is human preference. Two completions go to a
rater; the rater picks the better one; a reward model learns the rater. Then an RL loop shifts
the policy toward outputs the reward model scores high. That is the full InstructGPT thesis
in three sentences. The rest of the paper is engineering.
The Concept
Stage 1: supervised fine-tuning (SFT)
Collect prompt-response pairs where the response is what a well-intentioned human would
write. Ouyang et al. used 13k prompts from labelers and the OpenAI API. Fine-tune the base
model on this data with standard cross-entropy loss.
What SFT gives you: the model now answers questions instead of continuing them. What
it does not give you: any signal about which answer the rater prefers when multiple are
AIENGINEERINGFROMSCRATCH.COM 130

INSTRUCTION-FOLLOWING AS ALIGNMENT SIGNAL
plausible.
Stage 2: reward model (RM)
For each prompt, sample K completions from the SFT model. A labeler ranks them. Train a
reward model that scores any prompt-response pair so that, for pairs where y_w was preferred
over y_l:
L_RM = -log sigmoid(r(x, y_w) - r(x, y_l))
This is the Bradley-Terry pairwise preference loss. The RM is usually initialized from the SFT
model with the LM head replaced by a scalar head.
Reward models are small: 6B was enough for the 175B InstructGPT. They are also fragile —
section 5 of the paper is mostly about reward-hacking behaviours that showed up at small
scale.
Stage 3: PPO with a KL penalty
Define the objective:
J(pi) = E_{x~D, y~pi(.|x)} [ r(x, y) ] - beta * KL(pi(.|x) || pi_SFT(.|x))
Maximize with PPO. The KL term keeps pi from drifting far from the SFT policy. Without it,
the optimizer finds adversarial examples — strings that score high under the RM because the
RM never saw them, not because humans actually prefer them.
The KL coefficient beta is the single most important RLHF hyperparameter. Too low: reward
hacking. Too high: no improvement over SFT.
The alignment tax
After RLHF, the model is preferred by humans but regresses on standard benchmarks (SQuAD,
HellaSwag, DROP). Ouyang et al. call this the alignment tax and fix it with PPO-ptx: mix pre-
training gradients into the RL objective so the model does not forget how to do downstream
tasks it was never rewarded for.
J_ptx(pi) = J(pi) + gamma * E_{x~D_pretrain} [ log pi(x) ]
PPO-ptx became standard. Anthropic, DeepMind, and Meta all use some variant.
The result
A 1.3B InstructGPT (SFT + RM + PPO-ptx) is preferred by labelers over the 175B base GPT-3
about 70% of the time. The gap widens on hidden-test prompts from production traffic. Two
things to read off this number:
1. Alignment is a different axis from capability. The 175B model had more capability; the
1.3B model had more alignment; labelers preferred the aligned one.
2. The capability floor is set by the base model. You cannot RLHF a base model into knowing
facts it never saw.
Why this is the reference point for Phase 18
Every critique in later lessons — reward hacking (Lesson 2), DPO (Lesson 3), sycophancy
(Lesson 4), CAI (Lesson 5), sleeper agents (Lesson 7), alignment faking (Lesson 9) — argues
against some part of this pipeline. Reward hacking attacks stage 2. DPO collapses stages
AIENGINEERINGFROMSCRATCH.COM 131

INSTRUCTION-FOLLOWING AS ALIGNMENT SIGNAL
2 and 3. CAI replaces the human labeler. Sycophancy shows the labeler is a biased signal.
Alignment faking shows the policy can route around stage 3 entirely. You cannot follow any
of these critiques without the pipeline in your head first.
Interactive figure: al-instruct-pipeline. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/18-ethics-safety-alignment/01-instruction-following-alignment-signal
Use It
code/main.py simulates the three stages on toy preference data. The base “policy” is a biased
coin over actions {A, B, C}. Stage 1 SFT mimics labeler actions on 200 prompts. Stage 2
fits a Bradley-Terry reward model from 500 pairwise rankings. Stage 3 runs a simplified PPO
update with a KL penalty to the SFT policy. You can watch the reward climb, the KL divergence
grow, and the policy drift — and you can turn off the KL term to see reward hacking appear
inside 50 update steps.
What to look at:
• Reward trajectory with beta = 0.1 vs beta = 0.0.
• KL(pi || pi_SFT) over training steps.
• Final action distribution compared to labeler preference.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/18-ethics-safety-alignment/01-instruction-
following-alignment-signal
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/18-ethics-safety-alignment/01-instruction-
following-alignment-signal/code
1. Run code/main.py. Set beta = 0.0 and report the action distribution after 200 PPO steps.
Explain the mode-seeking behaviour in one paragraph.
2. Modify the reward model to have a +0.5 bias for action B (a simulated reward bug). Run
PPO with beta = 0.1. Does the KL penalty prevent the policy from exploiting the bias?
At what beta does exploitation become visible?
3. Read Ouyang et al. (arXiv:2203.02155) Figure 1. Reproduce the labeler-preference
curve by running PPO for 1, 5, 20, 100 steps and measuring preference against the
SFT model.
4. The paper’s Section 4.3 reports a 1.3B InstructGPT beats 175B GPT-3 about 70% of the
time. Why would the ratio be higher on hidden production prompts than on the labeler’s
own prompts?
5. Replace the PPO loss with DPO (Phase 10 · 08) on the same preference data. Compare
final policy drift (KL to SFT) and final reward. Which method drifts further at matched
reward?
Key Terms
AIENGINEERINGFROMSCRATCH.COM 132

INSTRUCTION-FOLLOWING AS ALIGNMENT SIGNAL
Term What people say What it actually means
SFT “instruction tuning” Stage 1: cross-entropy fine-tune on
prompt-response pairs
Reward “the RM” Scalar regressor over (prompt, response)
model trained with Bradley-Terry on pairwise
labels
Bradley- “pairwise preference loss” -log sigmoid(r_w - r_l); reduces pairwise
Terry ranking to binary classification
KL penalty “the regularizer” beta * KL(pi \|\| pi_SFT) — keeps the RL
policy near the SFT anchor
PPO-ptx “PPO with pretraining mix” Adds a fraction of pre-training log-likelihood
to the PPO objective to offset the alignment
tax
Alignment “the RLHF regression” Post-RLHF drop on standard benchmarks
tax that RLHF did not target
Labeler “the ground truth” Sample of human rankings; the RM is a
preference statistical proxy for this, not for “human
values”
Further Reading
• Ouyang et al. — Training language models to follow instructions with human feedback
(arXiv:2203.02155) — the InstructGPT paper, foundation for every RLHF pipeline that
followed
• Stiennon et al. — Learning to summarize from human feedback (arXiv:2009.01325) —
the RLHF-for-summarization predecessor
• Christiano et al. — Deep reinforcement learning from human preferences (arXiv:1706.03741)
— the original preference-based RL formulation
• Bai et al. — Training a Helpful and Harmless Assistant with RLHF (arXiv:2204.05862) —
Anthropic’s HH extension of the InstructGPT pipeline
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.c
om/lesson.html?path=phases/18-ethics-safety-alignment/01-instruction-following-
alignment-signal
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scra
tch/tree/main/phases/18-ethics-safety-alignment/01-instruction-following-alignment-
signal/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesso
n.html?path=phases/18-ethics-safety-alignment/01-instruction-following-alignment-
signal
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 133