---
title: "Speculative Decoding and EAGLE"
volume: "vol4-llms"
part: "Part III — LLMs from Scratch"
chapter_number: 52
source_pages: "380-385"
---

# Speculative Decoding and EAGLE

Speculative Decoding and EAGLE
A frontier LLM generating one token requires a full forward pass over billions of
parameters. That forward pass is massively over-provisioned: most of the time a
much smaller model can guess the next 3-5 tokens correctly, and the big model only
needs to verify the guess. When the guess is right you got 5 tokens for the price
of one. Speculative decoding (Leviathan et al. 2023) made this exact, and EAGLE-
3 (2025) pushed acceptance rates to ~4.5 tokens per verify — a 4-5x speedup at
matched output distribution.
Type: Build Languages: Python (with numpy) Prerequisites: Phase 10 Lesson 12 (Infer-
ence Optimization), Phase 10 Lesson 04 (Pre-training Mini-GPT) Time: ~75 minutes
The Problem
Decode throughput for a 70B-class model on H100 is typically 40-80 tokens/second. Each
token requires a full forward pass reading all model weights from HBM. You cannot make the
model smaller without changing its output. You cannot increase batch size beyond memory.
You’re stuck — unless you can let the model output more than one token per forward pass.
Autoregressive generation looks inherently serial: x_{t+1} = sample(p(· | x_{1:t})). But
there is a concurrency opportunity. If you had a cheap predictor that said “the next 4 tokens
are probably [a, b, c, d]” you could verify all 5 positions in a single forward pass of the big
model and accept the longest matching prefix.
Leviathan, Kalai, Matias (2023, “Fast Inference from Transformers via Speculative Decoding”)
made this exact via a clever accept/reject rule that preserves the target model’s sampling
distribution. The same output distribution, 2-4× faster.
The Concept
The Two-Model Setup
• Target model M_p: the big, slow, high-quality model you actually want samples from.
Distribution: p(x).
• Draft model M_q: a small, fast, lower-quality model. Distribution: q(x). 5-30× smaller.
Per step:
1. Draft model proposes K tokens autoregressively: x_1, x_2, ..., x_K ~ q.
2. Target model runs ONE forward pass over all K+1 positions in parallel, producing p(x_k)
for each proposed token.
3. Accept/reject each token left-to-right via the modified rejection-sampling rule below. Ac-
cept the longest matching prefix.
4. If any token is rejected, sample the replacement from the corrected distribution and stop.
Otherwise sample one bonus token from p(· | x_1...x_K).
If the draft matches the target perfectly, you get K+1 tokens per target-forward. If the draft
is wrong at position 1, you get only 1 token.
AIENGINEERINGFROMSCRATCH.COM 376

SPECULATIVE DECODING AND EAGLE
The Exactness Rule
Speculative decoding is provably equivalent in distribution to sampling from p. The
rejection rule:
For each drafted token x_t:
r ~ Uniform(0, 1)
if r < p(x_t) / q(x_t):
accept x_t
else:
sample replacement from residual: (p - q)+ / ||(p - q)+||_1
stop
where (p - q)+ denotes the positive part of the pointwise difference. When the draft and
target agree (p ≈ q) acceptance is nearly 1. When they disagree, the residual distribution is
constructed so that the overall sample is still exactly p.
Greedy case. For temperature=0 sampling just check argmax(p) == x_t. If yes, accept; if
no, output argmax(p) and stop.
Expected Speedup
If the draft model’s token-level acceptance rate is α, the expected tokens produced per target-
forward pass is:
E[tokens] = (1 - α^{K+1}) / (1 - α) # K = draft length, α in [0, 1]
At α = 0.8, K = 4: (1 - 0.8^5)/(1 - 0.8) = 3.36 tokens per forward. A single target
forward costs roughly cost_q * K + cost_p (K draft steps plus one target verify). If cost_p
>> cost_q * K the speedup ratio is 3.36× / 1 = 3.36× on throughput.
The only real parameter is α, which depends entirely on the draft-target alignment. A good
draft is everything.
Training the Draft: Distillation
A random small model makes a poor draft. The standard recipe is to distill from the target:
1. Pick a small architecture (~1B for a 70B target, ~500M for a 7B target).
2. Run the target model on a large text corpus; store its next-token distributions.
3. Train the draft with KL divergence against the target’s distribution (not against ground-
truth tokens).
The result: α typically 0.6-0.8 on coding, 0.7-0.85 on natural-language chat. Speedups 2-3×
in production.
EAGLE: Tree Drafting + Feature Reuse
Li, Wei, Zhang, Zhang (2024, “EAGLE: Speculative Sampling Requires Rethinking Feature
Uncertainty”) observed two inefficiencies in standard speculative decoding:
1. The draft does K serial steps, each full-stack. But the draft could reuse the target’s
features (hidden states) from the most recent verify — the target already computed rich
representations that the draft is re-deriving from scratch.
2. The draft outputs a linear chain. If the draft could output a tree of candidates (each node
multiple guesses), the target’s single forward pass could verify multiple candidate paths
in parallel via a tree attention mask, and pick the longest accepted branch.
AIENGINEERINGFROMSCRATCH.COM 377

SPECULATIVE DECODING AND EAGLE
EAGLE-1 changes: - Draft input = target’s final hidden state at position t, not raw tokens. -
Draft architecture = 1 transformer decoder layer (not a separate small model). - Output =
tree of K = 4-8 candidates per depth, depth 4-6.
EAGLE-2 (2024) adds dynamic tree topology: the tree grows wider where the draft is uncer-
tain and stays narrow where it is confident. Raises α_effective without increasing verify
cost.
EAGLE-3 (Li et al. 2025, “EAGLE-3: Scaling up Inference Acceleration of Large Language
Models via Training-Time Test”) removes the fixed top-layer feature dependency and trains
the draft with a new “test-time simulation” loss — the draft is trained on outputs that match
the target’s test-time distribution rather than teacher-forced training distribution. Accep-
tance rate rises from 0.75 (EAGLE-2) to 0.82 (EAGLE-3), and mean tokens/verify from 3.0 to
4.5.
Tree Attention Verification
When the draft outputs a tree, the target model verifies it in a single forward pass using a
tree attention mask — a causal mask that encodes the tree topology rather than a pure line.
Each token attends only to its ancestors in the tree. The verify pass is still one forward, one
matmul; the topological mask costs only a few extra KV entries.
root
/ \
a b
/ \ / \
c d e f
If a, b are competing first-token candidates and c, d, e, f are second-token candidates,
all six positions are verified in one forward pass. The output is the longest prefix along any
accepted path.
When It Wins, When It Doesn’t
Wins: - Chat / completion with predictable text (code, common English, structured output).
α is high. - Settings with unused GPU compute during decode (memory-bound phase). Tree
drafting uses the available FLOPs.
Loses / no win: - Highly stochastic outputs (creative writing at high temperature). α drops
toward 1/|vocab|. - Batch serving with very high concurrency — batching already fills the
FLOPs, little room for tree verification. - Very small target models where the draft isn’t much
smaller.
Production shops typically report 2-3× wall-clock speedup on chat, 3-5× on code generation,
and near-zero on creative writing.
Interactive figure: speculative-decoding. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/10-llms-from-scratch/25-speculative-decoding
Build It
code/main.py:
• A reference speculative_decode(target, draft, prompt, K, temperature) that imple-
ments the exact rejection rule and verifies it preserves the target’s distribution (empiri-
cal KL < 0.01 vs plain target sampling).
AIENGINEERINGFROMSCRATCH.COM 378

SPECULATIVE DECODING AND EAGLE
• An EAGLE-style tree drafter that builds a depth-K tree with top-p branching.
• A tree attention mask builder that produces the right causal pattern for a verifier.
• An acceptance-rate harness that runs both on a tiny LM (distill one GPT-2-small from a
GPT-2-medium target).
def speculative_step(p_target, q_draft, K, temperature=1.0):
"""One round of speculative decoding. Returns list of accepted tokens."""
# 1. Draft K tokens
draft_tokens = []
q_probs = []
state = draft_state_init()
for _ in range(K):
probs = softmax(q_draft(state) / temperature)
t = np.random.choice(len(probs), p=probs)
draft_tokens.append(t)
q_probs.append(probs[t])
state = draft_step(state, t)
# 2. Target computes p at every drafted position + 1 extra
p_probs_all = target_forward_batched(p_target, draft_tokens, temperature)
# 3. Accept/reject left-to-right
accepted = []
for k, tok in enumerate(draft_tokens):
r = np.random.uniform()
if r < p_probs_all[k][tok] / q_probs[k]:
accepted.append(tok)
else:
residual = np.maximum(p_probs_all[k] - q_probs[k], 0)
residual /= residual.sum()
accepted.append(np.random.choice(len(residual), p=residual))
return accepted
# 4. All K accepted → sample bonus token from target
accepted.append(np.random.choice(len(p_probs_all[-1]), p=p_probs_all[-1]))
return accepted
Use It
• vLLM and SGLang ship first-class speculative decoding. Flags: --speculative_model,
--num_speculative_tokens. EAGLE-2/3 support via the --spec_decoding_algorithm ea-
gle flag.
• NVIDIA TensorRT-LLM supports Medusa and EAGLE trees natively.
• Reference draft models: Qwen/Qwen3-0.6B-spec (drafts for Qwen3-32B), meta-
llama/Llama-3.2-1B-Instruct-spec (drafts for 70B).
• Medusa heads (Cai et al. 2024, “Medusa: Simple LLM Inference Acceleration Frame-
work with Multiple Decoding Heads”): instead of a draft model, add K parallel prediction
heads to the target itself. Simpler to deploy, slightly lower acceptance than EAGLE.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/10-llms-from-scratch/25-speculative-decoding
AIENGINEERINGFROMSCRATCH.COM 379

SPECULATIVE DECODING AND EAGLE
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/10-llms-from-scratch/25-speculative-decoding/code
1. Implement the exact rejection rule and empirically verify it. Run 10K samples via spec-
ulative_decode and via plain target sampling; compute TV distance between the two
output distributions. Should be < 0.01.
2. Compute the speedup formula. Given fixed α and K, plot expected tokens per target-
forward. Find the optimal K for α ∈ {0.5, 0.7, 0.9}.
3. Train a tiny draft. Take a 124M GPT-2 target and distill a 30M GPT-2 draft on 100M
tokens with KL loss. Measure α on held-out text. Expected: 0.6-0.7.
4. Implement EAGLE-style tree drafting. Instead of a chain, have the draft output top-3
branches at each depth. Build the tree attention mask. Verify the target accepts the
longest correct branch.
5. Measure failure modes. Run speculative decode at temperature=1.5 (high stochasticity).
Show α collapses and the algorithm is slower than plain decode due to draft overhead.
Key Terms
Term What people say What it actually means
Target “The big model” The slow, high-quality model you want
model samples from (p distribution)
Draft “The speculator” The small, fast predictor (q distribution);
model 5-30x smaller
K / draft “Look-ahead” Number of speculated tokens per verify pass
length
α / accep- “Hit rate” Per-token probability that the draft’s
tance rate proposal is accepted
Exact “The accept test” r < p/q compare that preserves target’s
rejection distribution
rule
Residual “Corrected p-q” (p - q)+ /
distribu-
tion
Tree “Branching speculation” Draft outputs a tree of candidates, verified
drafting in one pass with tree-structured attention
mask
Tree “Topological mask” Causal mask encoding the tree topology so
attention each node attends only to its ancestors
mask
Medusa “Parallel heads” K extra prediction heads on the target itself;
heads no separate draft model
EAGLE “Hidden-state draft” Draft input is target’s last hidden state, not
feature raw tokens, shrinking the draft
reuse
Test-time “EAGLE-3 training” Train draft on outputs matching target’s
simulation test-time distribution, not teacher forcing
loss
AIENGINEERINGFROMSCRATCH.COM 380

SPECULATIVE DECODING AND EAGLE
Further Reading
• Leviathan, Kalai, Matias, 2023 — “Fast Inference from Transformers via Speculative
Decoding” — the exact rejection rule and the theoretical speedup analysis
• Chen, Borgeaud, Irving et al., 2023 — “Accelerating Large Language Model Decoding
with Speculative Sampling” — concurrent speculative-sampling paper at DeepMind
• Cai, Li, Geng, Wang, Wang, Zhu, Dao, 2024 — “Medusa: Simple LLM Inference Acceler-
ation Framework with Multiple Decoding Heads” — parallel-heads alternative to a draft
model
• Li, Wei, Zhang, Zhang, 2024 — “EAGLE: Speculative Sampling Requires Rethinking Fea-
ture Uncertainty” — feature reuse and tree drafting
• Li et al., 2024 — “EAGLE-2: Faster Inference of Language Models with Dynamic Draft
Trees” — dynamic tree topology
• Li et al., 2025 — “EAGLE-3: Scaling up Inference Acceleration of Large Language Models
via Training-Time Test” — train-time test-time matching
• Fu, Haotian, Peng et al., 2024 — “Break the Sequential Dependency of LLM Inference
Using Lookahead Decoding” — Jacobi/lookahead decoding, a speculator-free alternative
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/10-llms-from-scratch/25-speculative-decoding
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/10-llms-from-scratch/25-speculative-decoding/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 381