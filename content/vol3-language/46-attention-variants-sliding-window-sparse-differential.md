---
title: "Attention Variants — Sliding Window, Sparse, Differential"
volume: "vol3-language"
part: "Part II — Transformers Deep Dive"
chapter_number: 46
source_pages: "256-261"
---

# Attention Variants — Sliding Window, Sparse, Differential

Attention Variants — Sliding Window,
Sparse, Differential
Full attention is a circle. Every token sees every token, and memory pays the price.
Four variants bend the shape of the circle and recover half the cost.
Type: Build Languages: Python Prerequisites: Phase 7 · 02 (Self-Attention), Phase 7 · 03
(Multi-Head), Phase 7 · 12 (KV Cache / Flash Attention) Time: ~60 minutes
The Problem
Full attention costs O(N²) memory and O(N²) compute in sequence length. For a 128K-context
Llama 3 70B that is 16 billion attention entries per layer, times 80 layers. Flash Attention
(Lesson 12) hides the O(N²) activation memory but does not change the arithmetic cost —
every token still attends to every other token.
Three classes of variants change the topology of the attention matrix itself:
1. Sliding window attention (SWA). Each token attends to a fixed window of neighbors,
not the full prefix. Memory and compute drop to O(N · W) where W is the window. Gemma
2/3, Mistral 7B’s first layers, Phi-3-Long.
2. Sparse / block attention. Only selected pairs (i, j) get scored; the rest are forced to
zero weight. Longformer, BigBird, OpenAI sparse transformer.
3. Differential attention. Compute two attention maps with separate Q/K projections,
subtract one from the other. Kills the “attention sink” that bleeds weight into the first
few tokens. Microsoft’s DIFF Transformer (2024).
These coexist. A 2026 frontier model often mixes them: most layers are SWA-1024, every fifth
is global full attention, and a handful are differential heads that clean up retrieval. Gemma
3’s 5:1 SWA-to-global ratio is the current textbook default.
The Concept
Sliding Window Attention (SWA)
Each query at position i attends only to positions in [i - W, i] (causal SWA) or [i - W/2, i
+ W/2] (bidirectional). Tokens outside the window get -inf in the score matrix.
full causal: sliding window (W=4):
positions 0-7 positions 0-7, W=4
0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
0 | x 0 | x
1 | x x 1 | x x
2 | x x x 2 | x x x
3 | x x x x 3 | x x x x
4 | x x x x x 4 | x x x x
5 | x x x x x x 5 | x x x x
AIENGINEERINGFROMSCRATCH.COM 253

ATTENTION VARIANTS — SLIDING WINDOW, SPARSE, DIFFERENTIAL
6 | x x x x x x x 6 | x x x x
7 | x x x x x x x x 7 | x x x x
For N = 8192 and W = 1024, the score matrix has 1024 × 8192 non-zero rows in expectation
— an 8× reduction.
KV cache shrinks with SWA. Only the last W tokens of K and V need to be kept per layer.
For a Gemma-3-ish config (1024 window, 128K context), KV cache drops 128×.
Quality cost. SWA-only transformers struggle with long-range retrieval. The fix: interleave
SWA layers with full-attention layers. Gemma 3 uses 5:1 SWA:global. Mistral 7B used a
causal-SWA stack where information “flows forward” through overlapping windows — each
layer extends effective receptive field by W, and after L layers the model can attend L × W
tokens back.
Sparse / Block Attention
Pick an N × N sparsity pattern ahead of time. Three canonical shapes:
• Local + strided (OpenAI sparse transformer). Attend to the last W tokens plus every
stride-th token before that. Captures both local and long-range at O(N · sqrt(N))
compute.
• Longformer / BigBird. Local window + a small set of global tokens (e.g. [CLS]) that
attend to everyone and are attended by everyone + random-sparse links. Empirical 2×
context at matched quality.
• Native Sparse Attention (DeepSeek, 2025). Learn which blocks of (Q, K) matter;
skip the zero blocks at kernel level. FlashAttention-compatible.
Sparse attention is a kernel-engineering story. The math is simple (mask the score matrix);
the win comes from never loading the zero entries into SRAM. FlashAttention-3 and the 2026
FlexAttention API make custom sparse patterns first-class in PyTorch.
Differential Attention (DIFF Transformer, 2024)
Regular attention has an “attention sink” problem: softmax forces every row to sum to 1, so
tokens that don’t want to attend to anything in particular dump weight on the first token (or
the first few). This steals capacity that should have gone to real content.
Differential attention fixes this by computing two attention maps and subtracting:
A1 = softmax(Q1 K1^T / √d)
A2 = softmax(Q2 K2^T / √d)
DiffAttn = (A1 - λ · A2) V
where λ is a learned scalar (typically 0.5–0.8). A1 captures real content weights; A2 captures
the sink. Subtraction cancels the sink, reallocates weight to relevant tokens.
Reported results (Microsoft 2024): 5–10% lower perplexity, 1.5–2× longer effective context
at same trained length, sharper needle-in-haystack retrieval.
Variant Comparison
Variant Compute KV cache Quality vs full Production use
Full O(N²) O(N) per baseline every model’s default
attention layer layer
AIENGINEERINGFROMSCRATCH.COM 254

ATTENTION VARIANTS — SLIDING WINDOW, SPARSE, DIFFERENTIAL
Variant Compute KV cache Quality vs full Production use
SWA O(N·W) O(W) per -0.1 ppl, good with Gemma 2/3,
(window layer global layers Phi-3-Long
1024)
Local + O(N·√N) mixed similar to SWA OpenAI sparse
strided transformer,
sparse Longformer
BigBird O(N) mixed matches full at 2× early long-context
(local + approx context BERT
global +
random)
Native O(N · active O(N) within 0.05 ppl DeepSeek-V3.2, 2025
Sparse fraction)
(DeepSeek-
V3.2)
Differential O(2·N²) O(2N) -5 to -10% ppl DIFF Transformer,
early 2026 models
Interactive figure: gqa-kv-sharing. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/07-
transformers-deep-dive/15-attention-variants
Build It
See code/main.py. We implement a causal mask comparator that shows full, SWA, lo-
cal+strided, and differential attention side by side on a toy sequence.
Step 1: full causal mask (baseline)
def causal_mask(n):
return [[0.0 if j <= i else float("-inf") for j in range(n)] for i in range(n)]
Baseline from Lesson 07. Lower triangular; zero weight above the diagonal.
Step 2: sliding window causal mask
def swa_mask(n, window):
M = [[float("-inf")] * n for _ in range(n)]
for i in range(n):
lo = max(0, i - window + 1)
for j in range(lo, i + 1):
M[i][j] = 0.0
return M
One parameter — window. For window >= n, you recover full causal attention. For window =
1, each token attends only to itself.
Step 3: local + strided sparse mask
def strided_mask(n, window, stride):
M = [[float("-inf")] * n for _ in range(n)]
AIENGINEERINGFROMSCRATCH.COM 255

ATTENTION VARIANTS — SLIDING WINDOW, SPARSE, DIFFERENTIAL
for i in range(n):
lo = max(0, i - window + 1)
for j in range(lo, i + 1):
M[i][j] = 0.0
for j in range(0, i + 1, stride):
M[i][j] = 0.0
return M
Dense local window plus every stride-th token back to the start of the sequence. Receptive
field grows in log steps with additional layers.
Step 4: differential attention
def diff_attention(Q1, K1, Q2, K2, V, lam):
A1 = softmax_causal(Q1 @ K1.T / sqrt_d)
A2 = softmax_causal(Q2 @ K2.T / sqrt_d)
return (A1 - lam * A2) @ V
Two attention passes, subtract with a learned mixing coefficient. In the code we compare the
attention-sink heatmap of single vs differential and watch the sink collapse.
Step 5: KV cache sizes
Print the cache size per layer at N = 131072 for each variant. SWA and sparse variants drop
by 10–100×. Differential doubles. Pay your memory bill consciously.
Use It
2026 production patterns:
from transformers import AutoModelForCausalLM
# Gemma 3 mixes SWA (window=1024) and global layers at 5:1.
model = AutoModelForCausalLM.from_pretrained("google/gemma-3-27b-it")
# print(model.config.sliding_window, model.config.layer_types)
FlexAttention in PyTorch 2.5+ accepts a mask function:
from torch.nn.attention.flex_attention import flex_attention, create_block_mask
def swa_pattern(b, h, q_idx, kv_idx):
return (q_idx - kv_idx < 1024) & (q_idx >= kv_idx)
mask = create_block_mask(swa_pattern, B=batch, H=heads, Q_LEN=n, KV_LEN=n)
out = flex_attention(q, k, v, block_mask=mask)
This compiles to a custom Triton kernel. Within 10% of FlashAttention-3 speed for common
patterns, and the mask function is a Python callable.
When to pick each:
• Pure full attention — every layer up to ~16K context, or when retrieval quality is
paramount.
• SWA + global mix — long context (>32K), training and inference memory-bound. The
2026 default above 32K.
• Sparse block attention — custom kernel, custom pattern. Reserved for specialized
workloads (retrieval, audio).
AIENGINEERINGFROMSCRATCH.COM 256

ATTENTION VARIANTS — SLIDING WINDOW, SPARSE, DIFFERENTIAL
• Differential attention — any workload where attention-sink contamination hurts (long-
context RAG, needle-in-haystack).
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/07-transformers-deep-dive/15-attention-
variants
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engine
ering-from-scratch/tree/main/phases/07-transformers-deep-dive/15-attention-variants/code
1. Easy. Run code/main.py. Verify SWA at window=4 zeroes everything outside the last 4
tokens per row. Verify window=n reproduces full causal attention bit-identically.
2. Medium. Implement causal SWA with window=1024 on top of the Lesson 07 capstone.
Train for 1,000 steps on tinyshakespeare. How much does val loss regress vs full atten-
tion? How much does peak memory drop?
3. Hard. Implement a Gemma-3-style 5:1 layer mix (5 SWA, 1 global) in the capstone
model. Compare loss, memory, and generation quality against pure-SWA and pure-global
baselines at matched parameters.
4. Hard. Implement differential attention with a learned λ per head. Train on a synthetic
retrieval task (one needle, 2,000 distractors). Measure retrieval accuracy vs a single-
attention baseline at matched parameters.
Key Terms
Term What people say What it actually means
Sliding “Local attention” Each query attends to its last W tokens; KV
window cache shrinks to O(W).
attention
(SWA)
Effective “How far back the model sees” In an L-layer SWA stack with window W, up
receptive to L × W tokens.
field
Longformer “Local + global + random” Sparse patterns with a few
/ BigBird always-attending global tokens; early
long-context approach.
Native “DeepSeek’s kernel trick” Learn block-level sparsity; skip zero blocks
Sparse at the kernel level while keeping quality.
Attention
Differential “Two maps, one subtracts” DIFF Transformer: subtract a learned λ
attention times a second attention map from the first
to cancel attention sinks.
Attention “Weight bleeds to token 0” Softmax normalization forces rows to sum
sink to 1; uninformative queries dump weight on
position 0.
FlexAttention“Mask-as-Python” PyTorch 2.5+ API that compiles arbitrary
mask functions into FlashAttention-shape
kernels.
AIENGINEERINGFROMSCRATCH.COM 257

ATTENTION VARIANTS — SLIDING WINDOW, SPARSE, DIFFERENTIAL
Term What people say What it actually means
Layer type “5:1 SWA-to-global” Interleave sparse and full attention layers
mix in a stack to keep quality at lower memory.
Further Reading
• Beltagy, Peters, Cohan (2020). Longformer: The Long-Document Transformer — the
canonical sliding-window + global-token paper.
• Zaheer et al. (2020). Big Bird: Transformers for Longer Sequences — local + global +
random.
• Child et al. (2019). Generating Long Sequences with Sparse Transformers — OpenAI’s
local+strided pattern.
• Gemma Team (2024). Gemma 2: Improving Open Language Models at a Practical Size
— the 1:1 SWA:global mix.
• Gemma Team (2025). Gemma 3 technical report — the 5:1 mix with window=1024 that’s
now the textbook default.
• Ye et al. (2024). Differential Transformer — DIFF Transformer paper.
• Yuan et al. (2025). Native Sparse Attention — DeepSeek-V3.2’s learned-sparsity atten-
tion.
• PyTorch — FlexAttention blog and docs — API reference for the mask-as-callable pattern
in Use It.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/07-transformers-deep-dive/15-attention-variants
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/07-transformers-deep-dive/15-attention-variants/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 258