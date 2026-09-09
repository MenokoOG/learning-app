---
title: "Chaos Engineering for LLM Production"
volume: "vol6-production"
part: "Part I — Infrastructure & Production"
chapter_number: 26
source_pages: "114-117"
---

# Chaos Engineering for LLM Production

Chaos Engineering for LLM Production
Chaos engineering for LLMs is its own discipline in 2026. Prerequisites before
running experiments in production: defined SLI/SLO, trace+metric+log observ-
ability, automated rollback, runbooks, on-call. Architecture has four planes: con-
trol (experiment scheduler), target (services, infra, data stores), safety (guards +
abort + traffic filters), observability (metrics + traces + logs), feedback (into SLO
adjustments). Guardrails are mandatory: burn-rate alerts pause experiments if
daily error-budget burn > 2x expected; suppression windows + trace-ID correlation
dedupe alert noise. Cadence: weekly small canary + SLO review; monthly game day
+ postmortem; quarterly cross-team resilience audit + dependency mapping. LLM-
specific experiments: memory overload, network failures, provider outages, mal-
formed prompts, KV cache eviction storms. Tooling: Harness Chaos Engineering
(LLM-derived recommendations, blast-radius downscaling, MCP tool integration);
LitmusChaos (CNCF); Chaos Mesh (CNCF Kubernetes-native).
Type: Learn Languages: Python (stdlib, toy chaos experiment runner) Prerequisites:
Phase 17 · 23 (SRE for AI), Phase 17 · 13 (Observability) Time: ~60 minutes
Learning Objectives
• Name the five chaos engineering prerequisites (SLI/SLO, observability, rollback, run-
books, on-call) and explain why skipping any breaks the practice.
• Diagram the four planes (control, target, safety, observability) and the feedback loop
into SLO.
• Enumerate five LLM-specific experiments (memory overload, network fail, provider out-
age, malformed prompt, KV eviction storm).
• Pick a tool — Harness, LitmusChaos, Chaos Mesh — given stack.
The Problem
Chaos testing in traditional stacks is established. LLM stacks add new failure modes. A
4K-token prompt with a poison character stalls the tokenizer for 12 seconds. An upstream
provider 429s; your gateway retries; your service OOMs on retry-amplified concurrency. A
KV cache eviction storm under burst load causes re-prefill cascades that saturate compute.
None of these show up in unit tests. Chaos engineering is how you discover them before users
do.
The Concept
Prerequisites
Don’t run chaos in production without:
1. SLI/SLO — defined service-level indicators and objectives.
AIENGINEERINGFROMSCRATCH.COM 107

CHAOS ENGINEERING FOR LLM PRODUCTION
2. Observability — traces, metrics, logs, wired to dashboards.
3. Automated rollback — Phase 17 · 20 policy-flag rollback.
4. Runbooks — structured, Phase 17 · 23.
5. On-call — someone to respond.
Missing any means chaos becomes real incident.
Four planes + feedback
Control plane — experiment scheduler (Litmus workflow, Chaos Mesh schedule, Harness
UI).
Target plane — services, pods, nodes, load balancers, data stores.
Safety plane — kill switch, suppression windows, blast-radius limits, error-budget gates.
Observability plane — normal metrics + trace-ID correlation to distinguish chaos-induced
from natural failures.
Feedback loop — findings feed back into SLO adjustment, runbook updates, code fixes.
Guardrails are mandatory
• Burn-rate alert: pause experiment if daily error-budget burn exceeds 2x expected.
• Suppression windows: silence non-experiment alerts in the blast radius during exper-
iment.
• Trace-ID correlation: all experiment-induced errors carry a tag so on-call can dedupe.
Five LLM-specific experiments
1. Memory overload — force a KV cache preemption storm by sending long-context re-
quests with high concurrency. Observe: does the service gracefully shed or crash?
2. Network failure — cut connectivity between inference gateway and provider. Observe:
does fallback kick in within SLA? (Phase 17 · 19)
3. Provider outage simulation — 100% 429 from OpenAI. Observe: does routing failover
to Anthropic? (Phase 17 · 16, 19)
4. Malformed prompt — inject tokenizer-stalling payload (e.g., deeply nested unicode,
huge UTF-8 codepoint). Observe: does a single request lock up a worker?
5. KV eviction storm — force eviction by saturating vLLM block budget. Observe: does
LMCache recover or does service degrade?
Cadence
• Weekly — small canary experiments in staging, maybe 5% prod.
• Monthly — scheduled game day on a specific scenario; cross-team attendance; post-
mortem.
• Quarterly — cross-team resilience audit; dependency map update.
Tooling
• Harness Chaos Engineering — commercial; AI-derived experiment recommendations;
blast-radius downscaling; MCP tool integration.
• LitmusChaos — CNCF graduated; Kubernetes workflow-based.
AIENGINEERINGFROMSCRATCH.COM 108

CHAOS ENGINEERING FOR LLM PRODUCTION
• Chaos Mesh — CNCF sandbox; Kubernetes-native CRD style.
• Gremlin — commercial; broad support.
• AWS FIS / Azure Chaos Studio — managed cloud offerings.
Starting small
First experiment: pod-kill one decode replica under steady traffic. Observe rerouting and
recovery. If this works and looks safe, graduate to network chaos.
First LLM-specific experiment: inject one provider 429 for 5 minutes. Observe fallback. Most
teams discover their fallback wasn’t fully tested.
Numbers you should remember
• Four planes: control, target, safety, observability.
• Burn-rate pause: 2x expected daily budget burn.
• Cadence: weekly canary, monthly game day, quarterly audit.
• Five LLM experiments: memory, network, provider, malformed prompt, KV storm.
Interactive figure: i4-chaos-guard. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/17-
infrastructure-and-production/24-chaos-engineering-llm
Use It
code/main.py simulates three chaos experiments with safety plane gates. Reports which ex-
periments would trip the burn-rate abort.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/17-infrastructure-and-production/24-chaos-
engineering-llm
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/17-infrastructure-and-production/24-chaos-
engineering-llm/code
1. Run code/main.py. Which experiment trips the burn-rate gate and why?
2. Design the first five chaos experiments for a vLLM-based RAG service. Include success
criteria.
3. Your burn-rate alert paused an experiment. How do you determine root cause — chaos
or natural?
4. Argue whether chaos should run in production or only staging. When is production the
right answer?
5. Name three LLM-specific failure modes that generic network-chaos cannot reproduce.
Key Terms
AIENGINEERINGFROMSCRATCH.COM 109

CHAOS ENGINEERING FOR LLM PRODUCTION
Term What people say What it actually means
SLI / SLO “service targets” Indicator + objective; required prerequisite
Blast “scope” Set of services / users affected by experiment
radius
Burn-rate “budget gate” Fires when error-budget burn rate > 2x
alert expected
Game day “monthly drill” Scheduled cross-team chaos exercise
LitmusChaos “CNCF workflow” Graduated CNCF Kubernetes chaos tool
Chaos “CNCF CRD” CNCF sandbox Kubernetes-native chaos
Mesh
Harness “commercial AI-assisted” Harness chaos with AI recommendations
CE
Malformed “tokenizer bomb” Input that stalls tokenization
prompt
KV eviction “preemption cascade” Mass eviction triggering re-prefills
storm
Further Reading
• DevSecOps School — Chaos Engineering 2026 Guide
• Ankush Sharma — Observability for LLMs (book)
• LitmusChaos (CNCF)
• Chaos Mesh (CNCF)
• Harness Chaos Engineering
• AWS FIS
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/17-infrastructure-and-production/24-chaos-engineering-llm
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/17-infrastructure-and-production/24-chaos-engineering-llm/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/17-infrastructure-and-production/24-chaos-engineering-llm
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 110