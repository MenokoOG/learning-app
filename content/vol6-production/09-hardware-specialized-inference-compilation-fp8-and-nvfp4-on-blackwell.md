---
title: "Hardware-Specialized Inference Compilation — FP8 and NVFP4 on Blackwell"
volume: "vol6-production"
part: "Part I — Infrastructure & Production"
chapter_number: 9
source_pages: "40-43"
---

# Hardware-Specialized Inference Compilation — FP8 and NVFP4 on Blackwell

Hardware-Specialized Inference Compi-
lation — FP8 and NVFP4 on Blackwell
Hardware-specialized inference compilation trades portability for throughput, and
TensorRT-LLM — NVIDIA-only, tuned for Blackwell — is the clearest example of
the trade paying off. On GB200 NVL72 with Dynamo orchestration, SemiAnal-
ysis InferenceX measured $0.012 per million tokens on a 120B model in Q1-Q2
2026, against $0.09/M on H100 + vLLM — a 7x economic gap. The stack is three
floating-point regimes compounded: FP8 stays critical for KV cache and attention
kernels because it has the dynamic range they need; NVFP4 (4-bit microscaling)
handles weights and activations; multi-token prediction (MTP) and disaggregated
prefill/decode add another 2-3x on top. Day-0 model support loads FP4 weights
directly without post-training conversion. The catch for 2026 engineering teams:
TRT-LLM is open-source but NVIDIA-specific — CUDA- and Blackwell-specialized
— so adopting it trades portability for throughput. Run the math on your mix of
models and hardware before committing.
Type: Learn Languages: Python (stdlib, toy FP8/NVFP4 memory and cost calculator) Pre-
requisites: Phase 17 · 04 (Serving Engine Internals), Phase 10 · 13 (Quantization) Time:
~75 minutes
Learning Objectives
• Explain why FP8 stays critical for KV cache and attention even when weights are in
NVFP4.
• Compute the HBM footprint of a frontier model under BF16, FP8, and NVFP4 and reason
about where the savings come from.
• Name the Blackwell-specific features TRT-LLM exploits (day-0 FP4, MTP, disaggregated
serving, all-to-all primitives).
• Decide when TRT-LLM’s NVIDIA-lock is worth the 7x cost gap vs vLLM on Hopper.
The Problem
The frontier of inference economics in 2026 is “how many tokens per dollar”. The answer
depends on four stacked choices: hardware generation (Hopper H100/H200 vs Blackwell
B200/GB200), precision (BF16 → FP8 → NVFP4), serving engine (vLLM vs SGLang vs TRT-
LLM), and orchestration (plain vs disaggregated vs Dynamo).
On Hopper with vLLM, a 120B MoE runs at ~$0.09 per million tokens. On Blackwell with
TRT-LLM + Dynamo, the same model runs at ~$0.012 — 7x cheaper. Some of that gap is
hardware (Blackwell is 11-15x per-GPU LLM throughput vs Hopper). Some is the stack: FP4
weights, MTP draft, disaggregated prefill/decode, and NVLink 5 all-to-all for MoE expert com-
munication.
You cannot replicate this outside NVIDIA’s stack. That is the tradeoff — portability for eco-
nomics. Understanding which stack choices give which share of the gap is the point of this
AIENGINEERINGFROMSCRATCH.COM 33

HARDWARE-SPECIALIZED INFERENCE COMPILATION — FP8 AND NVFP4 ON BLACKWELL
lesson.
The Concept
Why FP8 is still the floor for KV cache
A common mistake in 2026: assuming NVFP4 applies everywhere. It does not. KV cache
needs FP8 (8-bit floating point) because it stores attention keys and values that span a wide
dynamic range. Quantizing KV to FP4 causes catastrophic accuracy loss — the tail of the
distribution drops off and attention scores collapse. FP8’s exponent bits give KV cache the
range it needs.
NVFP4 (2025-2026) applies to weights and activations. Microscaling: each block of weights
has its own scale factor so small blocks can span different dynamic ranges without per-tensor
scale loss. For activations, FP4 holds up because activations are small-range within a layer.
The typical Blackwell config:
• Weights: NVFP4 (4-bit microscaling).
• Activations: NVFP4.
• KV cache: FP8.
• Attention accumulator: FP32 (softmax stability).
The Blackwell-specific primitives TRT-LLM uses
• Day-0 FP4 weights: model providers ship FP4 weights directly; TRT-LLM loads without
post-training conversion. No AWQ / GPTQ step for FP4.
• Multi-token prediction (MTP): same idea as EAGLE (Phase 17 · 05) but integrated
into the TRT-LLM build.
• Disaggregated serving: prefill and decode on separate GPU pools, KV cache trans-
ferred over NVLink or InfiniBand. Same idea as Dynamo (Phase 17 · 20).
• All-to-all communication primitives: NVLink 5 cut MoE expert communication la-
tency by 3x vs Hopper. TRT-LLM’s MoE kernels are tuned for this.
• NVFP4 + MXFP8 microscaling: hardware-accelerated scale-factor handling on Black-
well Tensor Cores.
The numbers you should memorize
• HGX B200 at $0.02/M tokens on GPT-OSS-120B via TRT-LLM.
• GB200 NVL72 at $0.012/M tokens via Dynamo (orchestrating TRT-LLM).
• H100 + vLLM ≈ $0.09/M tokens on comparable workload.
• 2.8x throughput gain in three months of TRT-LLM updates (2026).
• 11-15x per-GPU LLM throughput, Blackwell vs Hopper.
• MLPerf Inference v6.0 (April 2026): Blackwell dominates every submitted task.
What FP4 actually costs in quality
NVFP4 is aggressive. On reasoning-heavy workloads (chain-of-thought, math, code-gen with
long context), FP4 weights degrade visibly. Per-block calibration mitigates but does not elim-
inate. Teams shipping reasoning models often use FP8 weights + FP4 activations as a com-
promise, or stick to H200 with FP8 throughout.
The rule: always validate task quality on your eval set before committing to NVFP4 weights.
AIENGINEERINGFROMSCRATCH.COM 34

HARDWARE-SPECIALIZED INFERENCE COMPILATION — FP8 AND NVFP4 ON BLACKWELL
Why this is an NVIDIA-lock decision
TRT-LLM is C++ + CUDA + closed-source kernels. Models need to be compiled for a specific
GPU SKU. No AMD, no Intel, no ARM. If your infra strategy is multi-vendor, TRT-LLM is a
non-starter for the TRT-LLM-served tier — you can still serve from vLLM on mixed hardware.
If you are NVIDIA-only, the 7x gap pays for the lock.
2026 practical recipe
For a $100M+ annual inference bill, running on Hopper + vLLM leaves 7-10x on the table.
Migrate cost-dominant workloads to Blackwell + TRT-LLM + Dynamo. Keep experimentation
tier on H100 + vLLM for model iteration speed. Validate quality on each NVFP4-converted
model before production.
The disaggregation bonus
TRT-LLM’s disaggregated serving (separate prefill and decode pools) is covered in depth in
Phase 17 · 20. On Blackwell, the multiplier stacks: FP4 weights × MTP speedup × disaggre-
gated placement × cache-aware routing. The 7x number assumes this full stack.
Interactive figure: pipeline-parallel. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/17-infrastructure-and-production/07-tensorrt-llm-blackwell
Use It
code/main.py computes HBM footprint, decode throughput (memory-bound regime), and $/M-
tokens for a model across three stacks: H100 + BF16 + vLLM, H100 + FP8 + vLLM, B200 +
NVFP4/FP8 + TRT-LLM. Run it to see the compounding effect and the share of the gap each
change contributes.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/17-infrastructure-and-production/07-tensorrt-
llm-blackwell
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/17-infrastructure-and-production/07-tensorrt-
llm-blackwell/code
1. Run code/main.py. On a 120B MoE with 30% active parameters, compute the memory-
bandwidth-limited decode throughput on H100 BF16, H100 FP8, and B200 NVFP4/FP8.
Where does the biggest jump come from?
2. A customer spends $2M/year on H100 + vLLM. What is the break-even number of Black-
well GPUs they need to buy to amortize a migration to TRT-LLM in 12 months, given the
7x economic gap?
3. You see accuracy drop 3 points on MATH after NVFP4 weight conversion. Name two
recovery paths: one quality-first (keep FP8 weights), one cost-first (calibrate with in-
domain data).
4. Read the MLPerf v6.0 inference results. Which task has the smallest Blackwell-over-
Hopper gap, and why?
AIENGINEERINGFROMSCRATCH.COM 35

HARDWARE-SPECIALIZED INFERENCE COMPILATION — FP8 AND NVFP4 ON BLACKWELL
5. Compute the HBM needed for a 405B model at NVFP4 weights + FP8 KV cache at 128k
context. Does it fit on a single GB200 NVL72 node?
Key Terms
Term What people say What it actually means
FP8 “eight-bit float” 8-bit floating point; used for KV cache and
attention due to dynamic range
NVFP4 “four-bit micro” NVIDIA’s 4-bit microscaling FP format;
weights and activations on Blackwell
MXFP8 “MX eight” Microscaling FP8 variant;
hardware-accelerated on Blackwell Tensor
Cores
Day-0 FP4 “ship FP4 weights” Model providers release weights already in
FP4; no post-train conversion step
MTP “multi-token prediction” TRT-LLM’s integrated speculative-decoding
draft (Phase 17 · 05)
Disaggregated“split prefill/decode” Prefill and decode on separate GPU pools; KV
serving transferred over NVLink/IB
All-to-all “MoE expert comm” Communication pattern routing tokens to
expert GPUs; NVLink 5 cuts 3x
InferenceX “SemiAnalysis inference The 2026 industry-accepted cost-per-token
bench” benchmark
Further Reading
• NVIDIA — Blackwell Ultra MLPerf Inference v6.0 — April 2026 MLPerf results.
• NVIDIA — MoE Inference on Blackwell — NVLink 5 all-to-all and MoE kernels.
• TensorRT-LLM Overview — official engine documentation.
• NVIDIA — Introducing Dynamo — disaggregated orchestration above TRT-LLM.
• MLPerf Inference — the benchmark suite that publishes Blackwell numbers.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/17-infrastructure-and-production/07-tensorrt-llm-blackwell
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/17-infrastructure-and-production/07-tensorrt-llm-blackwell/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/17-infrastructure-and-production/07-tensorrt-llm-blackwell
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 36