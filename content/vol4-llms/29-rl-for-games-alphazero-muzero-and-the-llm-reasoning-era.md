---
title: "RL for Games — AlphaZero, MuZero, and the LLM-Reasoning Era"
volume: "vol4-llms"
part: "Part II — Reinforcement Learning"
chapter_number: 29
source_pages: "155-161"
---

# RL for Games — AlphaZero, MuZero, and the LLM-Reasoning Era

RL for Games — AlphaZero, MuZero, and
the LLM-Reasoning Era
1992: TD-Gammon beat human champions at backgammon with pure TD. 2016:
AlphaGo beat Lee Sedol. 2017: AlphaZero dominated chess, shogi, and Go from
scratch. 2024: DeepSeek-R1 proved the same recipe, with GRPO replacing PPO,
works on reasoning. Games are the benchmark that drives every breakthrough in
this phase.
Type: Build Languages: Python Prerequisites: Phase 9 · 05 (DQN), Phase 9 · 08 (PPO),
Phase 9 · 09 (RLHF), Phase 9 · 10 (MARL) Time: ~120 minutes
The Problem
Games have everything RL wants. Clean reward (win/loss). Infinite episodes (self-play resets).
Perfect simulation (the game is the simulator). Discrete or small continuous action spaces.
Multi-agent structure that forces adversarial robustness.
And games are how every major RL breakthrough was tested. TD-Gammon (backgammon,
1992). Atari-DQN (2013). AlphaGo (2016). AlphaZero (2017). OpenAI Five (Dota 2, 2019).
AlphaStar (StarCraft II, 2019). MuZero (learned model, 2019). AlphaTensor (matrix multipli-
cation, 2022). AlphaDev (sorting algorithms, 2023). DeepSeek-R1 (math reasoning, 2025) —
the latest demonstration that game-RL techniques work on text.
This capstone surveys the three landmark architectures — AlphaZero, MuZero, and GRPO —
through a single unifying lens: self-play + search + policy improvement. Each generalizes
the previous; GRPO in particular is AlphaZero’s recipe applied to LLM reasoning, with tokens
as actions and mathematical verification as the win signal.
The Concept
The unifying loop.
while True:
trajectory = self_play(current_policy, search) # play game against self
policy_target = search.improved_policy(trajectory) # search improves raw policy
policy_net.update(policy_target, value_target) # supervised on search output
AlphaZero (2017). Silver et al. Given a game (chess, shogi, Go) with known rules:
• Policy-value network: one tower f_θ(s) → (p, v). p is a prior over legal moves. v is the
expected game outcome.
• Monte Carlo Tree Search (MCTS): at each move, expand a tree of possible continuations.
Use (p, v) as the prior + bootstrap. Select nodes by UCB (PUCT): a* = argmax Q(s,
a) + c · p(a|s) · √N(s) / (1 + N(s, a)).
• Self-play: play games agent-vs-agent. At move t, the MCTS visit distribution π_t be-
comes the policy training target.
• Loss: L = (v - z)² - π · log p + c · ||θ||². z is the game outcome (+1 / 0 / -1).
AIENGINEERINGFROMSCRATCH.COM 151

RL FOR GAMES — ALPHAZERO, MUZERO, AND THE LLM-REASONING ERA
self-play + search + policy improvement — one recipe, three eras
AlphaZero (2017) MuZero (2019) GRPO (2024-2025)
env: chess / shogi / Go env: anything env: LLM reasoning
rules: known rules: learned (g) action: next token
policy-value net (p, v) encoder h, dynamics g verifier: tests/math check
MCTS with PUCT MCTS in latent space group sampling (G rollouts)
target: pi_MCTS, z_outcome target: pi_MCTS, z, reward A_i = (r_i - mean_r) / std_r
L = (v-z)^2 - pi * log p L = sum over horizon L = -A * log pi + beta KL
tabula rasa self-play no sim required no critic, no reward model
Go, chess, shogi Atari, Go, chess, shogi math, code, reasoning
requires: perfect sim same loop, learned model DeepSeek-R1 recipe
discrete actions higher compute cost group-relative baseline
zero-sum stochastic extensions exist same spirit as AlphaZero
pattern: sample many trajectories, rank them, train the policy to increase the good ones' probability
Figure 26: AlphaZero ↔ MuZero ↔ GRPO: same loop, different environments
Zero human knowledge. Zero handcrafted heuristics. A single recipe that mastered chess,
shogi, and Go after a few tens of millions of self-play games each.
MuZero (2019). Schrittwieser et al. Removes the requirement that the rules are known.
• Instead of a fixed environment, learn a latent dynamics model (h, g, f):
– h(s): encode observation to latent state.
– g(s_latent, a): predict next latent state + reward.
– f(s_latent): predict policy prior + value.
• MCTS runs in the learned latent space. Same search, same training loop.
• Works on Go, chess, shogi and Atari — one algorithm, no rule knowledge.
Stochastic MuZero (2022). Adds stochastic dynamics and chance nodes; extends to
backgammon-class games.
Muesli, Gumbel MuZero (2022-2024). Improvements on sample efficiency and determin-
istic search.
GRPO (2024-2025). DeepSeek-R1 recipe. Same AlphaZero-shaped loop, applied to
language-model reasoning:
• “Game”: answer a math / coding / reasoning problem. “Win” = verifier (test case passes,
numerical answer matches) returns 1.
• Policy: the LLM. Actions: tokens. State: prompt + response-so-far.
• No critic (PPO-style V_φ). Instead, for each prompt, sample G completions from the policy.
Compute reward for each. Use the group-relative advantage A_i = (r_i - mean_r)
/ std_r as the signal for REINFORCE-style update.
• KL penalty to reference policy to prevent drift (like RLHF).
• Full loss:
L_GRPO(θ) = -E_{q, {o_i}} [ (1/G) Σ_i A_i · log π_θ(o_i | q) ] + β · KL(π_θ ||
π_ref)
AIENGINEERINGFROMSCRATCH.COM 152

RL FOR GAMES — ALPHAZERO, MUZERO, AND THE LLM-REASONING ERA
No reward model, no critic, no MCTS. Group-relative baseline replaces all three. Matches or
exceeds PPO-RLHF quality on reasoning benchmarks at a fraction of the compute.
The R1 recipe in full. DeepSeek-R1 (DeepSeek 2025) is two models in one paper:
• R1-Zero. Start from the DeepSeek-V3 base model. No SFT. Apply GRPO directly with
two reward components: accuracy reward (rule-based — did the final answer parse to
the correct number / did the code pass unit tests) and format reward (did the completion
wrap its chain-of-thought in <think>…</think> tags). Over thousands of steps, average
response length grows from ~100 to ~10,000 tokens and math benchmark scores climb
to near-o1-preview levels. The model learns to reason from scratch. The downside: its
chains of thought are often unreadable, mix languages, and lack stylistic polish.
• R1. Fix R1-Zero’s readability problems with a four-stage pipeline:
1. Cold-start SFT. Collect a few thousand long-CoT demonstrations with clean format-
ting. Supervised-finetune the base model on them. This gives a readable starting
point.
2. Reasoning-oriented GRPO. Apply GRPO with the accuracy+format rewards plus
a language-consistency reward to prevent code-switching.
3. Rejection sampling + SFT round 2. Sample ~600K reasoning trajectories from
the RL checkpoint, keep only those with correct final answers and readable CoT,
and combine with ~200K non-reasoning SFT examples (writing, QA, self-cognition).
Fine-tune the base again.
4. Full-spectrum GRPO. One more RL round covering both reasoning (rule-based
rewards) and general alignment (helpfulness/harmlessness preference-based
rewards).
The result matches o1 on AIME and MATH-500 at open weights, and is small enough to distill.
The same paper also releases six distilled dense models (Qwen-1.5B through Llama-70B) by
SFT’ing on R1’s reasoning traces — no RL at the student. Distillation of a strong RL teacher
consistently beats RL from scratch at the student’s scale.
Why GRPO instead of PPO for reasoning. Three reasons in the DeepSeekMath paper
(Feb 2024): (1) no value network to train, halving memory; (2) the group baseline naturally
handles the sparse end-of-trajectory reward that reasoning tasks produce; (3) per-prompt
normalization makes advantages comparable across problems of wildly different difficulty,
which PPO’s single critic cannot.
Search-free vs search-based. Games have branched:
• Perfect-information games with long horizons (Go, chess): still search-based. AlphaZero
/ MuZero dominate.
• LLM reasoning: no MCTS yet in production; GRPO on full rollouts, best-of-N for infer-
ence compute. Process reward models (PRMs) hint at step-level search being added
back.
Interactive figure: f3-selfplay-ladder. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/09-reinforcement-learning/12-rl-for-games
Build It
The code in code/main.py implements GRPO in miniature — a bandit with multiple groups
of samples. The algorithm is the same as on an LLM; only the policy and environment are
simpler. It teaches the loss and the group-relative advantage, which is the 2025 innovation.
AIENGINEERINGFROMSCRATCH.COM 153

RL FOR GAMES — ALPHAZERO, MUZERO, AND THE LLM-REASONING ERA
Step 1: a tiny verifier environment
QUESTIONS = [
{"prompt": "q1", "correct": 3},
{"prompt": "q2", "correct": 1},
]
def verify(prompt_idx, answer_token):
return 1.0 if answer_token == QUESTIONS[prompt_idx]["correct"] else 0.0
In real GRPO the verifier runs unit tests or checks math equality.
Step 2: policy: softmax over K answer tokens per prompt
def policy_probs(theta, p_idx):
return softmax(theta[p_idx])
Equivalent to the final-layer output of an LLM conditioned on a prompt.
Step 3: group sampling and group-relative advantage
def grpo_step(theta, p_idx, G=8, beta=0.01, lr=0.1, rng=None):
probs = policy_probs(theta, p_idx)
samples = [sample(probs, rng) for _ in range(G)]
rewards = [verify(p_idx, s) for s in samples]
mean_r = sum(rewards) / G
std_r = stddev(rewards) + 1e-8
advs = [(r - mean_r) / std_r for r in rewards]
for a, A in zip(samples, advs):
grad = onehot(a) - probs
for i in range(len(probs)):
theta[p_idx][i] += lr * A * grad[i]
# KL penalty: pull theta toward reference
for i in range(len(probs)):
theta[p_idx][i] -= beta * (theta[p_idx][i] - reference[p_idx][i])
The group-relative advantage is the 2024 DeepSeek trick. No critic needed. The “baseline”
is the group mean, and normalization uses group std.
Step 4: compare to REINFORCE baseline (value-free)
Same setup, same compute, plain REINFORCE. GRPO converges faster and more stably.
Step 5: observe entropy and KL
Same diagnostics as RLHF: mean KL to reference, policy entropy, reward-over-time. Once
these stabilize, training is done.
Pitfalls
• Reward hacking via verifier gaming. GRPO inherits RLHF’s risk: if the verifier is
wrong or exploitable, the LLM will find the exploit. Robust verifiers (multiple test cases,
formal proofs) matter.
AIENGINEERINGFROMSCRATCH.COM 154

RL FOR GAMES — ALPHAZERO, MUZERO, AND THE LLM-REASONING ERA
• Group size too small. Variance of the group baseline goes like 1/√G. Below G = 4, the
advantage signal is noisy; standard choice is G = 8 to 64.
• Length bias. LLM completions of different lengths have different log-probabilities. Nor-
malize by token count, or use sequence-level log-prob, or truncate to max length.
• Pure self-play cycles. AlphaZero-style training can get stuck in dominance loops on
general-sum games. Mitigated by diverse opponent pools (league play, Lesson 10).
• Search-policy mismatch. AlphaZero trains the policy to mimic search output. If the
policy net is too small to represent the search’s distribution, training stalls.
• Compute floor. MuZero / AlphaZero need massive compute. A single ablation is often
hundreds of GPU-hours. Miniature demos exist (e.g., AlphaZero on Connect Four) for
learning.
• Verifier coverage. Unit tests that pass for a buggy solution reinforce the bug. Design
verifiers that catch edge cases.
Use It
The 2026 game-RL landscape, by domain:
Domain Dominant method
Two-player zero-sum board AlphaZero / MuZero / KataGo
games (Go, chess, shogi)
Imperfect info card games CFR + deep learning (DeepStack, Libratus, Pluribus)
(poker)
Atari / pixel games Muesli / MuZero / IMPALA-PPO
Large multiplayer strategy PPO + self-play + league (OpenAI Five, AlphaStar)
(Dota, StarCraft)
LLM math/code reasoning GRPO (DeepSeek-R1, Qwen-RL, open replications)
LLM alignment DPO / RLHF-PPO (not GRPO; verifier is preference not
verifiable)
Robotics PPO + DR (not game-RL, but uses same policy-gradient tools)
Combinatorial problems AlphaZero variants (AlphaTensor, AlphaDev)
The recipe — self-play, search-augmented improvement, policy distillation — spans text, pix-
els, and physical control. GRPO is the youngest instance; more are coming.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/09-reinforcement-learning/12-rl-for-games
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/09-reinforcement-learning/12-rl-for-games/code
1. Easy. Implement the GRPO bandit in code/main.py. Train on 2 prompts × 4 answer
tokens each. Converge in < 1,000 updates with G=8.
2. Medium. Plug in PPO (clipped) and vanilla REINFORCE. Compare sample efficiency
and reward variance to GRPO on the same bandit.
3. Hard. Extend to a length-2 “reasoning chain”: the agent emits two tokens and the
verifier rewards the pair. Measure how GRPO handles the credit assignment across two-
step sequences. (Hint: compute group advantage per full sequence, propagate to both
token positions.)
AIENGINEERINGFROMSCRATCH.COM 155

RL FOR GAMES — ALPHAZERO, MUZERO, AND THE LLM-REASONING ERA
Key Terms
Term What people say What it actually means
MCTS “Tree search with learned net” Monte Carlo Tree Search; UCB1/PUCT
selection with learned (p, v) priors.
AlphaZero “Self-play + MCTS” Policy-value net trained to match MCTS
visits and game outcome.
MuZero “Learned-model AlphaZero” Same loop but in latent space via learned
dynamics.
GRPO “Critic-free PPO” Group Relative Policy Optimization;
REINFORCE with group-mean baseline +
KL.
PUCT “AlphaZero’s UCB” Q + c · p · √N / (1 + N_a) — balances
value estimate with prior.
Self-play “Agent vs past self” Standard for zero-sum; symmetric training
signal.
League “Population-based self-play” Past + current + exploiters sampled as
play opponents.
Verifier “Verifiable RL” Reward comes from a deterministic
reward checker (tests pass, answer matches).
Process “PRM” Scores each reasoning step, not just the
reward final answer.
Further Reading
• Silver et al. (2017). Mastering the game of Go without human knowledge (AlphaGo Zero).
• Silver et al. (2018). A general reinforcement learning algorithm that masters chess,
shogi, and Go through self-play (AlphaZero).
• Schrittwieser et al. (2020). Mastering Atari, Go, chess and shogi by planning with a
learned model (MuZero).
• Vinyals et al. (2019). Grandmaster level in StarCraft II (AlphaStar).
• DeepSeek-AI (2024). DeepSeekMath: Pushing the Limits of Mathematical Reasoning
in Open Language Models (GRPO) — the paper that introduced GRPO and the group-
relative baseline.
• DeepSeek-AI (2025). DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Re-
inforcement Learning — the full four-stage R1 recipe plus the R1-Zero ablation.
• Brown et al. (2019). Superhuman AI for multiplayer poker (Pluribus) — CFR + deep-
learning at scale.
• Tesauro (1995). Temporal Difference Learning and TD-Gammon — the paper that started
it all.
• Hugging Face TRL — GRPOTrainer — the production reference for applying GRPO with
custom reward functions.
• Qwen Team (2024). Qwen2.5-Math — GRPO replication — open replication of the R1
recipe at multiple scales.
• Sutton & Barto (2018). Ch. 17 — Frontiers of Reinforcement Learning — the textbook
framing for self-play, search, and “designed reward” that R1 instantiates at LLM scale.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/09-reinforcement-learning/12-rl-for-games
AIENGINEERINGFROMSCRATCH.COM 156

RL FOR GAMES — ALPHAZERO, MUZERO, AND THE LLM-REASONING ERA
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/09-reinforcement-learning/12-rl-for-games/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 157