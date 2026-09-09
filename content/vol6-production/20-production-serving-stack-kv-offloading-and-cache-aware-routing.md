---
title: "Production Serving Stack — KV Offloading and Cache-Aware Routing"
volume: "vol6-production"
part: "Part I — Infrastructure & Production"
chapter_number: 20
source_pages: "90-93"
---

# Production Serving Stack — KV Offloading and Cache-Aware Routing

Production Serving Stack — KV Offload-
ing and Cache-Aware Routing
A production serving stack wires router, engines, and observability into one Ku-
bernetes deployment — and treats KV cache as a resource that can leave the GPU.
KV offloading extracts KV cache out of GPU memory and reuses it across queries
and engines (CPU DRAM, then disk/Ceph). vLLM’s production-stack is the refer-
ence deployment; LMCache is the offloading layer. The vLLM 0.11.0 KV Offloading
Connector (January 2026) makes this asynchronous and pluggable via the Connec-
tor API (v0.9.0+). The offload path is usually hidden from the request path, though
cache misses and promotions can add end-to-end latency. LMCache is valuable even
without shared prefixes — when a GPU runs out of KV slots, preempted requests
can be restored from CPU instead of recomputing prefill. Published benchmarks
on 16x H100 (80GB HBM) across 4 a3-highgpu-4g: when KV cache exceeds HBM,
both native CPU offload and LMCache substantially improve throughput; at low KV
footprint, all configs match baseline with small overhead.
Type: Learn Languages: Python (stdlib, toy KV-spill simulator) Prerequisites: Phase 17 ·
04 (Serving Engine Internals), Phase 17 · 06 (SGLang/RadixAttention) Time: ~60 minutes
Learning Objectives
• Diagram the vLLM production-stack layers: router, engines, KV offload, observability.
• Explain the KV Offloading Connector API (v0.9.0+) and how the 0.11.0 asynchronous
path hides offload latency.
• Quantify when LMCache CPU-DRAM helps (KV > HBM) vs adds overhead (KV small
enough to fit HBM).
• Pick between native vLLM CPU offload and LMCache connector given deployment con-
straints.
The Problem
Your vLLM serving shows GPUs at 100% HBM with preemption events whenever concurrency
climbs. Requests get evicted, requeued, and you re-prefill the same 2K-token prompt four
times in a minute. GPU compute is spent on redundant prefills; goodput is well below raw
throughput.
Adding more GPUs costs linearly. Adding more HBM is not possible. But CPU DRAM is
cheap — one socket has 512 GB+ at latency orders of magnitude worse than HBM but fine
for “temporarily warm” KV cache.
LMCache extracts KV cache to CPU DRAM so preempted requests recover fast, and repeated
prefixes across engines share cache without each engine re-prefilling.
AIENGINEERINGFROMSCRATCH.COM 83

PRODUCTION SERVING STACK — KV OFFLOADING AND CACHE-AWARE ROUTING
The Concept
vLLM production-stack
github.com/vllm-project/production-stack is the reference Kubernetes deployment:
• Router — cache-aware (Phase 17 · 11). Consumes KV events.
• Engines — vLLM workers. One per GPU or per TP/PP group.
• KV cache offload — LMCache deployment or native connector.
• Observability — Prometheus scrape, Grafana dashboards, OTel traces.
• Control plane — service discovery, config, rolling updates.
Shipped as Helm chart + operator.
The KV Offloading Connector API (v0.9.0+)
vLLM 0.9.0 introduced a Connector API for pluggable KV cache backends. Your engine of-
floads blocks to the connector; connector stores them (RAM, disk, object storage, LMCache).
Request needs a block, connector loads it back.
vLLM 0.11.0 (January 2026) adds an asynchronous offload path — offload can happen in the
background so the engine does not block on it in the common case. End-to-end latency and
throughput still depend on workload shape, KV cache hit rate, and system pressure; vLLM’s
own notes call out that custom-kernel offload can degrade throughput at low hit rates and
that async scheduling has known interaction issues with speculative decoding.
Native CPU offload vs LMCache
Native vLLM CPU offload: engine-local. Stores KV blocks in host RAM. Fast to implement,
zero network hop. Does not cross engines.
LMCache connector: cluster-scale. Stores blocks in a shared LMCache server (CPU DRAM
+ Ceph/S3 tier). Blocks are accessible to any engine. 16x H100 benchmarks published.
Pick native when a single engine has HBM pressure. Pick LMCache when multiple engines
share prefixes (RAG with common system prompts, multi-tenant with shared templates).
Benchmark behavior
The 16x H100 (80 GB HBM) spread across 4 a3-highgpu-4g test:
• Low KV footprint (short prompts, low concurrency): all configs match baseline, LMCache
adds ~3-5% overhead.
• Moderate footprint: LMCache starts to help on prefix reuse across engines.
• KV exceeds HBM: native CPU offload and LMCache both improve throughput substan-
tially; LMCache larger gain because cross-engine sharing.
When LMCache is decisive
• Multi-tenant serving where system prompts are shared across tenants.
• RAG where document chunks repeat across queries.
• Fine-tuned variants (LoRA) on the same base where base-model KV reuse cuts redundant
work.
• Preemption-heavy workloads: restore from CPU cheaper than re-prefill.
AIENGINEERINGFROMSCRATCH.COM 84

PRODUCTION SERVING STACK — KV OFFLOADING AND CACHE-AWARE ROUTING
When NOT to enable
• Small HBM pressure — you pay overhead without benefit.
• Short contexts (<1K tokens) — transfer time > re-prefill.
• Single-tenant single-prompt workload — no reuse to capture.
Integration with disaggregated serving
Phase 17 · 17 disaggregated serving + LMCache compounds: KV transfers from prefill pool
to decode pool land in LMCache if not used; subsequent queries pull from LMCache. Phase
17 · 11 cache-aware router can route to the engine whose local OR LMCache-shared cache
matches.
Numbers you should remember
• vLLM 0.9.0: Connector API shipped.
• vLLM 0.11.0 (Jan 2026): asynchronous offload path; end-to-end latency impact depends
on workload, KV hit rate, and system pressure (not an absolute guarantee).
• 16x H100 benchmark: LMCache helps when KV footprint exceeds HBM.
• Small HBM pressure: 3-5% overhead without benefit.
Interactive figure: zero-sharding. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/17-
infrastructure-and-production/18-vllm-production-stack-lmcache
Use It
code/main.py simulates a preemption-heavy workload with and without LMCache. Reports
re-prefills avoided, throughput gain, and the break-even HBM utilization.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/17-infrastructure-and-production/18-vllm-
production-stack-lmcache
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/17-infrastructure-and-production/18-vllm-
production-stack-lmcache/code
1. Run code/main.py. At what HBM utilization does LMCache start paying?
2. A tenant shares a 6K-token system prompt across 200 queries/hour. Compute expected
LMCache savings per tenant.
3. The LMCache server is a single point of failure. Design the HA strategy (replicas, fallback
to native).
4. LMCache stores to Ceph on spinning disk. For a 4K-token KV at 70B FP8 (500 MB),
what’s the read time vs re-prefill?
5. Argue whether the vLLM 0.11.0 asynchronous path is “free” — where does the overhead
hide?
AIENGINEERINGFROMSCRATCH.COM 85

PRODUCTION SERVING STACK — KV OFFLOADING AND CACHE-AWARE ROUTING
Key Terms
Term What people say What it actually means
Production- “the reference deployment” vLLM’s Kubernetes Helm chart + operator
stack
Connector “KV backend interface” vLLM 0.9.0+ pluggable KV store interface
API
Native “engine-local spill” Store KV in host RAM of same engine
CPU
offload
LMCache “cluster KV cache” Cross-engine KV cache server on CPU DRAM
+ disk
0.11.0 “non-blocking offload” Offload hidden behind engine stream
async
Preemption “evict to make room” KV cache shuffle when HBM full
Prefix “same system prompt” Multiple queries share beginning; cache hit
reuse
Ceph tier “disk tier” Durable storage below DRAM in the cache
hierarchy
Further Reading
• vLLM Blog — KV Offloading Connector (Jan 2026)
• vLLM Production Stack GitHub — Helm chart + operator.
• LMCache for Enterprise-Scale LLM Inference (arXiv:2510.09665)
• LMCache GitHub — Connector implementation.
• vLLM 0.11.0 release notes — asynchronous path details.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/17-infrastructure-and-production/18-vllm-production-stack-
lmcache
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scra
tch/tree/main/phases/17-infrastructure-and-production/18-vllm-production-stack-
lmcache/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/les
son.html?path=phases/17-infrastructure-and-production/18-vllm-production-stack-
lmcache
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 86