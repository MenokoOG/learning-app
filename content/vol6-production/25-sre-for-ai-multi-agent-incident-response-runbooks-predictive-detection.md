---
title: "SRE for AI — Multi-Agent Incident Response, Runbooks, Predictive Detection"
volume: "vol6-production"
part: "Part I — Infrastructure & Production"
chapter_number: 25
source_pages: "110-113"
---

# SRE for AI — Multi-Agent Incident Response, Runbooks, Predictive Detection

SRE for AI — Multi-Agent Incident Re-
sponse, Runbooks, Predictive Detection
AI SRE uses LLMs grounded in infrastructure data (logs, runbooks, service topol-
ogy) via RAG to automate investigation, documentation, and coordination phases.
The 2026 architecture pattern is multi-agent orchestration — specialized agents
(logs, metrics, runbooks) coordinated by a supervisor; AI proposes hypotheses and
queries, humans approve judgment calls. Datadog Bits AI and Azure SRE Agent ship
this as managed products. Runbooks are evolving: NeuBird Hawkeye uses adver-
sarial evaluation (two models analyze the same incident; agreement = confidence,
disagreement = uncertainty); operational memory persists across team changes.
Auto-remediation stays cautious: AI suggests, humans approve. Fully autonomous
action is narrow (restart pod, rollback specific deploy) with tight guardrails — any-
one selling “set it and forget it” is overselling. Emerging frontier: pre-incident
prediction. MIT research reports an LLM trained on historical logs + GPU temps
+ API error patterns predicted 89% of outages 10-15 min early. Projection: 95% of
enterprise LLMs have automated failover by end-2026.
Type: Learn Languages: Python (stdlib, toy multi-agent incident triage simulator) Prereq-
uisites: Phase 17 · 13 (Observability), Phase 17 · 24 (Chaos Engineering) Time: ~60 minutes
Learning Objectives
• Diagram the multi-agent AI SRE architecture: supervisor + specialized agents (logs,
metrics, runbooks) + human approval gate.
• Explain why auto-remediation is narrow (restart pod, revert deploy) rather than broad
(re-architect service).
• Name the adversarial evaluation pattern (NeuBird Hawkeye): two models agree = con-
fidence; disagree = escalate.
• Cite the MIT 89% early-detection result and the operational constraint: predictions with-
out actuation are just dashboards.
The Problem
An on-call engineer gets paged at 3 a.m. “High error rate in checkout.” They check Datadog,
Loki, three runbooks, the deploy log. 30 minutes later they realize the root cause is a vLLM
OOM from a KV cache spike. They restart the pod; error clears.
In 2026 the first 20 minutes of that investigation are automatable. Grouping logs by ser-
vice, correlating to recent deploys, matching against runbooks — all are RAG + tool-use. A
supervised agent can do first-pass triage and present a hypothesis before the human opens
Datadog.
Fully autonomous remediation is a different problem. Restart pod: safe. Scale GPU pool:
safe if policy allows. Re-architect the service: absolutely not. The discipline is drawing the
narrow line.
AIENGINEERINGFROMSCRATCH.COM 103

SRE FOR AI — MULTI-AGENT INCIDENT RESPONSE, RUNBOOKS, PREDICTIVE DETECTION
The Concept
Multi-agent architecture
Incident
│
▼
Supervisor
/ | \
▼ ▼ ▼
Log agent Metric agent Runbook agent
│ │ │
└─────┴─────┘
│
▼
Hypothesis + evidence
│
▼
Human approval
│
▼
Action (narrow set)
Supervisor breaks the incident into sub-queries. Specialized agents have tool access (log
search, PromQL, doc retrieval). Supervisor synthesizes, presents hypothesis + evidence to
human. Human approves or redirects.
Auto-remediation scope
Safe (narrow): restart pod, revert specific deploy, scale pool within pre-approved bounds,
enable pre-approved feature flag.
Not safe (broad): change service topology, modify resource limits, deploy new code, change
IAM, alter databases.
Anyone selling “set it and forget it” is overselling. The safe set grows as AI SRE matures, but
the boundary is real.
Adversarial evaluation (NeuBird Hawkeye)
Two models independently analyze the same incident. If they agree on root cause, confidence
is high. If they disagree, escalate to human with both hypotheses visible. Simple pattern,
effective filter against hallucinated root causes.
Operational memory
Team turnover is the silent kill of traditional SRE — tribal knowledge leaves. AI SRE stores
runbooks + post-mortems in a vector DB; agents retrieve on every new incident. When new
engineers join, the AI has full history.
Pre-incident prediction
MIT 2025 research: LLM trained on historical logs, GPU temperatures, API error patterns
predicted 89% of outages 10-15 minutes before they happened on the test set.
AIENGINEERINGFROMSCRATCH.COM 104

SRE FOR AI — MULTI-AGENT INCIDENT RESPONSE, RUNBOOKS, PREDICTIVE DETECTION
Reality check: predictions without actuation are dashboards. The operational question is
“when we predict, what do we do?” Pre-emptive drain? Pager? Auto-scale? The answer is
policy-specific.
Products in 2026
• Datadog Bits AI — managed SRE copilot inside Datadog.
• Azure SRE Agent — Azure-native.
• NeuBird Hawkeye — adversarial eval + operational memory.
• PagerDuty AIOps — triage + deduplication.
• Incident.io Autopilot — incident commander + coordination.
Runbooks as code
Runbooks evolve from Confluence pages to versioned markdown with structured sections
(symptom, hypothesis, verify, act). Structured runbooks feed better RAG retrieval. Start any
AI-SRE rollout by turning unstructured runbooks into structured.
Numbers you should remember
• MIT early-detection: 89% of outages, 10-15 min lead time.
• Multi-agent triage: supervisor + (logs, metrics, runbooks) + human.
• Safe auto-remediation set: restart pod, revert deploy, scale within bounds.
• Adversarial eval: two models independent; agreement = confidence.
Interactive figure: i4-incident-agents. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/17-infrastructure-and-production/23-sre-for-ai
Use It
code/main.py simulates a multi-agent triage: log agent finds error, metric agent finds CPU
spike, runbook agent matches to known issue. Supervisor ranks hypotheses.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/17-infrastructure-and-production/23-sre-for-ai
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/17-infrastructure-and-production/23-sre-for-ai/code
1. Run code/main.py. What if the log and metric agents disagree? How does the supervisor
resolve?
2. Define three “safe” auto-remediation actions for your service. Justify each.
3. Write a structured runbook template: sections, required fields, verification commands.
4. Predictive detection fires at 12 min lead. What’s your policy — pager, pre-drain, or both?
5. Argue whether a 3-person team should adopt AI SRE in 2026 or wait. Consider maturity,
volume, risk.
AIENGINEERINGFROMSCRATCH.COM 105

SRE FOR AI — MULTI-AGENT INCIDENT RESPONSE, RUNBOOKS, PREDICTIVE DETECTION
Key Terms
Term What people say What it actually means
AI SRE “agent for on-call” LLM-backed incident investigation +
coordination
Supervisor “the orchestrator” Top-level agent breaking incidents into
agent sub-queries
Specialized “domain agent” Sub-agent with tool access (logs, metrics,
agent runbooks)
Auto- “AI fixes it” Narrow pre-approved action; NOT broad
remediation re-architecture
Operational “vector runbooks” Post-mortems + runbooks in vector DB for
memory RAG
Adversarial “two-model check” Independent analyses; agreement =
eval confidence
NeuBird “the adversarial one” Product with adversarial-eval + memory
Hawkeye pattern
Bits AI “Datadog’s SRE agent” Datadog-managed AI SRE
Pre- “early detection” 10-15 min lead time on outage prediction
incident
prediction
Further Reading
• incident.io — AI SRE Complete Guide 2026
• InfoQ — Human-Centred AI for SRE
• DZone — AI in SRE 2026
• Datadog Bits AI
• NeuBird Hawkeye
• awesome-ai-sre
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/17-infrastructure-and-production/23-sre-for-ai
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/17-infrastructure-and-production/23-sre-for-ai/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/17-infrastructure-and-production/23-sre-for-ai
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 106