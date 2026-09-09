---
title: "Capstone 14 — Speculative-Decoding Inference Server"
volume: "vol6-production"
part: "Part III — Capstone Projects"
chapter_number: 73
source_pages: "322-325"
---

# Capstone 14 — Speculative-Decoding Inference Server

Capstone 14 — Speculative-Decoding In-
ference Server
Speculative decoding — a cheap draft proposes tokens, the target model verifies
them in one pass — is now a production-ready optimization, not a research trick.
EAGLE-3 in vLLM 0.7 ships 2.5-3x throughput on real traffic. P-EAGLE (AWS 2026)
pushed parallel speculation even further. SGLang’s SpecForge trained draft heads
at scale. Red Hat’s Speculators hub published aligned drafts for common open
models. TensorRT-LLM made speculative decoding first-class on NVIDIA. The 2026
production serving stack is vLLM or SGLang with EAGLE-family drafts, FP8 or INT4
quantization, and HPA on queue-wait. This capstone is to serve two open models at
2.5x+ baseline throughput with a full tail-latency report.
Type: Capstone Languages: Python (serving), C++ / CUDA (kernel inspection), YAML (con-
figs) Prerequisites: Phase 3 (deep learning), Phase 7 (transformers), Phase 10 (LLMs from
scratch), Phase 17 (infrastructure) Phases exercised: P3 · P7 · P10 · P17 Time: 30 hours
Problem
Speculative decoding became a commodity in 2026. EAGLE-3 draft heads train on the target
model’s hidden states and predict N tokens ahead; the target model verifies in a single pass.
Acceptance rates of 60-80% translate to 2-3x end-to-end throughput. vLLM 0.7 integrates
this natively. SGLang + SpecForge gives you the training pipeline. Red Hat’s Speculators
publishes aligned drafts for Llama 3.3 70B, Qwen3-Coder-30B MoE, GPT-OSS-120B.
The craft is in the serving operations, not the model. Acceptance rate drifts with the traf-
fic distribution (ShareGPT vs code vs domain data). Tail latency under rejection is worse
than without speculation — you must report p99 at multiple batch sizes, not just steady-state
tokens/sec. Cost per 1M tokens vs Anthropic / OpenAI API is the credibility lever.
Concept
Speculative decoding has two layers. A draft model (EAGLE-3 head, ngram, or smaller target-
aligned model) proposes k candidate tokens per step. The target model verifies all k in one
pass; any prefix accepted replaces the greedy path. Acceptance rate depends on draft-target
alignment and the input distribution.
EAGLE-3 beats ngram drafts on most traffic. P-EAGLE runs parallel speculation for deeper
draft trees. The trade-off: P99 latency on rejection is higher because the verify pass is larger.
The serving config must report batch-size-bucketed latency to surface this.
Deployment is Kubernetes. vLLM 0.7 runs one replica per GPU or tensor-parallel shard. HPA
autoscales on queue-wait rather than CPU. FP8 (Marlin) and INT4 (AWQ) quants keep GPU
memory inside an H100 / H200 envelope. The end-to-end report is throughput, acceptance
rate, p50/p99 at batch 1/8/32, and $/1M tokens.
AIENGINEERINGFROMSCRATCH.COM 315

CAPSTONE 14 — SPECULATIVE-DECODING INFERENCE SERVER
Architecture
request ingress
|
v
vLLM server (0.7) or SGLang (0.4)
|
+-- draft: EAGLE-3 heads | P-EAGLE parallel | ngram fallback
+-- target: Llama 3.3 70B | Qwen3-Coder-30B | GPT-OSS-120B
| quantized FP8-Marlin or INT4-AWQ
|
v
verify pass: batch k draft tokens through target
|
v (accept prefix; resample for rejected suffix)
v
token stream back to client
|
v
Prometheus metrics: throughput, acceptance rate, queue wait, latency p50/p99
|
v
HPA on queue-wait metric
Stack
• Serving: vLLM 0.7 or SGLang 0.4
• Speculative methods: EAGLE-3 draft heads, P-EAGLE parallel speculation, ngram fall-
back
• Draft training: SpecForge (SGLang) or Red Hat Speculators
• Target models: Llama 3.3 70B, Qwen3-Coder-30B MoE, GPT-OSS-120B
• Quantization: FP8 (Marlin), INT4 AWQ
• Deployment: Kubernetes + NVIDIA device plugin; HPA on queue-wait metric
• Eval: ShareGPT, MT-Bench-v2, GSM8K, HumanEval for domain-spread acceptance mea-
surement
• Reference: TensorRT-LLM speculative decoding for a vendor baseline
Interactive figure: cf-spec-decode. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/19-
capstone-projects/14-speculative-decoding-server
Build It
1. Target model prep. Pick Llama 3.3 70B. Quantize to FP8 via Marlin. Deploy under
vLLM 0.7 on 1xH100 (or 2x tensor-parallel).
2. Draft source. Pull an aligned EAGLE-3 draft head from Red Hat Speculators (or train
one via SpecForge). Load into vLLM’s speculative-decoding config.
3. Baseline numbers. Before speculation: tokens/s at batch 1/8/32, p50/p99 latency, GPU
utilization. Publish.
AIENGINEERINGFROMSCRATCH.COM 316

CAPSTONE 14 — SPECULATIVE-DECODING INFERENCE SERVER
4. Enable EAGLE-3. Flip config; rerun the same benchmark. Report speedup, acceptance
rate, p99 tail-latency delta.
5. P-EAGLE. Enable parallel speculation; measure deeper draft tree vs serial EAGLE-3.
Report the inflection where P-EAGLE helps vs hurts.
6. Domain traffic. Run ShareGPT vs HumanEval vs domain-specific traffic through the
same server. Measure acceptance rate per distribution. Identify when drafts drift.
7. Second target model. Run the same pipeline on Qwen3-Coder-30B MoE. Draft is trick-
ier (MoE routing noise). Report.
8. K8s HPA. Deploy under K8s with HPA tracking queue_wait_ms. Demonstrate scale-out
when load triples.
9. Cost comparison. Compute $/1M tokens vs Anthropic Claude Sonnet 4.7 and OpenAI
GPT-5.4 on the same eval. Publish.
Use It
$ curl https://infer.example.com/v1/chat/completions -d '{"messages":[...]}'
[serve] vLLM 0.7, Llama 3.3 70B FP8, EAGLE-3 active
[decode] bs=8, accepted_tokens_per_step=3.2, acceptance_rate=0.76
[latency] first-token 42ms, full-response 980ms (620 tokens)
[cost] $0.34 per 1M output tokens at sustained throughput
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/19-capstone-projects/14-speculative-decoding-
server
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/19-capstone-projects/14-speculative-decoding-
server/code
1. Measure acceptance-rate degradation when the draft is one version behind the target
(e.g., Llama 3.3 -> 3.4 drift). Build a monitoring alert.
2. Implement ngram-fallback: if EAGLE-3 acceptance drops below a threshold, switch to
ngram drafts. Report reliability improvement.
3. Run a controlled MoE experiment: same Qwen3-Coder-30B with routing noise injected
vs without. Measure draft acceptance sensitivity.
4. Extend to H200 (141 GB). Report the model-size-per-replica headroom gained and
whether you can serve an unquantized Llama 3.3 70B.
5. Benchmark TensorRT-LLM speculative decoding on the same H100 hardware. Report
where it wins vs vLLM.
Key Terms
AIENGINEERINGFROMSCRATCH.COM 317

CAPSTONE 14 — SPECULATIVE-DECODING INFERENCE SERVER
Term What people say What it actually means
Draft “Speculator” Small model that proposes N tokens for the
model target to verify
EAGLE-3 “2026 draft architecture” Draft head trained on target hidden states;
~75% acceptance
P-EAGLE “Parallel speculation” Tree of draft branches verified in one target
pass
Acceptance “Hit rate” Fraction of drafted tokens accepted without
rate resampling
Quantization “FP8 / INT4” Lower-precision weights to fit more model in
GPU memory
Queue “HPA metric” Time a request waits in the pending queue
wait before inference starts
Speculators “Aligned drafts” Red Hat Neural Magic hub of EAGLE drafts
hub for common open models
Further Reading
• vLLM EAGLE and P-EAGLE documentation — the reference serving stack
• P-EAGLE (AWS 2026) — parallel speculative decoding paper + integration
• SGLang SpecForge — draft-head training pipeline
• Red Hat Speculators — aligned draft hub
• TensorRT-LLM speculative decoding — vendor alternative
• Fireworks.ai serving architecture — commercial reference
• EAGLE-3 paper (arXiv:2503.01840) — the method paper
• vLLM repository — code and benchmarks
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/19-capstone-projects/14-speculative-decoding-server
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/19-capstone-projects/14-speculative-decoding-server/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/19-capstone-projects/14-speculative-decoding-server
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 318