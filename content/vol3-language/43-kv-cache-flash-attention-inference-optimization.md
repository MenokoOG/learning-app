---
title: "KV Cache, Flash Attention & Inference Optimization"
volume: "vol3-language"
part: "Part II — Transformers Deep Dive"
chapter_number: 43
source_pages: "239-244"
---

# KV Cache, Flash Attention & Inference Optimization

KV Cache, Flash Attention & Inference
Optimization
Training is parallel and FLOP-bound. Inference is serial and memory-bound. Differ-
ent bottleneck, different tricks.
Type: Build Languages: Python Prerequisites: Phase 7 · 02 (Self-Attention), Phase 7 · 05
(Full Transformer), Phase 7 · 07 (GPT) Time: ~75 minutes
The Problem
A naive autoregressive decoder does O(N²) work to generate N tokens: at each step it recom-
putes attention over the full prefix. For a 4K-token response that is 16M attention operations,
most of them redundant. Every hidden state of a prefix token is deterministic once computed
— you only need to run the new token’s query against the cached keys and values of everything
before.
On top of that, attention itself moves a lot of data. Standard attention materializes an N×N
score matrix, N×d softmax output, N×d final output — too many reads and writes to HBM. For
N≥2K, attention becomes memory-bound before it becomes FLOP-bound. Classic attention
kernels underuse modern GPUs by 4–10×.
Two optimizations, both from Dao et al., pushed frontier inference from “slow” to “fast”:
1. KV cache. Store the K and V vectors of every prefix token. Each new token’s attention is
one query against the cached keys. Inference reduces from O(N²) to O(N) per generation
step.
2. Flash Attention. Tile the attention computation so the full N×N matrix never hits HBM.
All of softmax + matmul happens in SRAM. 2–4× wall-clock speedup on A100; 5–10× on
H100 with FP8.
By 2026 both are universal. Every production inference stack (vLLM, TensorRT-LLM, SGLang,
llama.cpp) assumes them. Every frontier model ships with Flash Attention enabled.
The Concept
KV cache math
Per decoder layer, per token, per head:
bytes_per_token_per_layer = 2 * d_head * dtype_size
^
K and V
For a 7B model with 32 layers, 32 heads, d_head=128, fp16:
per token per layer = 2 * 128 * 2 = 512 bytes
per token (32 layers) = 16 KB
per 32K context = 512 MB
AIENGINEERINGFROMSCRATCH.COM 236

KV CACHE, FLASH ATTENTION & INFERENCE OPTIMIZATION
KV cache grows. Flash Attention keeps the hot path in SRAM.
KV cache — decoding step by step Flash Attention — tiling into SRAM
t=1 k1 HBM SRAM (per SM)
v1 3 TB/s, 80 GB 30 TB/s, 256 KB
t=3 k1 k2 k3 Q K V Qt Kt Vt Ot
v1 v2 v3
O running (max, sum)
t=N
softmax exact, not approximated
no N×N ever materialized here
each new query attends to N cached k/v — O(N) per step, not O(N²)
Flash Attention version timeline
FA1 (2022) FA2 (2023) FA3 (2024) FA4 (2026) next
SRAM tiling better parallelism Hopper asynchrony, FP8 Blackwell 5-stage pipe backward + GQA
2× on A100 3× on A100 ~740 TFLOPs H100 inference-first varlen for training
KV cache and Flash Attention are universal in 2026 — vLLM, SGLang, TensorRT-LLM, llama.cpp all assume both.
Next frontier: PagedAttention (KV as virtual memory), prefix caching, speculative decoding.
Figure 31: KV cache growth and Flash Attention tiling
For Llama 3 70B (80 layers, d_head=128, GQA with 8 KV heads):
per token per layer = 2 * 8 * 128 * 2 = 4096 bytes (4 KB)
per 32K context = 10.4 GB
That 10 GB is why Llama 3 70B at 128K context needs most of a 40 GB A100 just for KV cache
at batch size 1.
GQA is the KV-cache win. MHA with 64 heads would be 32 GB. MLA compresses even
further.
Drag the dimensions and watch the cache size move. Push the sequence length or batch up
and see how fast it blows past a single GPU:
Interactive figure: kv-cache-sizer. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/07-
transformers-deep-dive/12-kv-cache-flash-attention
Flash Attention — the tiling trick
Standard attention:
S = Q @ K^T (HBM read, N×N, HBM write)
P = softmax(S) (HBM read, HBM write)
O = P @ V (HBM read, HBM write)
Three HBM round trips. On H100, HBM bandwidth is 3 TB/s; SRAM is 30 TB/s. Every HBM
trip is a factor-of-10 slowdown vs keeping everything on-chip.
Flash Attention:
AIENGINEERINGFROMSCRATCH.COM 237

KV CACHE, FLASH ATTENTION & INFERENCE OPTIMIZATION
for each block of Q (tile size ~128 × 128):
load Q_tile into SRAM
for each block of K, V:
load K_tile, V_tile into SRAM
compute S_tile = Q_tile @ K_tile^T (SRAM)
running softmax aggregation (SRAM)
accumulate into O_tile (SRAM)
write O_tile to HBM
One HBM trip per tile. Total memory footprint drops from O(N²) to O(N). Backward pass
recomputes some values from the forward pass instead of storing them — another memory
win.
Numerical trick. Running softmax maintains (max, sum) across tiles so the final normal-
ization is exact. Not an approximation — Flash Attention computes bit-identical output to
standard attention (modulo fp16 non-associativity).
Version evolution:
Version Year Key change Speedup on reference hardware
Flash 1 2022 Tiled SRAM 2× on A100
kernel
Flash 2 2023 Better 3× on A100
parallelism,
causal-first
ordering
Flash 3 2024 Hopper 1.5–2× on H100 (~740 TFLOPs FP16)
asynchrony, FP8
Flash 4 2026 Blackwell Inference-first (forward only initially)
5-stage pipeline,
software exp2
Flash 4 is forward-pass only at launch. Training still uses Flash 3. GQA and varlen support
for Flash 4 is pending (mid-2026).
Speculative decoding — the other latency win
Cheap model proposes N tokens. Big model verifies all N in parallel. If verification accepts
k tokens, you paid 1 big-model forward pass for k generations. Typical k=3–5 on code and
prose.
2026 defaults: - EAGLE 2 / Medusa. Integrated draft heads that share the verifier’s hidden
states. 2–3× speedup with no quality loss. - Speculative decoding with draft model. 2–4×
speedup on consumer hardware. - Lookahead decoding. Jacobi iteration; no draft model
needed. Niche but free.
Continuous batching
Classic batched inference: wait for the slowest sequence to finish, then start a new batch.
Wastes GPU when short responses finish early.
Continuous batching (first shipped in Orca, now in vLLM, TensorRT-LLM, SGLang): swap
new requests into the batch as soon as old ones finish. 5–10× throughput gain for typical
chat workloads.
AIENGINEERINGFROMSCRATCH.COM 238

KV CACHE, FLASH ATTENTION & INFERENCE OPTIMIZATION
PagedAttention — KV cache as virtual memory
vLLM’s headline feature. KV cache is allocated in 16-token blocks; a page table maps logical
positions to physical blocks. Lets you share KV across parallel samples (beam search, parallel
sampling), hot-swap prefixes for prompt caching, and defragment memory. 4× throughput
improvement over naive contiguous allocation.
Interactive figure: flash-attention-memory. This one moves. Watch it animate and drag
its controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=ph
ases/07-transformers-deep-dive/12-kv-cache-flash-attention
Build It
See code/main.py. We implement:
1. A naive O(N²) incremental decoder.
2. A O(N) KV-cached decoder.
3. A tiled softmax that simulates Flash Attention’s running-max algorithm.
Step 1: KV cache
class KVCache:
def __init__(self, n_layers, n_heads, d_head):
self.K = [[[] for _ in range(n_heads)] for _ in range(n_layers)]
self.V = [[[] for _ in range(n_heads)] for _ in range(n_layers)]
def append(self, layer, head, k, v):
self.K[layer][head].append(k)
self.V[layer][head].append(v)
def read(self, layer, head):
return self.K[layer][head], self.V[layer][head]
Simple: keep growing per-token K, V vectors in per-layer, per-head lists.
Step 2: tiled softmax
def tiled_softmax_dot(q, K, V, tile=4):
"""Flash-attention-style softmax(qK^T)V with running max/sum."""
m = float("-inf")
s = 0.0
out = [0.0] * len(V[0])
for start in range(0, len(K), tile):
k_block = K[start:start + tile]
v_block = V[start:start + tile]
scores = [sum(qi * ki for qi, ki in zip(q, k)) for k in k_block]
new_m = max(m, *scores)
exp_old = math.exp(m - new_m) if m != float("-inf") else 0.0
exp_new = [math.exp(sc - new_m) for sc in scores]
s = s * exp_old + sum(exp_new)
for j in range(len(out)):
out[j] = out[j] * exp_old + sum(e * v[j] for e, v in zip(exp_new, v_block))
m = new_m
return [o / s for o in out]
AIENGINEERINGFROMSCRATCH.COM 239

KV CACHE, FLASH ATTENTION & INFERENCE OPTIMIZATION
Bit-identical output to softmax(qK) V in one shot, but at any time the working set is a tile ×
d_head block, not the full N × d_head.
Step 3: compare naive vs cached decoding on 100-token generation
Count attention operations. Naive: O(N²) = 5050. Cached: O(N) = 100. The code prints both.
Use It
# HuggingFace transformers auto-enables KV cache on decoder-only generate().
from transformers import AutoModelForCausalLM
model = AutoModelForCausalLM.from_pretrained(
"meta-llama/Llama-3.2-3B",
attn_implementation="flash_attention_2", # use FA3 if Hopper
torch_dtype="bfloat16",
)
# generate() uses KV cache automatically
vLLM production:
pip install vllm
vllm serve meta-llama/Llama-3.1-70B-Instruct \
--tensor-parallel-size 4 \
--max-model-len 32768 \
--enable-prefix-caching \
--kv-cache-dtype fp8
Prefix caching across requests is a big 2026 win — the same system prompt, few-shot exam-
ples, or long context document reuses KV across calls. For agent workloads with repeated
tool prompts, prefix caching is routinely 5× throughput gain.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/07-transformers-deep-dive/12-kv-cache-flash-
attention
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/07-transformers-deep-dive/12-kv-cache-flash-
attention/code
1. Easy. Run code/main.py. Confirm the naive and cached decoders produce the same
output; note the op-count difference.
2. Medium. Implement prefix caching: given a prompt P and several completions, run one
forward pass over P to fill the KV cache, then branch per-completion. Measure speedup
vs re-encoding P for each.
3. Hard. Implement a toy PagedAttention: KV cache in fixed 16-token blocks with a free-list.
When a sequence finishes, return its blocks to the pool. Simulate 1,000 chat completions
with varying lengths. Compare memory fragmentation vs contiguous allocation.
Key Terms
AIENGINEERINGFROMSCRATCH.COM 240

KV CACHE, FLASH ATTENTION & INFERENCE OPTIMIZATION
Term What people say What it actually means
KV cache “The trick that makes decoding Stored K and V from every prefix token;
fast” new queries attend to them instead of
recomputing.
HBM “GPU main memory” High Bandwidth Memory; 80 GB on H100,
192 GB on B200. ~3 TB/s bandwidth.
SRAM “On-chip memory” Per-SM fast memory, ~256 KB per SM on
H100. ~30 TB/s bandwidth.
Flash “Tiled attention kernel” Computes attention without materializing
Attention N×N in HBM.
Continuous “No-wait batching” Swap finished sequences out, new ones in,
batching without draining the batch.
PagedAttentio“nvLLM’s headline” KV cache allocated in fixed blocks with a
page table; eliminates fragmentation.
Prefix “Reuse long prompts” Cache KV for a shared prefix across
caching requests; major cost cut for agents.
Speculative “Draft + verify” Cheap draft model proposes tokens; big
decoding model verifies k in one pass.
Further Reading
• Dao et al. (2022). FlashAttention: Fast and Memory-Efficient Exact Attention with IO-
Awareness — Flash 1.
• Dao (2023). FlashAttention-2: Faster Attention with Better Parallelism and Work Parti-
tioning — Flash 2.
• Shah et al. (2024). FlashAttention-3: Fast and Accurate Attention with Asynchrony and
Low-precision — Flash 3.
• FlashAttention-4 release notes (Dao-AILab, 2026) — Blackwell 5-stage pipeline and the
software-exp2 trick; read the repo README for the forward-only launch caveats this
lesson mentions.
• Kwon et al. (2023). Efficient Memory Management for Large Language Model Serving
with PagedAttention — vLLM paper.
• Leviathan et al. (2023). Fast Inference from Transformers via Speculative Decoding —
spec decoding.
• Li et al. (2024). EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty
— EAGLE-1/2 paper for the integrated-draft approach the lesson cites.
• Cai et al. (2024). Medusa: Simple LLM Inference Acceleration Framework with Multiple
Decoding Heads — the Medusa approach referenced alongside EAGLE.
• vLLM docs — PagedAttention — the canonical deep dive on the 16-token block and page-
table design.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/07-transformers-deep-dive/12-kv-cache-flash-attention
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/07-transformers-deep-dive/12-kv-cache-flash-attention/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 241