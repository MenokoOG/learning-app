---
title: "MCP Fundamentals — Primitives, Lifecycle, JSON-RPC Base"
volume: "vol5-agents"
part: "Part II — Tools & Protocols"
chapter_number: 33
source_pages: "158-162"
---

# MCP Fundamentals — Primitives, Lifecycle, JSON-RPC Base

MCP Fundamentals — Primitives, Lifecy-
cle, JSON-RPC Base
Every integration before MCP was a one-off. The Model Context Protocol, first
shipped by Anthropic in November 2024 and now stewarded by the Linux Founda-
tion’s Agentic AI Foundation, standardizes discovery and invocation so any client
can speak to any server. The 2025-11-25 spec names six primitives (three server,
three client), a three-phase lifecycle, and a JSON-RPC 2.0 wire format. Learn those
and the rest of the MCP chapter of this phase becomes reading.
Type: Learn Languages: Python (stdlib, JSON-RPC parser) Prerequisites: Phase 13 · 01
through 05 (the tool interface and function calling) Time: ~45 minutes
Learning Objectives
• Name all six MCP primitives (tools, resources, prompts on the server; roots, sampling,
elicitation on the client) and give one use case each.
• Walk through the three-phase lifecycle (initialize, operation, shutdown) and state who
sends which message at each phase.
• Parse and emit JSON-RPC 2.0 request, response, and notification envelopes.
• Explain what capability negotiation at initialize is and what breaks without it.
The Problem
Before MCP, every tool-using agent had its own protocol. Cursor had an MCP-shaped but
incompatible tool system. Claude Desktop shipped with a different one. VS Code’s Copilot
extension had a third. A team that built a “Postgres query” tool wrote the same tool three
times, each to a different host’s API. Reusing it required copying code.
The result was a Cambrian explosion of one-off integrations and a ceiling on ecosystem veloc-
ity.
MCP fixes this by standardizing the wire format. A single MCP server works in every MCP
client: Claude Desktop, ChatGPT, Cursor, VS Code, Gemini, Goose, Zed, Windsurf, 300+
clients by April 2026. 110M monthly SDK downloads. 10,000+ public servers. The Linux
Foundation took stewardship in December 2025 under the new Agentic AI Foundation.
The spec revision used in this phase is 2025-11-25. It adds async Tasks (SEP-1686), URL-
mode elicitation (SEP-1036), sampling with tools (SEP-1577), incremental scope consent (SEP-
835), and OAuth 2.1 resource-indicator semantics. Phase 13 · 09 through 16 cover those
extensions. This lesson stops at the base.
AIENGINEERINGFROMSCRATCH.COM 152

MCP FUNDAMENTALS — PRIMITIVES, LIFECYCLE, JSON-RPC BASE
The Concept
Three server primitives
1. Tools. Callable actions. Same four-step loop from Phase 13 · 01.
2. Resources. Exposed data. Read-only content addressable by URI: file:///path,
db://query/..., custom schemes.
3. Prompts. Reusable templates. Slash-commands in the host UI; server supplies the
template, client fills arguments.
Three client primitives
4. Roots. The set of URIs the server is allowed to touch. Client declares them; server
respects them.
5. Sampling. Server requests the client’s model to perform a completion. Enables server-
hosted agent loops without server-side API keys.
6. Elicitation. Server asks the client’s user for structured input mid-flight. Forms or URLs
(SEP-1036).
Every capability in MCP belongs to exactly one of these six. Phase 13 · 10 through 14 cover
each in depth.
Wire format: JSON-RPC 2.0
Every message is a JSON object with these fields:
• Requests: {jsonrpc: "2.0", id, method, params}.
• Responses: {jsonrpc: "2.0", id, result | error}.
• Notifications: {jsonrpc: "2.0", method, params} — no id, no response expected.
The base spec has ~15 methods, grouped by primitive. The important ones:
• initialize / initialized (handshake)
• tools/list, tools/call
• resources/list, resources/read, resources/subscribe
• prompts/list, prompts/get
• sampling/createMessage (server-to-client)
• notifications/tools/list_changed, notifications/resources/updated, notifica-
tions/progress
Three-phase lifecycle
Phase 1: initialize.
Client sends initialize with its capabilities and clientInfo. Server responds with its
own capabilities, serverInfo, and the spec version it speaks. Client sends notifica-
tions/initialized when it has digested the response. From here on, either side can send
requests per the negotiated capabilities.
Phase 2: operation.
Bidirectional. Client calls tools/list to discover, then tools/call to invoke. Server
may send sampling/createMessage if it declared that capability. Server may send no-
tifications/tools/list_changed when its tool set mutates. Client may send notifica-
tions/roots/list_changed when the user changes root scope.
Phase 3: shutdown.
AIENGINEERINGFROMSCRATCH.COM 153

MCP FUNDAMENTALS — PRIMITIVES, LIFECYCLE, JSON-RPC BASE
Either side closes the transport. No structured shutdown method in MCP; the transport (stdio
or Streamable HTTP, Phase 13 · 09) carries the end-of-connection signal.
Capability negotiation
capabilities in the initialize handshake is the contract. Example from a server:
{
"tools": {"listChanged": true},
"resources": {"subscribe": true, "listChanged": true},
"prompts": {"listChanged": true}
}
The server declares it can emit tools/list_changed notifications and supports re-
sources/subscribe. The client agrees by declaring its own:
{
"roots": {"listChanged": true},
"sampling": {},
"elicitation": {}
}
If the client does not declare sampling, the server must not call sampling/createMessage.
Symmetric: if the server does not declare resources.subscribe, the client must not try to
subscribe.
This is what prevents ecosystem drift. A client that does not support sampling is still a valid
MCP client; a server that does not call sampling is still a valid MCP server. They just do not
use that feature together.
Structured content and error shapes
tools/call returns a content array of typed blocks: text, image, resource. Phase 13 · 14
adds MCP Apps (ui:// interactive UI) to that list.
Errors use JSON-RPC error codes. The spec-defined additions: -32002 “Resource not found”,
-32603 “Internal error”, plus MCP-specific error data as error.data.
Client capabilities vs tool call details
A common confusion: capabilities.tools is whether the client supports tool-list-changed
notifications. Whether the client WILL call specific tools is a runtime choice driven by its
model, not a capability flag. The capability flag is the spec-level contract. The model’s choice
is orthogonal.
Why JSON-RPC and not REST?
JSON-RPC 2.0 (2010) is a lightweight bidirectional protocol. REST is client-initiated. MCP
needed server-initiated messages (sampling, notifications), so JSON-RPC with its symmetric
request/response shape was a natural fit. JSON-RPC also composes cleanly over stdio and
WebSocket/Streamable HTTP without re-inventing HTTP’s request shape.
Interactive figure: mcp-tool-call. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/13-tools-
and-protocols/06-mcp-fundamentals
AIENGINEERINGFROMSCRATCH.COM 154

MCP FUNDAMENTALS — PRIMITIVES, LIFECYCLE, JSON-RPC BASE
Use It
code/main.py ships a minimal JSON-RPC 2.0 parser and emitter, then walks the initialize
→ tools/list → tools/call → shutdown sequence by hand, printing every message. No real
transport; just the message shapes. Compare to the spec linked in Further Reading to verify
each envelope.
What to look at:
• initialize declares capabilities both ways; the response has serverInfo and proto-
colVersion: "2025-11-25".
• tools/list returns a tools array; each entry has name, description, inputSchema.
• tools/call uses params.name and params.arguments.
• The response content is an array of {type, text} blocks.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/13-tools-and-protocols/06-mcp-fundamentals
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/13-tools-and-protocols/06-mcp-fundamentals/code
1. Run code/main.py. Identify the line where capability negotiation happens and describe
what would change if the server did not declare tools.listChanged.
2. Extend the parser to handle notifications/progress. The message shape: {method:
"notifications/progress", params: {progressToken, progress, total}}. Emit it
while a long-running tools/call is in progress and confirm the client handler would
display a progress bar.
3. Read the MCP 2025-11-25 spec top to bottom — the whole document is about 80 pages.
Identify the one capability flag most servers do NOT need. Hint: it relates to resource
subscription.
4. Sketch on paper the primitive a hypothetical “cron job” feature would belong to. (Hint:
the server wants the client to invoke it at a scheduled time. None of the six primitives
fit today.) MCP’s 2026 roadmap has a draft SEP for this.
5. Parse one session log from an open MCP server on GitHub. Count request vs response
vs notification messages. Compute what fraction of traffic is lifecycle vs operation.
Key Terms
Term What people say What it actually means
MCP “Model Context Protocol” Open protocol for model-to-tool discovery
and invocation
Server “What a server exposes” tools (actions), resources (data), prompts
primitive (templates)
Client “What a client lets servers roots (scope), sampling (LLM callbacks),
primitive use” elicitation (user input)
JSON-RPC “The wire format” Symmetric request/response/notification
2.0 envelopes
AIENGINEERINGFROMSCRATCH.COM 155

MCP FUNDAMENTALS — PRIMITIVES, LIFECYCLE, JSON-RPC BASE
Term What people say What it actually means
initialize “Capability negotiation” First message pair; servers and clients
handshake declare features they support
tools/list “Discovery” Client asks server for its current tool set
tools/call “Invocation” Client asks server to execute a tool with
arguments
notifications“/M*u_ctahtainogneedvents” Server tells client that its primitive list has
changed
Content “Typed result” {type: "text" \| "image" \| "resource" \|
block "ui_resource"} in tool result
SEP “Spec Evolution Proposal” Named draft proposal (e.g. SEP-1686 for
async Tasks)
Further Reading
• Model Context Protocol — Specification 2025-11-25 — the canonical spec document
• Model Context Protocol — Architecture concepts — the six-primitive mental model
• Anthropic — Introducing the Model Context Protocol — November 2024 launch post
• MCP blog — First MCP anniversary — one-year retrospective and the 2025-11-25 spec
changes
• WorkOS — MCP 2025-11-25 spec update — summary of SEP-1686, 1036, 1577, 835, and
1724
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/13-tools-and-protocols/06-mcp-fundamentals
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/13-tools-and-protocols/06-mcp-fundamentals/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 156