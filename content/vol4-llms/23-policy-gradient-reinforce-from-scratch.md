---
title: "Policy Gradient — REINFORCE from Scratch"
volume: "vol4-llms"
part: "Part II — Reinforcement Learning"
chapter_number: 23
source_pages: "120-125"
---

# Policy Gradient — REINFORCE from Scratch

Policy Gradient — REINFORCE from
Scratch
Stop estimating value. Parameterize the policy directly, compute the gradient of
expected return, step uphill. Williams (1992) wrote it in one theorem. It is why
PPO, GRPO, and every LLM RL loop exist.
Type: Build Languages: Python Prerequisites: Phase 3 · 03 (Backpropagation), Phase 9 ·
03 (Monte Carlo), Phase 9 · 04 (TD Learning) Time: ~75 minutes
The Problem
Q-learning and DQN parameterize the value function. You pick actions by argmax Q. That is
fine for discrete actions and discrete states. It breaks when actions are continuous (which
argmax over a 10-dimensional torque?) or when you want a stochastic policy (argmax is deter-
ministic by construction).
Policy gradients parameterize the policy instead. π_θ(a | s) is a neural net that outputs a
distribution over actions. Sample from it to act. Compute the gradient of expected return
with respect to θ. Step uphill. No argmax. No Bellman recursion. Just gradient ascent on
J(θ) = E_{π_θ}[G].
The REINFORCE theorem (Williams 1992) tells you this gradient is computable: ∇J(θ) = E_π[
G · ∇_θ log π_θ(a | s) ]. Run an episode. Compute the return. Multiply by ∇ log π_θ(a |
s) at every step. Average. Gradient-ascent. Done.
Every LLM-RL algorithm in 2026 — PPO, DPO, GRPO — is a refinement of REINFORCE. Un-
derstanding it in your fingers is the prerequisite for the rest of this phase, and for Phase 10 ·
07 (RLHF implementation) and Phase 10 · 08 (DPO).
The Concept
The policy gradient theorem. For any policy π_θ parameterized by θ:
∇J(θ) = E_{τ ~ π_θ}[ Σ_{t=0}^{T} G_t · ∇_θ log π_θ(a_t | s_t) ]
where G_t = Σ_{k=t}^{T} γ^{k-t} r_{k+1} is the discounted return from step t. The expec-
tation is over full trajectories τ sampled from π_θ.
The proof is short. Differentiate J(θ) = Σ_τ P(τ; θ) G(τ) under the expectation. Use ∇P(τ;
θ) = P(τ; θ) ∇ log P(τ; θ) (the log-derivative trick). Factor log P(τ; θ) = Σ log π_θ(a_t
| s_t) + environment terms that do not depend on θ. The environment terms vanish. Two
lines of algebra give you the theorem.
Variance reduction tricks. Vanilla REINFORCE has murderous variance — returns are
noisy, ∇ log π is noisy, their product is very noisy. Two standard fixes:
AIENGINEERINGFROMSCRATCH.COM 116

POLICY GRADIENT — REINFORCE FROM SCRATCH
REINFORCE — gradient ascent on expected return
policy gradient theorem
grad J(theta) = E_pi [ sum_t G_t * grad_theta log pi_theta(a_t | s_t) ]
one rollout, one update
roll out tau ~ pi_theta, compute returns G_0, G_1, ..., G_T
for each (s_t, a_t): theta += lr * (G_t - b(s_t)) * grad log pi_theta(a_t | s_t)
sample action credit assignment apply gradient
logits = f_theta(s) G_t = sum_{k>=t} g^{k-t} r_{k+1} grad log pi = e_a - p
p = softmax(logits) reward-to-go only theta += lr * adv * grad
a ~ Categorical(p) baseline: G_t - V(s_t) + entropy bonus
stochastic by design unbiased, lower variance on-policy, batched
PPO = REINFORCE + clipped IS ratio · GRPO = REINFORCE + group-relative baseline · DPO = REINFORCE without sampling
Figure 20: Policy gradient: softmax policy, log-π gradient, return-weighted update
1. Baseline subtraction. Replace G_t with G_t - b(s_t) for any baseline b(s_t) that does
not depend on a_t. Unbiased because E[b(s_t) · ∇ log π(a_t | s_t)] = 0. Typical
choice: b(s_t) = V̂(s_t) learned by a critic → actor-critic (Lesson 07).
2. Reward-to-go. Replace Σ_t G_t · ∇ log π_θ(a_t | s_t) with Σ_t G_t^{from t} ·
∇ log π_θ(a_t | s_t). Only future returns matter for a given action — past rewards
contribute zero-mean noise.
Combined, you get:
∇J ≈ (1/N) Σ_{i=1}^{N} Σ_{t=0}^{T_i} [ G_t^{(i)} - V̂(s_t^{(i)}) ] · ∇_θ log
π_θ(a_t^{(i)} | s_t^{(i)})
which is REINFORCE with a baseline — the direct ancestor of A2C (Lesson 07) and PPO
(Lesson 08).
Softmax policy parameterization. For discrete actions, the standard choice:
π_θ(a | s) = exp(f_θ(s, a)) / Σ_{a'} exp(f_θ(s, a'))
where f_θ is any neural net that outputs a score per action. The gradient has a clean form:
∇_θ log π_θ(a | s) = ∇_θ f_θ(s, a) - Σ_{a'} π_θ(a' | s) ∇_θ f_θ(s, a')
i.e., score of the taken action minus its expected value under the policy.
Gaussian policy for continuous actions. π_θ(a | s) = N(μ_θ(s), σ_θ(s)). ∇ log N(a;
μ, σ) has a closed form. That is all Phase 9 · 07’s SAC needs.
Interactive figure: policy-gradient-landscape. This one moves. Watch it animate and
drag its controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?pat
h=phases/09-reinforcement-learning/06-policy-gradients-reinforce
AIENGINEERINGFROMSCRATCH.COM 117

POLICY GRADIENT — REINFORCE FROM SCRATCH
Build It
Step 1: softmax policy network
def policy_logits(theta, state_features):
return [dot(theta[a], state_features) for a in range(N_ACTIONS)]
def softmax(logits):
m = max(logits)
exps = [exp(l - m) for l in logits]
Z = sum(exps)
return [e / Z for e in exps]
Use a linear policy (one weight vector per action) for a tabular env. For Atari, swap in a CNN
and keep the softmax head.
Step 2: sampling and log-probability
def sample_action(probs, rng):
x = rng.random()
cum = 0
for a, p in enumerate(probs):
cum += p
if x <= cum:
return a
return len(probs) - 1
def log_prob(probs, a):
return log(probs[a] + 1e-12)
Step 3: rollout with log-probs captured
def rollout(theta, env, rng, gamma):
trajectory = []
s = env.reset()
while not done:
logits = policy_logits(theta, s)
probs = softmax(logits)
a = sample_action(probs, rng)
s_next, r, done = env.step(s, a)
trajectory.append((s, a, r, probs))
s = s_next
return trajectory
Step 4: REINFORCE update
def reinforce_step(theta, trajectory, gamma, lr, baseline=0.0):
returns = compute_returns(trajectory, gamma)
for (s, a, _, probs), G in zip(trajectory, returns):
advantage = G - baseline
grad_log_pi_a = [-p for p in probs]
grad_log_pi_a[a] += 1.0
for i in range(N_ACTIONS):
AIENGINEERINGFROMSCRATCH.COM 118

POLICY GRADIENT — REINFORCE FROM SCRATCH
for j in range(len(s)):
theta[i][j] += lr * advantage * grad_log_pi_a[i] * s[j]
The gradient ∇ log π(a|s) = e_a - π(·|s) (onehot of a minus probabilities) is the heart of
softmax policy gradients. Burn it into muscle memory.
Step 5: baselines
A running mean of G over recent episodes is enough variance reduction to get a 4×4 GridWorld
running; it takes ~500 episodes to converge. Upgrade the baseline to a learned V̂(s) and you
get actor-critic.
Pitfalls
• Exploding gradients. Returns can be huge. Always normalize G to ~N(0, 1) across the
batch before multiplying by ∇ log π.
• Entropy collapse. The policy converges to a near-deterministic action too early, stops
exploring, gets stuck. Fix: add entropy bonus β · H(π(·|s)) to the objective.
• High variance. Vanilla REINFORCE needs thousands of episodes. A critic baseline
(Lesson 07) or TRPO/PPO’s trust region (Lesson 08) is the standard fix.
• Sample inefficiency. On-policy means you throw away every transition after one up-
date. Off-policy corrections via importance sampling bring back data, at the cost of
variance (PPO’s ratio is a clipped IS weight).
• Non-stationary gradients. The same gradient from 100 episodes ago uses old π. On-
policy methods update every few rollouts for this reason.
• Credit assignment. Without reward-to-go, past rewards contribute noise. Always use
reward-to-go.
Use It
In 2026, REINFORCE is rarely run directly but its gradient formula is everywhere:
Use case Derived method
Continuous control PPO / SAC with Gaussian policy
LLM RLHF PPO with KL penalty, running on token-level policy
LLM reasoning (DeepSeek) GRPO — REINFORCE with group-relative baseline,
no critic
Multi-agent Centralized-critic REINFORCE (MADDPG, COMA)
Discrete action robotics A2C, A3C, PPO
Preference-only settings DPO — REINFORCE rewritten as a
preference-likelihood loss, no sampling
When you read loss = -advantage * log_prob in a 2026 training script, that is REINFORCE
with a baseline. Entire papers (DPO, GRPO, RLOO) are variance-reduction tricks on top of
this one line.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/09-reinforcement-learning/06-policy-gradients-
reinforce
AIENGINEERINGFROMSCRATCH.COM 119

POLICY GRADIENT — REINFORCE FROM SCRATCH
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/09-reinforcement-learning/06-policy-gradients-
reinforce/code
1. Easy. Implement REINFORCE on 4×4 GridWorld with a linear softmax policy. Train for
1,000 episodes without a baseline. Plot the learning curve; measure variance (std of
returns).
2. Medium. Add a running-mean baseline. Train again. Compare sample efficiency and
variance to the vanilla run. By how much does the baseline reduce steps to convergence?
3. Hard. Add an entropy bonus β · H(π). Sweep β ∈ {0, 0.01, 0.1, 1.0}. Plot final
return and policy entropy. Where is the sweet spot on this task?
Key Terms
Term What people say What it actually means
Policy “Train the policy directly” ∇J(θ) = E[G · ∇ log π_θ(a\|s)]; derived
gradient from the log-derivative trick.
REINFORCE “The original PG algorithm” Williams (1992); Monte Carlo returns
multiplied by log-policy gradient.
Log- “Score function estimator” ∇P(τ;θ) = P(τ;θ) · ∇ log P(τ;θ); makes
derivative gradients of expectations tractable.
trick
Baseline “Variance reduction” Any b(s) subtracted from G; unbiased
because E[b · ∇ log π] = 0.
Reward-to- “Only future returns count” G_t^{from t} instead of the full G_0;
go correct and lower-variance.
Entropy “Encourage exploration” +β · H(π(·\|s)) term keeps the policy
bonus from collapsing.
On-policy “Train on what you just saw” Gradient expectation is w.r.t. the current
policy — cannot reuse old data directly.
Advantage “How much better than A(s, a) = G(s, a) - V(s); the signed
average” quantity REINFORCE-with-baseline
multiplies.
Further Reading
• Williams (1992). Simple Statistical Gradient-Following Algorithms for Connectionist Re-
inforcement Learning — the original REINFORCE paper.
• Sutton et al. (2000). Policy Gradient Methods for Reinforcement Learning with Function
Approximation — the modern policy-gradient theorem with function approximation.
• Sutton & Barto (2018). Ch. 13 — Policy Gradient Methods — textbook presentation.
• OpenAI Spinning Up — VPG / REINFORCE — clear pedagogical exposition with PyTorch
code.
• Peters & Schaal (2008). Reinforcement Learning of Motor Skills with Policy Gradients
— variance-reduction and the natural-gradient view that connects REINFORCE to the
trust-region family (TRPO, PPO).
Continue online. The living edition of this chapter has more than the page can hold:
AIENGINEERINGFROMSCRATCH.COM 120

POLICY GRADIENT — REINFORCE FROM SCRATCH
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/09-reinforcement-learning/06-policy-gradients-reinforce
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/09-reinforcement-learning/06-policy-gradients-reinforce/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 121