---
title: "Capstone 06 — DevOps Troubleshooting Agent for Kubernetes"
volume: "vol6-production"
part: "Part III — Capstone Projects"
chapter_number: 66
source_pages: "286-290"
---

# Capstone 06 — DevOps Troubleshooting Agent for Kubernetes

Capstone 06 — DevOps Troubleshooting
Agent for Kubernetes
AWS’s DevOps Agent went GA, Resolve AI published its K8s playbooks, NeuBird
demoed semantic monitoring, and Metoro tied AI SRE to per-service SLOs. The
production shape is settled: an alert webhook fires, an agent reads telemetry, walks
a graph of K8s objects, ranks root-cause hypotheses, and posts a Slack brief with
approval buttons. Read-only by default. Every remediation gated by a human. This
capstone is that agent, evaluated on 20 synthetic incidents and compared against
AWS’s Agent on three shared cases.
Type: Capstone Languages: Python (agent), TypeScript (Slack integration) Prerequisites:
Phase 11 (LLM engineering), Phase 13 (tools and MCP), Phase 14 (agents), Phase 15 (au-
tonomous), Phase 17 (infrastructure), Phase 18 (safety) Phases exercised: P11 · P13 · P14 ·
P15 · P17 · P18 Time: 30 hours
Problem
The 2025-2026 SRE narrative became: “AI agents triage incidents, humans approve reme-
diations.” AWS DevOps Agent, Resolve AI, NeuBird, Metoro, PagerDuty AIOps all ship this
shape in production. The agent reads Prometheus metrics, Loki logs, Tempo traces, kube-
state-metrics, and a knowledge graph of K8s objects. It produces a ranked root-cause hypoth-
esis with telemetry citations in under five minutes. It never executes destructive commands
without explicit human approval through Slack.
Most of the hard work is scoping and safety, not reasoning. The agent needs a read-only-
by-default RBAC surface, a hardened MCP tool server, and audit logs of every command
considered vs executed. It needs to know when it is outside its depth and escalate. And it has
to run cheap enough that OOM-kill cascades do not generate a $5k agent bill.
Concept
The agent operates on a knowledge graph. Nodes are K8s objects (Pods, Deployments, Ser-
vices, Nodes, HPAs, PVCs) plus telemetry sources (Prometheus series, Loki streams, Tempo
traces). Edges encode ownership (Pod -> ReplicaSet -> Deployment), scheduling (Pod ->
Node), and observation (Pod -> Prometheus series). The graph is kept fresh by a kube-state-
metrics sync and re-sampled on every alert.
When an alert fires, the agent root-causes from the affected object. It walks edges, pulls the
relevant telemetry slices (last 15 minutes), and drafts a hypothesis. The hypothesis is ranked
by evidence: how many telemetry citations support it, how recent, how specific. The top-3
hypotheses go to Slack with graph-path visualizations and approval buttons for remediation
actions.
Remediation is gated. Allowed default actions are read-only. Destructive actions (scaling
down, rolling back, deleting Pods) require Slack approval; ArgoCD rollback hooks require an
AIENGINEERINGFROMSCRATCH.COM 279

CAPSTONE 06 — DEVOPS TROUBLESHOOTING AGENT FOR KUBERNETES
auth token the agent never holds. The audit log records every command the agent considered
— not just executed — so the review process catches near-misses.
Architecture
PagerDuty / Alertmanager webhook
|
v
FastAPI receiver
|
v
LangGraph root-cause agent
|
+---- read-only MCP tools ----+
| |
v v
K8s knowledge graph telemetry slices
(Neo4j / kuzu) Prometheus, Loki, Tempo
ownership + scheduling last 15m, scoped
|
v
hypothesis ranking (evidence weight)
|
v
Slack brief + approval buttons
|
v (approved)
ArgoCD rollback hook / PagerDuty escalate
|
v
audit log: considered vs executed, every command
Stack
• Observability sources: Prometheus, Loki, Tempo, kube-state-metrics
• Knowledge graph: Neo4j (managed) or kuzu (embedded) of K8s objects + telemetry
edges
• Agent: LangGraph with per-tool allow-list, read-only by default
• Tool transport: FastMCP over StreamableHTTP; separate server for destructive tools
behind approval gate
• Models: Claude Sonnet 4.7 for root-cause reasoning, Gemini 2.5 Flash for log summa-
rization
• Remediation: ArgoCD rollback webhook, PagerDuty escalate, Slack approval card
• Audit: append-only structured log (considered, executed, approved, outcome)
• Deployment: K8s deployment with its own narrow RBAC role; separate namespace
Interactive figure: ce-rootcause-walk. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/19-capstone-projects/06-devops-troubleshooting-agent
AIENGINEERINGFROMSCRATCH.COM 280

CAPSTONE 06 — DEVOPS TROUBLESHOOTING AGENT FOR KUBERNETES
Build It
1. Graph ingestion. Sync kube-state-metrics into Neo4j/kuzu every 30s. Nodes: Pod, De-
ployment, Node, Service, PVC, HPA. Edges: OWNED_BY, SCHEDULED_ON, EXPOSES,
MOUNTS, SCALES. Telemetry overlay edges: OBSERVED_BY (a Pod is observed by a
Prometheus series).
2. Alert receiver. FastAPI endpoint that accepts PagerDuty or Alertmanager webhooks.
Extract the affected object(s) and SLO breach.
3. Read-only tool surface. Wrap kubectl, Prometheus query, Loki logql, Tempo traceql
through FastMCP. Every tool has a narrow RBAC verb (“get”, “list”, “describe”). No
“delete”, “exec”, “scale” in the default server.
4. Root-cause agent. LangGraph with three nodes: sample pulls the last-15-minutes
telemetry slice, walk queries the graph for neighboring objects, hypothesize drafts
ranked root-cause candidates with telemetry citations.
5. Evidence scoring. Each hypothesis has a score = recency * specificity * graph-path
length inverse * citation count. Return top-3.
6. Slack brief. Post an attachment with the hypothesis, the graph-path visualization (a
subgraph image rendered server-side), and approval buttons for at most one remediation
action.
7. Remediation gate. Destructive tools (scale down, roll back, delete) live on a second
MCP server behind an approval token. The agent can call them only after the Slack card
is approved by a human.
8. Audit log. Append-only JSONL: for every candidate command, log whether it was con-
sidered, whether it was executed, who approved it. Ship to S3 daily.
9. Synthetic incident suite. Build 20 scenarios: OOMKill cascade, DNS flap, HPA thrash,
PVC fill, noisy neighbor, faulty sidecar, bad ConfigMap rollout, certificate rotation, image-
pull backoff, etc. Score the agent on root-cause accuracy and time-to-hypothesis.
Use It
webhook: alert.pagerduty.com -> checkout-api SLO breach, error rate 14%
[graph] affected: Deployment checkout-api (3 Pods, Node ip-10-2-3-4)
[walk] neighbors: ReplicaSet checkout-api-abc, Service checkout-api,
recent rollout 14m ago
[sample] prometheus error_rate 14%, up-trend; loki 500s on /api/v2/pay
[hypo] #1 bad rollout: latest image checkout-api:v2.41 fails /healthz
citations: deploy.yaml (rev 42), prometheus errorRate, loki 500 stack
[slack] [ROLL BACK to v2.40] [ESCALATE] [IGNORE]
(approval required; agent does not roll back unilaterally)
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/roh
itg00/ai-engineering-from-scratch/tree/main/phases/19-capstone-projects/06-devops-
troubleshooting-agent
AIENGINEERINGFROMSCRATCH.COM 281

CAPSTONE 06 — DEVOPS TROUBLESHOOTING AGENT FOR KUBERNETES
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/19-capstone-projects/06-devops-troubleshooting-
agent/code
1. Run your agent on the same three incidents AWS’s DevOps Agent is demo’d on. Publish
the side-by-side. Report where the agent diverges.
2. Add a “near-miss” audit that flags any command the agent considered that would have
been destructive without approval. Measure the near-miss rate over one week.
3. Swap the hypothesis model from Claude Sonnet 4.7 to a self-hosted Llama 3.3 70B. Mea-
sure RCA accuracy delta and dollar per incident.
4. Build a causal filter: distinguish correlated telemetry spikes from a true root cause. Train
a small classifier on the 20-scenario labels.
5. Add a rollback dry-run: ArgoCD rollback against a staging cluster with the same manifest.
Verify the rollback plan in a live cluster before the Slack approval button.
Key Terms
Term What people say What it actually means
K8s “Cluster graph” Nodes = K8s objects + telemetry series;
knowledge edges = ownership, scheduling, observation
graph
Read-only- “Scoped RBAC” Agent’s service account has only
by-default get/list/describe verbs; destructive verbs
live in a separate server behind approval
Audit log “Considered vs executed” Append-only record of every candidate
command, whether it ran, who approved
Hypothesis “Evidence score” Recency × specificity × graph-path length
ranking inverse × citation count
Slack “HITL gate” Interactive Slack message with remediation
approval buttons; agent cannot proceed until a
card human clicks
Telemetry “Evidence pointer” A Prometheus query, Loki selector, or Tempo
citation trace URL that supports a claim
MTTR “Time to resolution” Wall-clock from alert fire to SLO recovery
Further Reading
• AWS DevOps Agent GA — the canonical 2026 reference
• Resolve AI K8s troubleshooting — the competitor reference
• NeuBird semantic monitoring — semantic-graph approach
• Metoro AI SRE — SLO-first production framing
• kube-state-metrics — the cluster-state source
• LangGraph — reference agent orchestrator
• FastMCP — Python MCP server framework
• ArgoCD rollback — the gated remediation target
Continue online. The living edition of this chapter has more than the page can hold:
AIENGINEERINGFROMSCRATCH.COM 282

CAPSTONE 06 — DEVOPS TROUBLESHOOTING AGENT FOR KUBERNETES
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/19-capstone-projects/06-devops-troubleshooting-agent
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/19-capstone-projects/06-devops-troubleshooting-agent/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/19-capstone-projects/06-devops-troubleshooting-agent
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 283