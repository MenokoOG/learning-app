---
title: "Capstone — Build a Complete Tool Ecosystem"
volume: "vol5-agents"
part: "Part II — Tools & Protocols"
chapter_number: 49
source_pages: "246-249"
---

# Capstone — Build a Complete Tool Ecosystem

Capstone — Build a Complete Tool Ecosys-
tem
Phase 13 taught every piece. This capstone wires them into one production-shaped
system: an MCP server with tools + resources + prompts + tasks + UI, OAuth
2.1 at the edge, an RBAC gateway, a multi-server client, an A2A sub-agent call,
OTel tracing into a collector, tool-poisoning detection in CI, and an AGENTS.md +
SKILL.md bundle. By the end you can defend every architectural choice.
Type: Build Languages: Python (stdlib, end-to-end ecosystem harness) Prerequisites:
Phase 13 · 01 through 21 Time: ~120 minutes
Learning Objectives
• Compose an MCP server exposing tools, resources, prompts, and a task with a ui://
app.
• Front the server with an OAuth 2.1 gateway that enforces RBAC and pinned hashes.
• Write a multi-server client that traces with OTel GenAI attributes end-to-end.
• Delegate part of a workload to an A2A sub-agent; verify opacity is preserved.
• Package the whole stack with AGENTS.md + SKILL.md so other agents can drive it.
The Problem
Ship the “research and report” system:
• User asks: “summarize the three most-cited 2026 arXiv papers on agent protocols.”
• System: search arXiv via MCP; delegate paper summarization to a specialized writer
agent via A2A; aggregate results; render an interactive report as an MCP Apps ui://
resource; log every step to OTel.
All the primitives from Phase 13 show up. This is not a toy — production research-assistant
systems shipped in 2026 by Anthropic (the Claude Research product), OpenAI (GPTs with
Apps SDK), and third parties have this exact shape.
The Concept
Architecture
[user] -> [client] -> [gateway (OAuth 2.1 + RBAC)] -> [research MCP server]
|
+- MCP tool: arxiv_search (pure)
+- MCP resource: notes://recent
+- MCP prompt: /research_topic
+- MCP task: generate_report (long)
+- MCP Apps UI: ui://report/current
AIENGINEERINGFROMSCRATCH.COM 240

CAPSTONE — BUILD A COMPLETE TOOL ECOSYSTEM
+- A2A call: writer-agent (tasks/send)
|
+- OTel GenAI spans
Trace hierarchy
agent.invoke_agent
├── llm.chat (kick off)
├── mcp.call -> tools/call arxiv_search
├── mcp.call -> resources/read notes://recent
├── mcp.call -> prompts/get research_topic
├── a2a.tasks/send -> writer-agent
│ └── task transitions (opaque internals)
├── mcp.call -> tools/call generate_report (task-augmented)
│ └── tasks/status polling
│ └── tasks/result (completed, returns ui:// resource)
└── llm.chat (final synthesis)
One trace id. Every span has the right gen_ai.* attributes.
Security posture
• OAuth 2.1 + PKCE with resource indicator pinning audience to gateway.
• Gateway holds upstream credentials; user never sees them.
• RBAC: alice has research:read, research:write, can call all tools. bob has re-
search:read, cannot call generate_report.
• Pinned description manifest: dropped any server whose tool hashes changed.
• Rule of Two audit: no tool combines untrusted input, sensitive data, and consequential
action.
Rendering
The final generate_report task returns content blocks plus a ui://report/current resource.
The client’s host (Claude Desktop, etc.) renders the interactive dashboard in a sandbox
iframe. The dashboard contains a sorted paper list, citation counts, and a button that calls
host.callTool('summarize_paper', {arxiv_id}) for any paper the user clicks.
Packaging
The whole thing ships as:
research-system/
AGENTS.md # project conventions
skills/
run-research/
SKILL.md # the top-level workflow
servers/
research-mcp/ # the MCP server
pyproject.toml
src/
agents/
writer/ # the A2A agent
gateway/
config.yaml # RBAC + pinned manifest
AIENGINEERINGFROMSCRATCH.COM 241

CAPSTONE — BUILD A COMPLETE TOOL ECOSYSTEM
Users deploy with docker compose up. Claude Code, Cursor, Codex, and opencode users can
drive the system by invoking the run-research skill.
What each Phase 13 lesson contributed
Lesson What the capstone uses
01-05 Tool interface, provider-portability, parallel calls, schemas, linting
06-10 MCP primitives, server, client, transports, resources + prompts
11-14 Sampling, roots + elicitation, async tasks, ui:// apps
15-17 Tool poisoning, OAuth 2.1, gateway + registry
18 A2A sub-agent delegation
19 OTel GenAI tracing
20 Routing gateway for the LLM layer
21 SKILL.md + AGENTS.md packaging
Interactive figure: t3-capstone-chain. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/13-tools-and-protocols/23-capstone-tool-ecosystem
Use It
code/main.py stitches the previous lessons’ patterns into one runnable demo. All stdlib, all
in-process so you can read it end to end. It runs the full flow for the research-and-report
scenario: handshake with gateway, OAuth 2.1 simulated, tools/list merged, generate_report
as a task, A2A call to writer, ui:// resource returned, OTel spans emitted.
What to look at:
• One trace id across every hop.
• Gateway policy blocks a second user from writing.
• Task lifecycle goes working → completed and returns both text and ui:// content.
• A2A call’s inner state is opaque to the orchestrator.
• AGENTS.md and SKILL.md are the only files another agent needs to reproduce the work-
flow.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/13-tools-and-protocols/23-capstone-tool-
ecosystem
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/13-tools-and-protocols/23-capstone-tool-
ecosystem/code
1. Run code/main.py. Note the single trace id and how spans nest. Count how many prim-
itives from Phase 13 the demo touches.
2. Extend the demo: add a second backend MCP server (e.g. bibliography) and confirm
the gateway merges its tools into the same namespace.
AIENGINEERINGFROMSCRATCH.COM 242

CAPSTONE — BUILD A COMPLETE TOOL ECOSYSTEM
3. Replace the fake A2A writer agent with a real one running on a subprocess. Use the
Lesson 19 harness.
4. Add a PII redaction step in the routing gateway between the orchestrator and the LLM.
Confirm emails in the user query get scrubbed.
5. Write an AGENTS.md for a teammate who will maintain this system. It should take under
five minutes to read and give them everything they need to drive the capstone in Cursor
or Codex.
Key Terms
Term What people say What it actually means
Capstone “Phase-13 integration demo” End-to-end system using every primitive
Research “The scenario” Search, summarize, render pattern
and report
Ecosystem “All the pieces together” Server + client + gateway + sub-agent +
telemetry + package
Trace “Single trace id” Every hop’s span shares the trace;
hierarchy parent-child via span ids
Gateway- “Transitive auth” Client sees only gateway’s token; gateway
issued holds upstream creds
token
Merged “All tools in one flat list” Multi-server merge at the gateway,
namespace prefix-on-collision
Opacity “A2A call hides internals” Sub-agent’s reasoning invisible to
boundary orchestrator
Three- “AGENTS.md + SKILL.md + Project context + workflow + tools
layer stack MCP”
Defense-in- “Multiple security layers” Pinned hashes, OAuth, RBAC, Rule of Two,
depth audit log
Spec “What we ship that the spec Checklist mapping deliverables to
compliance requires” 2025-11-25 requirements
matrix
Further Reading
• MCP — Specification 2025-11-25 — consolidated reference
• MCP blog — 2026 roadmap — where the protocol is heading
• a2a-protocol.org — A2A v1.0 reference
• OpenTelemetry — GenAI semconv — canonical tracing conventions
• Anthropic — Claude Agent SDK overview — production agent runtime patterns
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/13-tools-and-protocols/23-capstone-tool-ecosystem
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/13-tools-and-protocols/23-capstone-tool-ecosystem/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 243