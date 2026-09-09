---
title: "Capstone 13 — MCP Server with Registry and Governance"
volume: "vol6-production"
part: "Part III — Capstone Projects"
chapter_number: 72
source_pages: "317-321"
---

# Capstone 13 — MCP Server with Registry and Governance

Capstone 13 — MCP Server with Registry
and Governance
The Model Context Protocol stopped being the future and became the default tool-
use spec in 2026. Anthropic, OpenAI, Google, and every major IDE ship MCP clients.
Pinterest published its internal ecosystem of MCP servers. The AAIF Registry for-
malized capability metadata at .well-known. AWS ECS published the reference
stateless deployment. Block’s goose-agent put the same protocol inside a hosted
assistant. The 2026 production shape is: StreamableHTTP transport, OAuth 2.1
scopes, OPA policy gating, and a registry that lets platform teams discover, vali-
date, and enable servers. Build that end to end.
Type: Capstone Languages: Python (server, via FastMCP) or TypeScript (@modelcon-
textprotocol/sdk), Go (registry service) Prerequisites: Phase 11 (LLM engineering), Phase
13 (tools and MCP), Phase 14 (agents), Phase 17 (infrastructure), Phase 18 (safety) Phases
exercised: P11 · P13 · P14 · P17 · P18 Time: 25 hours
Problem
MCP became the tool-use lingua franca. Claude Code, Cursor 3, Amp, OpenCode, Gemini
CLI, and every managed agent now consume MCP servers. The production challenges are
not authoring servers (FastMCP makes that easy) but deploying them at scale with enterprise
requirements: per-tenant OAuth scopes, OPA policy on destructive tools, StreamableHTTP
stateless scaling, a registry for discovery, audit logs per tool call. Pinterest’s internal MCP
ecosystem and the AAIF Registry spec set the 2026 bar.
You will build an MCP server exposing 10 internal tools (Postgres read-only, S3 listing, Jira,
Linear, Datadog, etc.), a registry UI for platform discovery, and a human-approval gate for
destructive tools. The load test demonstrates StreamableHTTP horizontal scaling. The audit
trail satisfies an enterprise security review.
Concept
MCP 2026 revision mandates StreamableHTTP as the default transport. Unlike the earlier
stdio-and-SSE shape, StreamableHTTP is stateless by default: a single HTTP endpoint accepts
JSON-RPC requests, streams responses, and supports long-lived connections for notifications.
Stateless means horizontally scalable behind a load balancer.
Authorization is OAuth 2.1 with per-tool scopes. A token carries scopes like jira:read,
s3:list, postgres:query:readonly. The MCP server checks scopes at tool-call time, not just
session start. For high-risk tools, the server rejects any call whose scope is not elevated to
approved:by:human within the last N minutes — that elevation comes from a Slack review
card.
The registry is a separate service. Every MCP server exposes a .well-known/mcp-
capabilities document with its tool manifest, transport URL, auth requirements. The
AIENGINEERINGFROMSCRATCH.COM 310

CAPSTONE 13 — MCP SERVER WITH REGISTRY AND GOVERNANCE
registry polls, validates, and indexes. Platform teams use the registry UI to see what tools
are available, what scopes they need, and which teams own them.
Architecture
MCP client (Claude Code, Cursor 3, ...)
|
v
StreamableHTTP over HTTPS (JSON-RPC + streaming)
|
v
MCP server (FastMCP) behind load balancer
|
+------+------+---------+----------+------------+
v v v v v
Postgres S3 listing Jira Linear Datadog
(read-only) (paged) (read) (read) (query)
|
+------+-------------+
v v
OPA policy gate destructive tool MCP (separate server)
|
v
human approval via Slack
|
v
audit log (append-only, per-tenant)
registry service
|
v GET /.well-known/mcp-capabilities from each server
v
UI: search / validate / enable-disable / ownership
Stack
• Server framework: FastMCP (Python) or @modelcontextprotocol/sdk (TypeScript)
• Transport: StreamableHTTP over HTTPS (stateless)
• Auth: OAuth 2.1 with workload identity via SPIFFE / SPIRE
• Policy: OPA / Rego rules per tool; policy decision service per request
• Registry: self-hosted, consumes .well-known/mcp-capabilities manifests
• Human approval: Slack interactive message for destructive tools
• Deployment: AWS ECS Fargate or Fly.io, one server per tenant or shared with tenant
scoping
• Audit: structured JSONL per-tenant bucket with per-call lineage
Interactive figure: cf-mcp-gate. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/19-
capstone-projects/13-mcp-server-with-registry
AIENGINEERINGFROMSCRATCH.COM 311

CAPSTONE 13 — MCP SERVER WITH REGISTRY AND GOVERNANCE
Build It
1. Tool surface. Expose 10 internal tools: Postgres read-only query, S3 list objects, Jira
search/fetch, Linear search/fetch, Datadog metric query, PagerDuty on-call lookup,
GitHub read-only, Notion search, Slack search, Salesforce read. Each tool has a typed
schema and a scope label.
2. FastMCP server. Mount the tools. Configure StreamableHTTP transport. Add a mid-
dleware for OAuth token introspection and scope enforcement.
3. OPA policy. Rego policy per tool: what scopes permit invocation, what PII redaction
applies, what payload-size caps apply. Decision service called on every tool call.
4. Registry service. Separate Go or TS service that polls .well-known/mcp-capabilities
from registered servers, validates with JSON Schema, and exposes a list / search / vali-
date / enable-disable UI.
5. Capability manifest. Each server exposes .well-known/mcp-capabilities with: tool
list, auth requirements, transport URL, owner team, SLO.
6. Destructive tool separation. Tools that mutate state (Jira create, Linear create, Post-
gres write) live on a second MCP server with a stricter auth flow: tokens must have a
approved:by:human scope elevated via Slack card within 15 minutes.
7. Audit log. Append-only JSONL per tenant: {timestamp, user, tool, args_redacted,
response_redacted, outcome}. PII redaction via Presidio before write.
8. Load test. 100 concurrent clients on StreamableHTTP. Demonstrate horizontal scal-
ing by adding a second replica; show the load balancer redistributing without session
stickiness.
9. Conformance tests. Run the official MCP conformance suite against both servers. Pass
all mandatory sections.
Use It
$ curl -H "Authorization: Bearer eyJhbGc..." \
-X POST https://mcp.internal.example.com/ \
-d '{"jsonrpc":"2.0","method":"tools/call",
"params":{"name":"postgres.readonly","arguments":{"sql":"SELECT 1"}}}'
[registry] capability validated: postgres.readonly v1.2
[policy] scope postgres:query:readonly present; allowed
[audit] logged: user=u42 tool=postgres.readonly outcome=ok
response: { "result": { "rows": [[1]] } }
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/19-capstone-projects/13-mcp-server-with-
registry
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/19-capstone-projects/13-mcp-server-with-
registry/code
AIENGINEERINGFROMSCRATCH.COM 312

CAPSTONE 13 — MCP SERVER WITH REGISTRY AND GOVERNANCE
1. Add a new tool (Confluence search). Ship it through the registry validation flow without
touching the core server.
2. Write an OPA policy that redacts Postgres query results containing columns named email,
ssn, or phone. Exercise with a probe query.
3. Benchmark StreamableHTTP vs stdio on local latency. Report per-call p50/p95.
4. Implement per-tenant quota: maximum N calls per minute per tool per tenant. Enforce
via a second OPA rule.
5. Run the MCP conformance suite from mcp-conformance-tests and fix every failure.
Key Terms
Term What people say What it actually means
StreamableHT“2T0P26 MCP transport” Stateless HTTP + streaming; replaces SSE +
stdio for networked servers
Capability “Well-known doc” .well-known/mcp-capabilities with tool list,
manifest auth, transport URL
OPA / Rego “Policy engine” Open Policy Agent for authorizing tool calls
against external rules
Scope “Approved-by-human” Short-lived scope granted via Slack
elevation approval, required for destructive tools
Registry “Tool discovery” Service that indexes MCP servers from their
capability manifests
Workload “SPIFFE / SPIRE” Cryptographic service identity for OAuth
identity token issuance
Conformance“Spec tests” Official MCP test battery for
suite StreamableHTTP + tool manifest
correctness
Further Reading
• Model Context Protocol 2026 Roadmap — StreamableHTTP, capability metadata, reg-
istry
• AAIF MCP Registry spec — the 2026 registry spec
• AWS ECS reference deployment — reference production deployment
• Pinterest internal MCP ecosystem — the reference internal deployment
• Block goose MCP usage — reference agent consumption pattern
• FastMCP — Python server framework
• Open Policy Agent — policy engine reference
• SPIFFE / SPIRE — workload identity reference
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/19-capstone-projects/13-mcp-server-with-registry
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/19-capstone-projects/13-mcp-server-with-registry/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/19-capstone-projects/13-mcp-server-with-registry
AIENGINEERINGFROMSCRATCH.COM 313

CAPSTONE 13 — MCP SERVER WITH REGISTRY AND GOVERNANCE
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 314