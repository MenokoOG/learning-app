---
title: "Deep Q-Networks (DQN)"
volume: "vol4-llms"
part: "Part II — Reinforcement Learning"
chapter_number: 22
source_pages: "114-119"
---

# Deep Q-Networks (DQN)

Deep Q-Networks (DQN)
2013: Mnih trained one Q-learning network on raw pixels, beat every classical RL
agent on seven Atari games. 2015: extended to 49 games, published in Nature,
sparked the deep-RL era. DQN is Q-learning plus three tricks that make function
approximation stable.
Type: Build Languages: Python Prerequisites: Phase 3 · 03 (Backpropagation), Phase 9 ·
04 (Q-learning, SARSA) Time: ~75 minutes
The Problem
Tabular Q-learning needs a separate Q-value for every (state, action) pair. A chess board has
~10⁴³ states. An Atari frame is 210×160×3 = 100,800 features. Tabular RL dies at thousands
of states, let alone billions.
The fix is obvious in hindsight: replace the Q-table with a neural network, Q(s, a; θ). But
obvious-in-hindsight took decades. Naive function approximation with Q-learning diverges
under the “deadly triad” — function approximation + bootstrapping + off-policy learning.
Mnih et al. (2013, 2015) identified three engineering tricks that stabilize learning:
1. Experience replay decorrelates transitions.
2. Target network freezes the bootstrap target.
3. Reward clipping normalizes gradient magnitudes.
DQN on Atari was the first time a single architecture with a single hyperparameter set solved
dozens of control problems from raw pixels. Everything “deep-RL” built since — DDQN, Rain-
bow, Dueling, Distributional, R2D2, Agent57 — is stacked on top of this three-trick base.
The Concept
The objective. DQN minimizes the one-step TD loss on a neural Q-function:
L(θ) = E_{(s,a,r,s')~D} [ (r + γ max_{a'} Q(s', a'; θ^-) - Q(s, a; θ))² ]
θ = online network, updated every step by gradient descent. θ^- = target network, periodi-
cally copied from θ (every ~10,000 steps). D = replay buffer of past transitions.
The three tricks, in order of importance:
Experience replay. A ring buffer of ~10⁶ transitions. Each training step samples a minibatch
uniformly at random. This breaks temporal correlation (successive frames are nearly iden-
tical), lets the network learn from rare rewarding transitions many times, and decorrelates
consecutive gradient updates. Without it, on-policy TD with a neural net diverges on Atari.
Target network. Using the same network Q(·; θ) on both sides of the Bellman equation
makes the target move every update — “chasing your own tail.” The fix: keep a second
network Q(·; θ^-) with frozen weights. Every C steps, copy θ → θ^-. This stabilizes the
regression target for thousands of gradient steps at a time. Soft updates θ^- ← τ θ + (1-τ)
θ^- (used in DDPG, SAC) are a smoother variant.
AIENGINEERINGFROMSCRATCH.COM 110

DEEP Q-NETWORKS (DQN)
DQN: Q-learning + replay + target network
environment online net Q(.; theta) replay buffer D target
(s, a) -> (r, s') acts epsilon-greedy (s, a, r, s', done) theta^-
Atari, GridWorld, whatever trained every step ~1M transitions, uniform sample frozen
sync/C
gradient step: one minibatch, TD squared error
for (s, a, r, s', done) in buffer.sample(batch):
y = r if done
y = r + gamma * max_a' Q(s', a'; theta^-) otherwise
loss = (Q(s, a; theta) - y)^2
theta -= lr * d loss / d theta
updated theta acts next step
three tricks, one loss, one neural net: the deep RL era begins
Figure 19: DQN training loop: env, replay buffer, online net, target net, Bellman TD loss
Reward clipping. Atari reward magnitudes vary from 1 to 1000+. Clipping to {-1, 0, +1}
stops any single game from dominating the gradient. Wrong when reward magnitude matters;
fine for Atari where only sign matters.
Double DQN. Hasselt (2016) fixes maximization bias: use the online net to select the action,
the target net to evaluate it.
target = r + γ Q(s', argmax_{a'} Q(s', a'; θ); θ^-)
Drop-in replacement, consistently better. Use it by default.
Other improvements (Rainbow, 2017): prioritized replay (sample high-TD-error tran-
sitions more), dueling architecture (separate V(s) and advantage heads), noisy networks
(learned exploration), n-step returns, distributional Q (C51/QR-DQN), multi-step bootstrap-
ping. Each adds a few percent; the gains are roughly additive.
Interactive figure: f3-dqn-stability. This one moves. Watch it animate and drag its con-
trols in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/09-
reinforcement-learning/05-dqn
Build It
The code here is stdlib-only numpy-free — we use a hand-rolled single-hidden-layer MLP on
a tiny continuous GridWorld, so every training step runs in microseconds. The algorithm is
identical to Atari DQN at scale.
Step 1: replay buffer
class ReplayBuffer:
def __init__(self, capacity):
self.buf = []
self.capacity = capacity
AIENGINEERINGFROMSCRATCH.COM 111

DEEP Q-NETWORKS (DQN)
def push(self, s, a, r, s_next, done):
if len(self.buf) == self.capacity:
self.buf.pop(0)
self.buf.append((s, a, r, s_next, done))
def sample(self, batch, rng):
return rng.sample(self.buf, batch)
~50,000 capacity for Atari; 5,000 suffices for our toy env.
Step 2: a tiny Q-network (manual MLP)
class QNet:
def __init__(self, n_in, n_hidden, n_actions, rng):
self.W1 = [[rng.gauss(0, 0.3) for _ in range(n_in)] for _ in range(n_hidden)]
self.b1 = [0.0] * n_hidden
self.W2 = [[rng.gauss(0, 0.3) for _ in range(n_hidden)] for _ in range(n_actions)]
self.b2 = [0.0] * n_actions
def forward(self, x):
h = [max(0.0, sum(w * xi for w, xi in zip(row, x)) + b) for row, b in zip(self.W1, self.b1)]
q = [sum(w * hi for w, hi in zip(row, h)) + b for row, b in zip(self.W2, self.b2)]
return q, h
Forward pass: linear → ReLU → linear. That is the entire net.
Step 3: the DQN update
def train_step(online, target, batch, gamma, lr):
grads = zeros_like(online)
for s, a, r, s_next, done in batch:
q, h = online.forward(s)
if done:
y = r
else:
q_next, _ = target.forward(s_next)
y = r + gamma * max(q_next)
td_error = q[a] - y
accumulate_grads(grads, online, s, h, a, td_error)
apply_sgd(online, grads, lr / len(batch))
The shape is Q-learning from Lesson 04 with two differences: (a) we backprop through a
differentiable Q(·; θ) instead of indexing a table, (b) the target uses Q(·; θ^-).
Step 4: the outer loop
For each episode, act ε-greedy on Q(·; θ), push transitions into the buffer, sample a minibatch,
take a gradient step, periodically sync θ^- ← θ. The pattern:
for episode in range(N):
s = env.reset()
while not done:
a = epsilon_greedy(online, s, epsilon)
s_next, r, done = env.step(s, a)
buffer.push(s, a, r, s_next, done)
if len(buffer) >= batch:
train_step(online, target, buffer.sample(batch), gamma, lr)
AIENGINEERINGFROMSCRATCH.COM 112

DEEP Q-NETWORKS (DQN)
if steps % sync_every == 0:
target = copy(online)
s = s_next
On our tiny GridWorld with a 16-dim one-hot state, the agent learns a near-optimal policy in
~500 episodes. On Atari, scale this to 200M frames and add a CNN feature extractor.
Pitfalls
• Deadly triad. Function approximation + off-policy + bootstrapping can diverge. DQN
mitigates with target net + replay; do not remove either.
• Exploration. ε must decay, typically from 1.0 to 0.01 over the first ~10% of training.
Without enough early exploration the Q-net converges to a local basin.
• Overestimation. max over noisy Q is upward-biased. Always use Double DQN in pro-
duction.
• Reward scale. Clip or normalize rewards; the gradient magnitude is proportional to
reward magnitude.
• Replay buffer coldstart. Don’t train until the buffer has a few thousand transitions.
Early gradients on ~20 samples overfit.
• Target sync frequency. Too frequent ≈ no target net; too infrequent ≈ stale targets.
Atari DQN uses 10,000 env steps. Rule of thumb: sync every ~1/100 of training horizon.
• Observation preprocessing. Atari DQN stacks 4 frames to make state Markov. Any
env with velocity info needs frame-stacking or recurrent state.
Use It
In 2026, DQN is rarely state-of-the-art but remains the reference off-policy algorithm:
Task Method of choice Why not DQN?
Discrete- Rainbow DQN or Muesli Same framework, more tricks.
action
Atari-like
Continuous SAC / TD3 (Phase 9 · 07) DQN has no policy network.
control
On-policy / PPO (Phase 9 · 08) No replay buffer; easier to
high- scale.
throughput
Offline RL CQL / IQL / Decision Transformer Conservative Q targets, no
bootstrapping blowups.
Large DQN with action embedding, or IMPALA Fine; decoration matters.
discrete
action spaces
(recom-
mender)
LLM RL PPO / GRPO Sequence-level, not step-level;
different loss.
The lessons still travel. Replay and target networks appear in SAC, TD3, DDPG, SAC-X, Alp-
haZero’s self-play buffer, and every offline RL method. Reward clipping lives on as advantage
normalization in PPO. The architecture is the blueprint.
AIENGINEERINGFROMSCRATCH.COM 113

DEEP Q-NETWORKS (DQN)
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/09-reinforcement-learning/05-dqn
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/09-reinforcement-learning/05-dqn/code
1. Easy. Run code/main.py. Plot the per-episode return curve. How many episodes until
the running mean exceeds -10?
2. Medium. Disable the target network (use the online net for both sides of the Bellman
target). Measure training instability — does return oscillate or diverge?
3. Hard. Add Double DQN: use the online net to pick argmax a', target net to evaluate.
Compare bias of Q(s_0, best_a) vs true V*(s_0) after 1,000 episodes with vs without
Double DQN on a noisy-reward GridWorld.
Key Terms
Term What people say What it actually means
DQN “Deep Q-learning” Q-learning with a neural Q-function, replay
buffer, and target network.
Experience “Shuffled transitions” Ring buffer sampled uniformly each
replay gradient step; decorrelates data.
Target “Frozen bootstrap” Periodic copy of Q used in the Bellman
network target; stabilizes training.
Deadly “Why RL diverges” Function approximation + bootstrapping +
triad off-policy = no convergence guarantee.
Double “Fix for maximization bias” Online net selects action, target net
DQN evaluates it.
Dueling “V and A heads” Decompose Q = V + A - mean(A); same
DQN output, better gradient flow.
Rainbow “All the tricks” DDQN + PER + dueling + n-step + noisy +
distributional in one.
PER “Prioritized Replay” Sample transitions proportional to TD-error
magnitude.
Further Reading
• Mnih et al. (2013). Playing Atari with Deep Reinforcement Learning — the 2013 NeurIPS
workshop paper that kicked off deep RL.
• Mnih et al. (2015). Human-level control through deep reinforcement learning — the
Nature paper, 49-game DQN.
• Hasselt, Guez, Silver (2016). Deep Reinforcement Learning with Double Q-learning —
DDQN.
• Wang et al. (2016). Dueling Network Architectures — dueling DQN.
• Hessel et al. (2018). Rainbow: Combining Improvements in Deep RL — the stacked-
tricks paper.
• OpenAI Spinning Up — DQN — clear modern exposition.
AIENGINEERINGFROMSCRATCH.COM 114

DEEP Q-NETWORKS (DQN)
• Sutton & Barto (2018). Ch. 9 — On-policy Prediction with Approximation — the textbook
treatment of the “deadly triad” (function approximation + bootstrapping + off-policy)
that DQN’s target network and replay buffer are designed to tame.
• CleanRL DQN implementation — reference single-file DQN used in ablation studies; good
to read alongside this lesson’s from-scratch version.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/09-reinforcement-learning/05-dqn
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/09-reinforcement-learning/05-dqn/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 115