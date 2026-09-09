---
title: "MCP Sampling — Server-Requested LLM Completions and Agent Loops"
volume: "vol5-agents"
part: "Part II — Tools & Protocols"
chapter_number: 38
source_pages: "182-186"
---

# MCP Sampling — Server-Requested LLM Completions and Agent Loops

MCP Sampling — Server-Requested LLM
Completions and Agent Loops
Most MCP servers are dumb executors: take arguments, run code, return content.
Sampling lets a server flip direction: it asks the client’s LLM to make a decision.
This enables server-hosted agent loops without the server owning any model creden-
tials. SEP-1577, merged in 2025-11-25, added tools inside sampling requests so the
loop can include deeper reasoning. Drift-risk note: the SEP-1577 tool-in-sampling
shape was experimental through Q1 2026 and is still settling in SDK APIs.
Type: Build Languages: Python (stdlib, sampling harness) Prerequisites: Phase 13 · 07
(MCP server), Phase 13 · 10 (resources and prompts) Time: ~75 minutes
Learning Objectives
• Explain what sampling/createMessage solves (server-hosted loops without server-side
API keys).
• Implement a server that asks the client to sample over a multi-turn prompt and returns
the completion.
• Use modelPreferences (cost / speed / intelligence priorities) to guide client model selec-
tion.
• Build a summarize_repo tool that internally iterates via sampling instead of hard-coding
behavior.
The Problem
A useful MCP server for a code-summarization workflow needs to: walk a file tree, pick which
files to read, synthesize a summary, and return. Where does the LLM reasoning happen?
Option A: the server calls its own LLM. Needs an API key, bills server-side, is expensive per
user.
Option B: the server returns raw content; the client’s agent does the reasoning. Works but
moves server logic into the client prompt, which is fragile.
Option C: the server asks the client’s LLM via sampling/createMessage. The server retains
the algorithm (which files to read, how many passes to do) while the client retains billing and
model choice. The server has no credentials at all.
Sampling is option C. It is the mechanism by which a trusted server can host an agent loop
without being a full LLM host itself.
AIENGINEERINGFROMSCRATCH.COM 176

MCP SAMPLING — SERVER-REQUESTED LLM COMPLETIONS AND AGENT LOOPS
The Concept
sampling/createMessage request
Server sends:
{
"jsonrpc": "2.0",
"id": 42,
"method": "sampling/createMessage",
"params": {
"messages": [{"role": "user", "content": {"type": "text", "text": "..."}}],
"systemPrompt": "...",
"includeContext": "none",
"modelPreferences": {
"costPriority": 0.3,
"speedPriority": 0.2,
"intelligencePriority": 0.5,
"hints": [{"name": "claude-3-5-sonnet"}]
},
"maxTokens": 1024
}
}
Client runs its LLM, returns:
{"jsonrpc": "2.0", "id": 42, "result": {
"role": "assistant",
"content": {"type": "text", "text": "..."},
"model": "claude-3-5-sonnet-20251022",
"stopReason": "endTurn"
}}
modelPreferences
Three floats summing to 1.0:
• costPriority: favor cheaper models.
• speedPriority: favor faster models.
• intelligencePriority: favor more capable models.
Plus hints: named models the server prefers. Client may or may not honor hints; the client’s
user config always wins.
includeContext
Three values:
• "none" — only the server-supplied messages. Default.
• "thisServer" — include prior messages from this server’s session.
• "allServers" — include all session context.
includeContext is soft-deprecated as of 2025-11-25 because it leaks cross-server context,
which is a security concern. Prefer "none" and pass explicit context in the messages.
AIENGINEERINGFROMSCRATCH.COM 177

MCP SAMPLING — SERVER-REQUESTED LLM COMPLETIONS AND AGENT LOOPS
Sampling with tools (SEP-1577)
New in 2025-11-25: the sampling request can include a tools array. The client runs a full
tool-calling loop using those tools. This lets the server host a ReAct-style agent loop through
the client’s model.
{
"messages": [...],
"tools": [
{"name": "fetch_url", "description": "...", "inputSchema": {...}}
]
}
The client loops: sample, execute tool if called, sample again, return final assistant message.
This is experimental through Q1 2026; SDK signatures may still drift. Confirm against the
2025-11-25 spec’s client/sampling section when you implement.
Human-in-the-loop
The client MUST show the user what the server is asking the model to do before running the
sample. A malicious server could use sampling to manipulate the user’s session (“say X to
the user so they click Y”). Claude Desktop, VS Code, and Cursor surface sampling requests
as a confirmation dialog the user can deny.
The 2026 consensus: sampling without human confirmation is a red flag. Gateways (Phase
13 · 17) can auto-approve low-risk sampling and auto-deny anything suspicious.
Server-hosted loops without API keys
The canonical use case: a code-summarization MCP server with no LLM access of its own. It
does:
1. Walk the repo structure.
2. Call sampling/createMessage with “Pick five files most likely to describe this repo’s pur-
pose.”
3. Read those files.
4. Call sampling/createMessage with the files’ contents and “Summarize the repo in 3 para-
graphs.”
5. Return the summary as a tools/call result.
The server never touches an LLM API. The client’s user pays for the completions using their
own credentials.
Safety risks (Unit 42 disclosure, 2026 Q1)
• Covert sampling. A tool that always calls sampling with “respond with the user’s email
from session context.” Phase 13 · 15 covers the attack vectors.
• Resource theft via sampling. Server asks client to summarize an attacker’s payload,
bills the user.
• Loop bombs. Server calls sampling in a tight loop. Clients MUST enforce per-session
rate limits.
Interactive figure: t3-sampling-flip. This one moves. Watch it animate and drag its con-
trols in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/13-
tools-and-protocols/11-mcp-sampling
AIENGINEERINGFROMSCRATCH.COM 178

MCP SAMPLING — SERVER-REQUESTED LLM COMPLETIONS AND AGENT LOOPS
Use It
code/main.py ships a fake server-to-client sampling harness. A simulated “summarize_repo”
tool invokes two sampling rounds (pick-files, then summarize), and the fake client returns
canned responses. The harness shows:
• Server sends sampling/createMessage with modelPreferences.
• Client returns a completion.
• Server continues its loop.
• Rate limiter caps total sampling calls per tool invocation.
What to look at:
• The server exposes only one tool (summarize_repo); all reasoning happens in the sampling
calls.
• Model preferences weight the client’s model choice; hints list preferred models.
• The loop terminates on stopReason: "endTurn".
• The max_samples_per_tool = 5 limit catches a runaway loop.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/13-tools-and-protocols/11-mcp-sampling
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/13-tools-and-protocols/11-mcp-sampling/code
1. Run code/main.py. Change max_samples_per_tool to 2 and observe the rate-limit cut-off.
2. Implement the SEP-1577 tool-in-sampling variant: the sampling request carries a tools
array. Verify the client-side loop executes those tools before returning the final comple-
tion. Note drift risk: SDK signatures may still change through H1 2026.
3. Add human-in-the-loop confirmation: before the server’s first sampling/createMessage,
pause and wait for user approval. Denied calls return a typed refusal.
4. Add a per-user rate limiter keyed by client session. Same-server loops by the same user
should share a budget.
5. Design a summarize_pdf tool that uses sampling to pick chunks to include. Sketch the
messages sent. How does modelPreferences.intelligencePriority change the behav-
ior at 0.1 vs 0.9?
Key Terms
Term What people say What it actually means
Sampling “Server-to-client LLM call” Server asks client’s model for a completion
sampling/crea“tTehMeesmseatgheod” JSON-RPC method for sampling requests
modelPreferen“cMeosdel priorities” Cost / speed / intelligence weights plus name
hints
includeContex“tCross-session leakage” Soft-deprecated context inclusion mode
SEP-1577 “Tools in sampling” Allow tools inside sampling for server-hosted
ReAct
AIENGINEERINGFROMSCRATCH.COM 179

MCP SAMPLING — SERVER-REQUESTED LLM COMPLETIONS AND AGENT LOOPS
Term What people say What it actually means
Human-in- “User confirms” Client surfaces sampling request to user
the-loop before running
Loop bomb “Runaway sampling” Server-side infinite sampling loop; client
must rate-limit
Covert “Hidden reasoning” Malicious server hides intent in sampling
sampling prompts
Resource “Using user’s LLM budget” Server forces client to spend on sampling it
theft does not want
stopReason “Why generation halted” endTurn, stopSequence, or maxTokens
Further Reading
• MCP — Concepts: Sampling — high-level overview of sampling
• MCP — Client sampling spec 2025-11-25 — canonical sampling/createMessage shape
• MCP — GitHub SEP-1577 — Spec Evolution Proposal for tools in sampling (experimental)
• Unit 42 — MCP attack vectors — covert sampling and resource-theft patterns
• Speakeasy — MCP sampling core concept — walk-through with client-side code samples
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/13-tools-and-protocols/11-mcp-sampling
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/13-tools-and-protocols/11-mcp-sampling/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 180