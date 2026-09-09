---
title: "Shadow Traffic, Canary Rollout, and Progressive Deployment for LLMs"
volume: "vol6-production"
part: "Part I — Infrastructure & Production"
chapter_number: 22
source_pages: "98-101"
---

# Shadow Traffic, Canary Rollout, and Progressive Deployment for LLMs

Shadow Traffic, Canary Rollout, and Pro-
gressive Deployment for LLMs
LLM rollouts combine the hardest parts of software deployment: no unit tests, dif-
fuse failure modes, delayed signals. The sequence is (1) shadow mode — duplicate
prod requests to candidate model, log, compare with zero user impact; catches
obvious distribution issues but is not a quality guarantee; (2) canary rollout — pro-
gressive traffic shift 10% → 25% → 50% → 75% → 100% with gates at each step;
track latency percentiles, cost/request, error/refusal rate, output length distribu-
tion, user-feedback rate; (3) A/B testing for distinct alternatives after stability con-
firmed. Non-determinism is irreducible — up to 15% accuracy variation across runs
with identical inputs due to GPU FP non-associativity plus batch-size variance. Cost
is a variable, not constant — a 20% better model can be 3x more expensive per call.
Rollback speed is decisive: if rollback requires redeploy, you are too slow. Policy
lives in config/flags; model lives in registry with pinned digests; rollback = flip pol-
icy + revert threshold + pin old model in seconds.
Type: Learn Languages: Python (stdlib, toy canary-progression simulator) Prerequisites:
Phase 17 · 13 (Observability), Phase 17 · 21 (A/B Testing) Time: ~60 minutes
Learning Objectives
• Distinguish shadow mode (zero-impact compare), canary (live traffic progressive), and
A/B (stability-confirmed comparison).
• Enumerate five LLM-specific canary metrics (latency, cost/request, error/refusal, output-
length distribution, user feedback).
• Explain why LLM non-determinism (up to 15%) changes what “stable” means in a rollout.
• Design a rollback path that takes seconds (policy flip) not hours (redeploy).
The Problem
You ship a new model. Offline evals show 3% accuracy gain. You flip it on in production.
Within 24 hours, cost is up 40%, user thumbs-down is up 8%, three customer tickets report
“weird answers.” You roll back. Redeploy takes 3 hours. Your weekend is ruined.
Every piece of that was avoidable. Shadow mode would have caught the 40% cost spike before
any user saw it. Canary would have stopped at 10% when thumbs-down moved. Policy-flag
rollback would have taken 30 seconds. The discipline is what fills in the gap between “offline
evals look good” and “real users are happy.”
AIENGINEERINGFROMSCRATCH.COM 91

SHADOW TRAFFIC, CANARY ROLLOUT, AND PROGRESSIVE DEPLOYMENT FOR LLMS
The Concept
Shadow mode
Candidate receives the same requests as production; outputs are logged, not returned to
users. Zero user impact. Log:
• Output content (diff against production).
• Token counts (cost delta).
• Latency.
• Refusal and error.
Catches: cost blow-ups, length regressions, obvious refusal changes, hard errors. Does NOT
catch: quality delta users would perceive. Shadow is a smoke test, not a quality test.
Canary rollout
Progressive traffic shift with gates. Typical progression: 1% → 10% → 25% → 50% → 75% →
100%. Gate on 5 metrics at each step:
1. Latency percentiles — P50, P95, P99. Breach: canary has P99 > 1.5x baseline.
2. Cost per request — blended $. Breach: >20% above baseline.
3. Error / refusal rate — 5xx plus explicit refusals. Breach: 2x baseline.
4. Output length distribution — mean + P99. Breach: distributional shift.
5. User-feedback rate — thumbs-down / ticket filings. Breach: 1.5x baseline.
Non-determinism is the new variance
Identical inputs produce non-identical outputs. Reasons:
• GPU FP non-associativity (floating-point reduction order varies by batch).
• Batch-size variance (same prompt in a batch of 128 vs batch of 16).
• Sampling (temperature > 0).
Measured: up to 15% accuracy variation run-to-run on identical eval sets. “Stable” in a rollout
means metrics are within expected variance, not identical to baseline. Set gates above the
noise floor.
Cost is a variable
A 20% better model can be 3x more expensive per call. Cost/request is one of the five gates.
Shipping a “better” model that breaks unit economics is a rollback case.
Rollback is the weapon
• Policy flag (feature flag system): flip percentage in config; takes seconds.
• Model pinning (registry digest): pinned model does not auto-upgrade.
• Rollback = revert flag + set pinned digest to previous. Seconds, not hours.
If your stack requires redeploy to rollback, fix that before rolling.
Tooling
Argo Rollouts / Flagger — Kubernetes progressive delivery controllers. Integrate with Is-
tio/Linkerd weighted routing.
AIENGINEERINGFROMSCRATCH.COM 92

SHADOW TRAFFIC, CANARY ROLLOUT, AND PROGRESSIVE DEPLOYMENT FOR LLMS
Istio weighted routing — service-mesh-level traffic split.
KServe / Seldon Core — model serving with built-in canary.
Feature flags — LaunchDarkly, Flagsmith, Unleash. Policy-level flip, no redeploy.
Metrics cadence
Canary gates check every 5-15 minutes depending on traffic volume. 1% traffic with 10
req/min gives 50-150 data points per window — enough for latency but noisy for user feed-
back. 10% gives ~10x more. Progressions should pause long enough to accumulate enough
samples at each step.
The A/B step is optional
If the new model is distinctly different (different behavior, different cost curve, different tone),
A/B test it at 50% after canary passes. If it’s just an improved version, skip to 100% when
canary gates pass.
Numbers you should remember
• Canary progression: 1% → 10% → 25% → 50% → 75% → 100%.
• Non-determinism ceiling: up to 15% run-to-run variance on identical inputs.
• Five canary metrics: latency, cost, error/refusal, output length, user feedback.
• Cost gate: >20% above baseline is a breach.
• Rollback: seconds, not hours.
Interactive figure: i4-canary-ramp. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/17-
infrastructure-and-production/20-shadow-canary-progressive
Use It
code/main.py simulates a canary rollout with injected regressions. Reports which stage the
rollout halts at and which gate triggered.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/17-infrastructure-and-production/20-shadow-
canary-progressive
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/17-infrastructure-and-production/20-shadow-
canary-progressive/code
1. Run code/main.py. Inject a 25% cost regression. At which stage does the canary halt?
2. Your new model has 3% accuracy gain offline but cost/request is +18%. Is it a ship?
Depends on the policy — write both paths.
3. Design a rollback that takes under 60 seconds end-to-end. List the required infrastruc-
ture.
4. Non-determinism shows ±7% on your eval. Set canary gates so you don’t false-alarm.
What multipliers do you use?
AIENGINEERINGFROMSCRATCH.COM 93

SHADOW TRAFFIC, CANARY ROLLOUT, AND PROGRESSIVE DEPLOYMENT FOR LLMS
5. Shadow mode catches a 40% cost spike before canary. Write the alert rule that fires in
shadow.
Key Terms
Term What people say What it actually means
Shadow “duplicate to new” Zero-impact send-to-candidate for logging
mode
Canary “progressive traffic” Gradual user-exposed rollout with gates
Gates “rollout checks” Metric thresholds that block progression
Non- “LLM variance” Irreducible run-to-run differences
determinism
Policy flag “flag flip rollback” Config-level rollback, seconds not hours
Model pin “registry digest” Immutable reference to a model version
Argo “K8s progressive” Kubernetes-native canary/rollback controller
Rollouts
KServe “inference K8s” Model serving with canary primitives
Istio “mesh split” Service-mesh traffic splitter
weighted
Further Reading
• TianPan — Releasing AI Features Without Breaking Production
• MarkTechPost — Safely Deploying ML Models
• APXML — Advanced LLM Deployment Patterns
• Argo Rollouts docs
• Flagger docs
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.c
om/lesson.html?path=phases/17-infrastructure-and-production/20-shadow-canary-
progressive
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/17-infrastructure-and-production/20-shadow-canary-progressive/
code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/17-infrastructure-and-production/20-shadow-canary-progressive
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 94