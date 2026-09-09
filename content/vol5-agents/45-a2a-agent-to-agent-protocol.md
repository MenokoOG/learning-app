---
title: "A2A — Agent-to-Agent Protocol"
volume: "vol5-agents"
part: "Part II — Tools & Protocols"
chapter_number: 45
source_pages: "228-232"
---

# A2A — Agent-to-Agent Protocol

A2A — Agent-to-Agent Protocol
MCP is agent-to-tool. A2A (Agent2Agent) is agent-to-agent — an open protocol
for letting opaque agents built on different frameworks collaborate. Released by
Google in April 2025, donated to the Linux Foundation in June 2025, reaching v1.0
in April 2026 with 150+ supporters including AWS, Cisco, Microsoft, Salesforce,
SAP, and ServiceNow. It absorbed IBM’s ACP and added the AP2 payments ex-
tension. This lesson walks the Agent Card, Task lifecycle, and the two transport
bindings.
Type: Build Languages: Python (stdlib, Agent Card + Task harness) Prerequisites: Phase
13 · 06 (MCP fundamentals), Phase 13 · 08 (MCP client) Time: ~75 minutes
Learning Objectives
• Distinguish agent-to-tool (MCP) from agent-to-agent (A2A) use cases.
• Publish an Agent Card at /.well-known/agent.json with skills and endpoint metadata.
• Walk the Task lifecycle (submitted → working → input-required → completed / failed /
canceled / rejected).
• Use Messages with Parts (text, file, data) and Artifacts as outputs.
The Problem
A customer-service agent needs to delegate report-writing to a specialized writer agent. Op-
tions pre-A2A:
• Custom REST API. Works but every pairing is a one-off.
• Shared codebase. Requires the two agents to run the same framework.
• MCP. Doesn’t fit: MCP is for calling tools, not for two agents collaborating while preserv-
ing each agent’s opaque internal reasoning.
A2A fills the gap. It models the interaction as one agent sending a Task to another, with a
lifecycle, messages, and artifacts. The called agent’s internal state stays opaque — the caller
sees only task state transitions and eventual outputs.
A2A is the “let agents across frameworks talk to each other” protocol. It does not replace
MCP; the two are complementary.
The Concept
Agent Card
Every A2A-compliant agent publishes a card at /.well-known/agent.json:
{
"schemaVersion": "1.0",
"name": "research-agent",
AIENGINEERINGFROMSCRATCH.COM 222

A2A — AGENT-TO-AGENT PROTOCOL
"description": "Summarizes academic papers and drafts citations.",
"url": "https://research.example.com/a2a",
"version": "1.2.0",
"skills": [
{
"id": "summarize_paper",
"name": "Summarize a paper",
"description": "Read a paper PDF and produce a 3-paragraph summary.",
"inputModes": ["text", "file"],
"outputModes": ["text", "artifact"]
}
],
"capabilities": {"streaming": true, "pushNotifications": true}
}
Discovery is URL-based: fetch the card, learn the URL of the A2A endpoint, enumerate skills.
Signed Agent Cards (AP2)
The AP2 extension (September 2025) adds cryptographic signatures to Agent Cards. A pub-
lisher signs its own card with a JWT; consumers verify. Prevents impersonation.
Task lifecycle
submitted -> working -> completed | failed | canceled | rejected
-> input_required -> working (loop via message)
Clients initiate with tasks/send. The called agent transitions through states; clients subscribe
to state updates via SSE or poll.
Messages and Parts
A message carries one or more Parts:
• text — plain content.
• file — base64 blob with mimeType.
• data — typed JSON payload (structured input for the called agent).
Example:
{
"role": "user",
"parts": [
{"type": "text", "text": "Summarize this paper."},
{"type": "file", "file": {"name": "paper.pdf", "mimeType": "application/pdf", "bytes": "..."}},
{"type": "data", "data": {"targetLength": "3 paragraphs"}}
]
}
Artifacts
Outputs are Artifacts, not raw strings. An Artifact is a named, typed output:
{
"name": "summary",
"parts": [{"type": "text", "text": "..."}],
AIENGINEERINGFROMSCRATCH.COM 223

A2A — AGENT-TO-AGENT PROTOCOL
"mimeType": "text/markdown"
}
Artifacts can be streamed as chunks. The caller accumulates.
Two transport bindings
1. JSON-RPC over HTTP. /a2a endpoint, POST for requests, optional SSE for streaming.
Default binding.
2. gRPC. For enterprise environments where gRPC is native.
Both bindings carry the same logical message shape.
Opacity preservation
A key design principle: the called agent’s internal state is opaque. The caller sees task state
and artifacts. The called agent’s chain-of-thought, its tool calls, its sub-agent delegation —
all invisible. This is different from MCP, where tool calls are transparent.
Rationale: A2A enables competitors to collaborate without revealing internals. A2A can be
“call this customer-service agent” without the caller learning how that agent implements the
service.
Timeline
• 2025-04-09. Google announces A2A.
• 2025-06-23. Donated to Linux Foundation.
• 2025-08. Absorbs IBM’s ACP.
• 2025-09. AP2 extension (Agent Payments) ships.
• 2026-04. v1.0 released with 150+ supporting organizations.
Relationship to MCP
Dimension MCP A2A
Use case Agent-to-tool Agent-to-agent
Opacity Transparent tool Opaque inner
calls reasoning
Typical caller Agent runtime Another agent
State Tool-call result Task with lifecycle
Authorization OAuth 2.1 (Phase 13 JWT-signed Agent
· 16) Cards (AP2)
Transport Stdio / Streamable JSON-RPC over
HTTP HTTP / gRPC
Use MCP when you want to invoke a specific tool. Use A2A when you want to delegate a
whole task to another agent. Many production systems use both: an agent uses MCP for its
tool layer and A2A for its collaboration layer.
Interactive figure: a2a-task-lifecycle. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/13-tools-and-protocols/19-a2a-protocol
AIENGINEERINGFROMSCRATCH.COM 224

A2A — AGENT-TO-AGENT PROTOCOL
Use It
code/main.py implements a minimal A2A harness: a research agent publishes its card, a
writer agent receives a tasks/send with parts including a PDF and a text instruction, transi-
tions through working → input_required → working → completed, and returns a text artifact.
All stdlib; uses an in-memory transport to focus on message shapes.
What to look at:
• Agent Card JSON shape.
• Task id assignment and state transitions.
• Messages with mixed-type parts.
• Input-required branch mid-task.
• Artifact return on completion.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/13-tools-and-protocols/19-a2a-protocol
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/13-tools-and-protocols/19-a2a-protocol/code
1. Run code/main.py. Trace the full Task lifecycle, including the input-required pause
where the called agent asks for a clarification.
2. Add a signed Agent Card. Sign with HMAC over the card’s canonical JSON. Write a
verifier and confirm it fails on a mutated card.
3. Implement task streaming: the writer agent emits three incremental artifact chunks over
SSE and the caller accumulates them.
4. Design an A2A agent that wraps an MCP server. Map each MCP tool to an A2A skill.
Note the trade-offs — what opacity is lost?
5. Read the A2A v1.0 announcement and identify the one feature that is not yet imple-
mented by any framework as of April 2026. (Hint: it relates to multi-hop task delega-
tion.)
Key Terms
Term What people say What it actually means
A2A “Agent-to-Agent protocol” Open protocol for opaque agent collaboration
Agent Card “.well-known/agent.json” Published metadata describing an agent’s
skills and endpoint
Skill “A callable unit” A named operation the agent supports
(analog to MCP tool)
Task “Unit of delegation” A work item with a lifecycle and final artifact
Message “Task input” Carries Parts (text, file, data)
Part “Typed chunk” text / file / data element of a message
Artifact “Task output” Named, typed output returned on completion
AP2 “Agent Payments Protocol” Signed Agent Cards extension for trust and
payments
AIENGINEERINGFROMSCRATCH.COM 225

A2A — AGENT-TO-AGENT PROTOCOL
Term What people say What it actually means
Opacity “Black-box collaboration” Called agent’s internals are hidden from
caller
Input- “Task pause” Lifecycle state when the agent needs more
required info
Further Reading
• a2a-protocol.org — canonical A2A specification
• a2aproject/A2A — GitHub — reference implementations and SDKs
• Linux Foundation — A2A launch press release — June 2025 governance transfer
• Google Cloud — A2A protocol upgrade — roadmap and partner momentum
• Google Dev — A2A 1.0 milestone — v1.0 release notes and backward-compat guidance
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/13-tools-and-protocols/19-a2a-protocol
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/13-tools-and-protocols/19-a2a-protocol/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 226