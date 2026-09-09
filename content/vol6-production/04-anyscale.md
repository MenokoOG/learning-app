---
title: "Anyscale"
volume: "vol6-production"
part: "Part I — Infrastructure & Production"
chapter_number: 4
source_pages: "16-20"
---

# Anyscale

Inference Platform Economics — Fire-
works, Together, Baseten, Modal, Repli-
cate, Anyscale
The 2026 inference market is no longer GPU time rental. It bifurcates into cus-
tom silicon (Groq, Cerebras, SambaNova), GPU platforms (Baseten, Together, Fire-
works, Modal), and API-first marketplaces (Replicate, DeepInfra). Fireworks raised
price $1/hr per GPU on May 1, 2026, and $4B valuation on 10T+ tokens/day tells
you the volume-driven model works. Baseten closed $300M Series E at $5B in Jan-
uary 2026. The competitive positioning rule is simple: Fireworks optimizes latency,
Together optimizes catalog breadth, Baseten optimizes enterprise polish, Modal
optimizes Python-native DX, Replicate optimizes multimodal reach, Anyscale opti-
mizes distributed Python. This lesson gives you a matrix you can hand a founder.
Type: Learn Languages: Python (stdlib, toy per-call economics comparator) Prerequisites:
Phase 17 · 01 (Managed LLM Platforms), Phase 17 · 04 (Serving Engine Internals) Time: ~60
minutes
Learning Objectives
• Name the three market segments (custom silicon, GPU platforms, API-first) and map
each vendor to a segment.
• Explain why the “per-token” API pricing model compresses toward the serving engine’s
cost curve, not the hardware’s.
• Compute effective cost per request across at least three vendors and explain when per-
minute (Baseten, Modal) beats per-token.
• Identify which platform is the right default for a given workload (serverless bursty, steady
high-throughput, fine-tuned variants, multimodal).
The Problem
You evaluated managed hyperscaler platforms. You decided you need a narrower, faster
provider — Fireworks for latency, Together for breadth, Baseten for a fine-tuned custom
model. Now you have six real choices and the pricing pages do not line up. Fireworks shows
$/M tokens; Baseten shows $/minute; Modal shows $/second; Replicate shows $/prediction.
You cannot compare them head-to-head without modeling the workload.
Worse, the business model behind each pricing page is different. Fireworks runs its own
custom engine (FireAttention) on shared GPUs; the per-token rate reflects their utilization
curve. Baseten gives you Truss + dedicated GPUs; per-minute reflects exclusivity. Modal is
true Python serverless — per-second billing with sub-second cold starts. Same output (an
LLM response), three different cost functions.
This lesson models the six and tells you when each wins.
AIENGINEERINGFROMSCRATCH.COM 9

INFERENCE PLATFORM ECONOMICS — FIREWORKS, TOGETHER, BASETEN, MODAL, REPLICATE, ANYSCALE
The Concept
The three segments
Custom silicon — Groq (LPU), Cerebras (WSE), SambaNova (RDU). Typically 5-10x faster
decode than a GPU-based cluster on the same model. Higher per-token price (Groq was
~$0.99/M on Llama-70B late 2025) but unbeatable for latency-sensitive use cases. Groq is
the production pick for voice agents and real-time translation.
GPU platforms — Baseten, Together, Fireworks, Modal, Anyscale. Run on NVIDIA (H100,
H200, B200 in 2026) or sometimes AMD. The economic layer between “raw GPU rental” (Run-
Pod, Lambda) and “hyperscaler managed service” (Bedrock).
API-first marketplaces — Replicate, DeepInfra, OpenRouter, Fal. Broad catalog, pay-per-
prediction or pay-per-second, emphasize time-to-first-call.
Fireworks — latency-optimized GPU platform
• FireAttention engine (custom); marketed as 4x lower latency than vLLM on equivalent
configs.
• Batch tier at ~50% of serverless rate for non-interactive workloads.
• Fine-tuned model served at the same rate as the base model — a real differentiator versus
providers that charge a premium for your LoRA.
• Mid-2026: raised on-demand GPU rental $1/hour effective May 1, 2026. Volume pricing
negotiable at scale.
• Financial signal: $4B valuation, 10T+ tokens/day handled.
Together — breadth-optimized
• 200+ models including open-source releases within days of upstream publication.
• 50-70% cheaper than Replicate on equivalent LLM models — the “AI Native Cloud” po-
sitioning is volume and catalog.
• Inference + fine-tuning + training in one API.
Baseten — enterprise-polish-optimized
• Truss framework: model packaging with dependencies, secrets, serving config in one
manifest.
• GPU range from T4 through B200. Per-minute billing with reasonable cold-start mitiga-
tion.
• SOC 2 Type II, HIPAA-ready. Common fintech and healthcare pick.
• $5B valuation, January 2026 Series E ($300M from CapitalG, IVP, NVIDIA).
Modal — Python-native-optimized
• Infrastructure-as-code in pure Python. Decorate a function with @modal.function(gpu="A100")
and deploy with one command.
• Per-second billing. Cold starts 2-4s with pre-warming; <1s for small models.
• $87M Series B at $1.1B valuation (2025). Strongest developer experience score in inde-
pendent surveys.
Replicate — multimodal breadth
• Pay-per-prediction. The default platform for image, video, and audio models.
AIENGINEERINGFROMSCRATCH.COM 10

INFERENCE PLATFORM ECONOMICS — FIREWORKS, TOGETHER, BASETEN, MODAL, REPLICATE, ANYSCALE
• Integration ecosystem (Zapier, Vercel, CMS plugins).
• Less competitive on LLM per-token rates but wins on multimodal variety.
Anyscale — Ray-native
• Built on Ray; RayTurbo is Anyscale’s proprietary inference engine (competes with
vLLM).
• Best for distributed Python workloads where the inference step is one node in a larger
graph.
• Managed Ray clusters; tight integration with Ray AIR and Ray Serve.
Per-token versus per-minute — when each wins
Per-token makes sense when the workload is latency-insensitive and bursty — you only pay
for what you use. Per-minute makes sense when utilization is high and predictable — you
beat per-token once you’re saturating the GPU.
Rough rule: for workloads above ~30% sustained utilization of a dedicated GPU, per-minute
(Baseten, Modal) starts to beat per-token (Fireworks, Together). Below that, per-token wins
because you avoid paying for idle.
Custom engine is the real moat
Every platform above vLLM and SGLang claims a custom engine. FireAttention, RayTurbo,
Baseten’s inference stack. Custom-engine claims shade marketing — the honest framing
is that vLLM + SGLang represent about 80% of production open-source inference, and the
differentiators at the platform layer are DX, attribution, and SLAs.
Numbers you should remember
• Fireworks GPU rental: $1/hr raise effective May 1, 2026.
• Fireworks claim: 4x lower latency than vLLM on equivalent configs.
• Together: 50-70% cheaper than Replicate on LLMs.
• Baseten valuation: $5B (Series E, Jan 2026, $300M round).
• Modal valuation: $1.1B (Series B, 2025).
• Per-minute beats per-token above ~30% sustained utilization.
Interactive figure: cost-per-token. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/17-
infrastructure-and-production/02-inference-platform-economics
Use It
code/main.py compares the six vendors on a synthetic workload across pricing models. Re-
ports $/day and effective $/M tokens. Run it to find the break-even between per-token and
per-minute.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/17-infrastructure-and-production/02-inference-
platform-economics
AIENGINEERINGFROMSCRATCH.COM 11

INFERENCE PLATFORM ECONOMICS — FIREWORKS, TOGETHER, BASETEN, MODAL, REPLICATE, ANYSCALE
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/17-infrastructure-and-production/02-inference-
platform-economics/code
1. Run code/main.py. At what sustained utilization does Baseten (per-minute) beat Fire-
works (per-token) for a 70B model on one H100? Derive the crossover yourself and
compare to the rule of thumb.
2. Your product serves image generation plus chat plus speech-to-text. Pick platforms for
each modality and name the gateway pattern that unifies them.
3. Fireworks raises prices by $1/hr on your primary model. Model the blended cost impact
if 40% of your traffic moves to batch tier (50% off).
4. A regulated customer requires SOC 2 Type II + HIPAA + dedicated GPUs. Which three
platforms are viable and which one wins on FinOps?
5. Compare cost per 1,000 predictions for Llama 3.1 70B on Fireworks serverless, To-
gether on-demand, Baseten dedicated, and Replicate API. Which is cheapest at 10 pre-
dictions/day? At 10,000?
Key Terms
Term What people say What it actually means
Custom “non-GPU chips” Groq LPU, Cerebras WSE, SambaNova RDU
silicon — optimized for decode
FireAttention “Fireworks engine” Custom attention kernel; marketed at 4x
lower latency than vLLM
Truss “Baseten’s format” Model packaging manifest; dependencies +
secrets + serving config
Per-token “API pricing” Charge by tokens consumed; pay for no idle
Per-minute “dedicated pricing” Charge by wall-clock GPU time; wins at high
utilization
Per- “Replicate pricing” Charge per model invocation; common for
prediction image/video
RayTurbo “Anyscale engine” Proprietary inference on Ray; competes with
vLLM on Ray clusters
Batch tier “50% off” Non-interactive queue at reduced rate;
common on Fireworks, OpenAI
Fine-tuned “Fireworks LoRA” Charge LoRA-served requests at base
at base model’s rate (differentiator)
rate
Further Reading
• Fireworks Pricing — per-token rates, batch tier, GPU rental.
• Baseten Pricing — per-minute rates, committed capacity, enterprise tiers.
• Modal Pricing — per-second GPU rates and free tier.
• Together AI Pricing — model catalog and per-token rates.
• Anyscale Pricing — RayTurbo and managed Ray pricing.
• Northflank — Fireworks AI Alternatives — comparative assessment.
• Infrabase — AI Inference API Providers 2026 — vendor landscape.
AIENGINEERINGFROMSCRATCH.COM 12

INFERENCE PLATFORM ECONOMICS — FIREWORKS, TOGETHER, BASETEN, MODAL, REPLICATE, ANYSCALE
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com
/lesson.html?path=phases/17-infrastructure-and-production/02-inference-platform-
economics
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-sc
ratch/tree/main/phases/17-infrastructure-and-production/02-inference-platform-
economics/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/17-infrastructure-and-production/02-inference-platform-economics
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 13