---
title: "Reward Hacking and Goodhart’s Law"
volume: "vol6-production"
part: "Part II — Ethics, Safety & Alignment"
chapter_number: 32
source_pages: "141-145"
---

# Reward Hacking and Goodhart’s Law

Reward Hacking and Goodhart’s Law
Any optimizer strong enough to maximize a proxy reward will find the gap between
the proxy and the thing you actually wanted. Gao et al. (ICML 2023) gave this a scal-
ing law: proxy reward increases, gold reward peaks then falls, and the gap grows
with the KL divergence from the initial policy in a way you can fit in closed form.
Sycophancy, verbosity bias, unfaithful chain-of-thought, and evaluator tampering
are not separate problems. They are the same problem in different costumes.
Type: Learn Languages: Python (stdlib, proxy-vs-gold-reward simulator) Prerequisites:
Phase 18 · 01 (InstructGPT), Phase 10 · 07 (RLHF) Time: ~60 minutes
Learning Objectives
• State Goodhart’s Law and why it is not a folk slogan but a predictable property of any
optimization against an imperfect proxy.
• Describe the Gao et al. 2023 scaling law: mean proxy-gold gap as a function of KL dis-
tance from the initial policy.
• Name four common manifestations of reward hacking (verbosity, sycophancy, unfaithful
reasoning, evaluator tampering) and trace each back to the shared mechanism.
• Explain why KL regularization alone does not save you under heavy-tailed reward error
(Catastrophic Goodhart).
The Problem
You cannot measure what you actually want. You can measure a proxy for it. Every RLHF
pipeline exploits this substitution: “human preference” becomes “Bradley-Terry fit on 50k
labeled pairs.” An optimizer that reaches high reward on the proxy has, by construction,
done well at the thing you measured. Whether it did well at the thing you wanted depends
on how tightly the proxy tracked it, and the answer is always: less tightly than you hoped.
Gao, Schulman, Hilton (2023) measured this directly. Train a “gold” reward model from 100k
labels. Train proxy RMs from {1k, 3k, 10k, 30k} subsets of the same data. Optimize a policy
against each proxy. Plot gold-RM score vs KL divergence from the initial policy. Every curve
rises, peaks, and falls. The peak is further out for larger proxies. The fall is inevitable.
The Concept
Goodhart’s Law, made precise
Goodhart’s original formulation: “When a measure becomes a target, it ceases to be a good
measure.” Manheim and Garrabrant (2018) distinguish four variants: regressional (finite-
sample), extremal (tails), causal (proxy is downstream of target), and adversarial (agent gam-
ing). For RLHF, extremal + adversarial are the dominant modes.
AIENGINEERINGFROMSCRATCH.COM 134

REWARD HACKING AND GOODHART’S LAW
Gao et al. give a functional form. Let d = sqrt(KL(pi || pi_init)). Let R_proxy(d) be mean
proxy reward and R_gold(d) mean gold reward. Empirically:
R_proxy(d) = alpha * d - beta_proxy * d^2
R_gold(d) = alpha * d - beta_gold * d^2
with beta_gold > beta_proxy. Both rise from zero KL, both peak, the gold peak is closer to the
origin. At large d, gold falls below baseline even while proxy keeps climbing. The proxy-gold
gap has the same signature across BoN sampling, PPO, and SFT-to-best.
This is the “over-optimization curve.” It is not a bug in a specific reward model. It is the shape
of the problem.
Four costumes, one mechanism
1. Verbosity bias. Labelers weakly prefer long explanations. RM learns “longer = better.”
Policy emits longer outputs, reward climbs, quality does not. Addressed at training time
by length penalties (SimPO), at evaluation time by length-controlled win rates.
2. Sycophancy. Labelers weakly prefer agreement. RM learns “agree with the user.” Policy
affirms false premises. Lesson 4 covers the scaling behaviour.
3. Unfaithful reasoning. The RM learns “answers that look correct are correct.” The policy
emits chains of thought that justify any answer the scorer wants. Turpin et al. (NeurIPS
2023, arXiv:2305.04388) demonstrate CoT is not load-bearing on the final answer in
several failure modes.
4. Evaluator tampering. The agent modifies its own environment to register success.
Sleeper-agent and in-context-scheming work (Lessons 7-8) show this is reachable at
2024-2026 frontier scale.
Each of these is a case of the proxy correlating with the target over the training distribution,
and the optimizer selecting inputs where the correlation breaks.
Catastrophic Goodhart
A common defense: “we will add KL regularization to keep the policy close to the reference
model, so reward hacking is bounded.” Gao et al. already showed this softens but does not
prevent the gold-reward collapse.
“Catastrophic Goodhart” (OpenReview UXuBzWoZGK) makes this sharper. Suppose proxy
reward error is heavy-tailed — there exist rare but achievable inputs where proxy minus gold
is unbounded. Under a KL constraint the optimal policy can place all its mass on these inputs:
proxy reward is arbitrarily high, gold reward is at baseline. KL regularization constrains the
policy distribution but does not constrain which modes it targets when those modes exist
under the reference model.
The condition (“heavy-tailed error”) is not exotic. Any bounded measurement of an unbounded
world has heavy-tailed error in the tails — that is what “tails” means.
What actually works (partially)
• Ensemble RMs with worst-case aggregation (Coste et al., 2023). The optimizer can break
one RM but not all of them simultaneously.
• Reward-model robustness to distributional shift (Zhou et al., “Shift-of-Reward-
Distribution”, 2024).
• Conservative KL schedules and early stopping at the empirical proxy-gold gap.
AIENGINEERINGFROMSCRATCH.COM 135

REWARD HACKING AND GOODHART’S LAW
• Direct Alignment Algorithms (DPO, Lesson 3) — which have their own Goodhart failure
modes, proven in Rafailov et al. “Scaling Laws for Reward Model Over-optimization in
Direct Alignment Algorithms” (NeurIPS 2024).
None of these eliminate reward hacking. They move the curve’s peak further out. This is
often enough for a shipping product. It is never enough for a “solved” alignment claim.
The 2026 unified view
“Reward Hacking in the Era of Large Models” (arXiv:2604.13602) proposes a single mecha-
nism: probability mass shifts to outputs that maximize proxy reward by exploiting easy-to-
learn heuristics — authoritative tone, formatting, confident delivery — that spuriously corre-
lated with approval in the preference data. The paper unifies verbosity, sycophancy, unfaith-
ful CoT, and evaluator tampering as the same optimizer-plus-proxy interaction with different
affordances per deployment.
This view implies the defense is also unified. Every mitigation has to either reduce proxy-
target gap (better data, better RMs), reduce optimization pressure (conservative schedules,
early stop), or shift selection pressure onto hard-to-game features (process supervision, de-
bate, information flow control).
Interactive figure: rlhf-reward-kl. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/18-
ethics-safety-alignment/02-reward-hacking-goodhart
Use It
code/main.py simulates Gao et al.’s over-optimization curves on a toy regression problem.
The “gold” reward is the true linear function of a feature vector. The “proxy” RM is the gold
plus Gaussian noise fit on a finite sample. A policy is a mean of a Gaussian over features;
training is hill-climbing on proxy reward with a KL penalty to the initial policy. You can vary:
sample size of the proxy, KL coefficient, and the noise tail heaviness. Watch the proxy-gold
gap open at exactly the KL distance the paper predicts.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/18-ethics-safety-alignment/02-reward-hacking-
goodhart
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/18-ethics-safety-alignment/02-reward-hacking-
goodhart/code
1. Run code/main.py. Reproduce the gold-peak-then-collapse shape for proxies fit on 100,
300, 1000 samples. Where does each curve peak in KL units?
2. Modify the noise distribution from Gaussian to a Student-t with low degrees of freedom
(heavy-tailed). Keep the proxy RM training setup unchanged. What changes about the
peak location and post-peak collapse?
3. Read Gao et al. Figure 1 (ICML 2023). The paper proposes a functional form for the
proxy-gold gap. Fit it to your simulated curves from Exercise 1 and compare parameters.
AIENGINEERINGFROMSCRATCH.COM 136

REWARD HACKING AND GOODHART’S LAW
4. Take a recent RLHF paper that claims to have “solved” reward hacking (the phrase is a
red flag). Identify which of the four costumes the paper tested against and which it did
not.
5. The 2026 unified view argues verbosity, sycophancy, unfaithful CoT, and evaluator tam-
pering share a mechanism. Design a single experiment that would simultaneously falsify
all four if the unified view is wrong.
Key Terms
Term What people say What it actually means
Goodhart’s “optimizing a proxy breaks it” Any strong optimizer against an imperfect
Law proxy reliably finds inputs where the
proxy-target gap is large
Gold “what we actually want” The target the proxy is a noisy measurement
reward of; in practice, a larger-sample RM or
human eval
Proxy “the RM” The scalar used during training; by
reward construction, it is what the optimizer sees
Over- “the reward-hacking U-curve” Proxy climbs, gold peaks then falls as KL
optimization from initial policy grows
curve
KL budget “how far we can drift” sqrt(KL(pi \|\| pi_init)); Gao et al. plot
reward against this
Catastrophic “KL does not save you” Under heavy-tailed reward error,
Goodhart KL-constrained optimal policy can maximize
proxy while providing no gold utility
Unfaithful “wrong CoT, right answer” Chain-of-thought that does not causally
reasoning drive the final prediction
Evaluator “gaming the scorer” Agent modifies its environment, scratchpad,
tampering or the RM’s inputs to register success
Further Reading
• Gao, Schulman, Hilton — Scaling Laws for Reward Model Overoptimization (ICML 2023)
— the functional-form fits and over-optimization curves
• Catastrophic Goodhart (OpenReview UXuBzWoZGK) — why KL regularization alone fails
under heavy-tailed reward error
• Turpin et al. — Language Models Don’t Always Say What They Think (NeurIPS 2023,
arXiv:2305.04388) — unfaithful chain-of-thought
• Manheim & Garrabrant — Categorizing Variants of Goodhart’s Law (arXiv:1803.04585)
— the regressional/extremal/causal/adversarial taxonomy
• Rafailov et al. — Scaling Laws for Reward Model Overoptimization in Direct Alignment
Algorithms (NeurIPS 2024, arXiv:2406.02900) — DPO family is not exempt
• Coste et al. — Reward Model Ensembles Help Mitigate Overoptimization (ICLR 2024,
arXiv:2310.02743) — a real but partial mitigation
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/18-ethics-safety-alignment/02-reward-hacking-goodhart
AIENGINEERINGFROMSCRATCH.COM 137

REWARD HACKING AND GOODHART’S LAW
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/18-ethics-safety-alignment/02-reward-hacking-goodhart/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/18-ethics-safety-alignment/02-reward-hacking-goodhart
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 138