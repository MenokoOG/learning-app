---
title: "The Harness as a Library — Subagents and Session Store"
volume: "vol5-agents"
part: "Part III — Agent Engineering"
chapter_number: 66
source_pages: "320-323"
---

# The Harness as a Library — Subagents and Session Store

The Harness as a Library — Subagents
and Session Store
A harness you can import: built-in tools, subagents for context isolation, hooks, W3C
trace propagation, session persistence. The Claude Agent SDK is the reference
example — the library form of the Claude Code harness — and Claude Managed
Agents is the hosted alternative for long-running async work.
Type: Learn + Build Languages: Python (stdlib) Prerequisites: Phase 14 · 01 (Agent Loop),
Phase 14 · 10 (Skill Libraries) Time: ~75 minutes
Learning Objectives
• Explain the difference between the Anthropic Client SDK (raw API) and the Claude Agent
SDK (harness shape).
• Describe subagents — parallelization and context isolation — and when to reach for
them.
• Name the Python SDK’s session store surface (append, load, list_sessions, delete,
list_subkeys) and the role of --session-mirror.
• Implement a stdlib harness with built-in tools, subagent spawning with isolated context,
lifecycle hooks, and a session store.
The Problem
A raw LLM API gets you one round-trip. A production agent needs tool execution, MCP
servers, lifecycle hooks, subagent spawning, session persistence, trace propagation. Claude
Agent SDK ships this shape as a library — the same harness Claude Code uses, exposed for
custom agents.
The Concept
Client SDK vs Agent SDK
• Client SDK (anthropic). Raw Messages API. You own the loop, the tools, the state.
• Agent SDK (claude-agent-sdk). Built-in tool execution, MCP connections, hooks, sub-
agent spawning, session store. The Claude Code loop as a library.
Built-in tools
The SDK ships 10+ tools out of the box: file read/write, shell, grep, glob, web fetch, more.
Custom tools register via the standard tool-schema interface.
AIENGINEERINGFROMSCRATCH.COM 314

THE HARNESS AS A LIBRARY — SUBAGENTS AND SESSION STORE
Subagents
Two purposes documented by Anthropic:
1. Parallelization. Run independent work concurrently. “Find the test file for each of
these 20 modules” is 20 parallel subagent tasks.
2. Context isolation. Subagents use their own context window; only results return to the
orchestrator. The orchestrator’s budget is preserved.
Python SDK recent additions: list_subagents(), get_subagent_messages() for reading sub-
agent transcripts.
Session store
Protocol parity with TypeScript:
• append(session_id, message) — add a turn.
• load(session_id) — restore conversation.
• list_sessions() — enumerate.
• delete(session_id) — with cascade to subagent sessions.
• list_subkeys(session_id) — list subagent keys.
--session-mirror (CLI flag) mirrors the transcript to an external file as it streams, for debug-
ging.
Hooks
Lifecycle hooks you can register:
• PreToolUse, PostToolUse — gate or audit tool calls.
• SessionStart, SessionEnd — set up and tear down.
• UserPromptSubmit — act on user input before the model sees it.
• PreCompact — run before context compaction.
• Stop — cleanup on agent exit.
• Notification — side-channel alerts.
Hooks are how pro-workflow (Phase 14 curriculum reference) and similar systems add cross-
cutting behavior.
W3C trace context
OTel spans active on the caller propagate into the CLI subprocess via W3C trace context
headers. The whole multi-process trace shows up as one trace in your backend.
Claude Managed Agents
The hosted alternative (beta header managed-agents-2026-04-01). Long-running async work,
built-in prompt caching, built-in compaction. Trade control for managed infrastructure.
Where this pattern goes wrong
• Subagent over-spawn. Spawning 100 subagents for 100 tiny tasks. Overhead domi-
nates. Batch instead.
• Hook creep. Every team adds hooks; startup time balloons. Review hooks quarterly.
• Session bloat. Sessions accumulate; size grows. Use list_sessions + expiry policy.
AIENGINEERINGFROMSCRATCH.COM 315

THE HARNESS AS A LIBRARY — SUBAGENTS AND SESSION STORE
Interactive figure: ae-subagent-isolation. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/14-agent-engineering/17-claude-agent-sdk
Build It
code/main.py implements the SDK shape in stdlib:
• Tool, ToolRegistry with built-in read_file, write_file, list_dir.
• Subagent — private context, isolated run, results returned.
• SessionStore — append, load, list, delete, list_subkeys.
• Hooks — pre_tool_use, post_tool_use, session_start, session_end.
• A demo: main agent spawns 3 subagents in parallel (each isolated), aggregates results,
persists session.
Run it:
python3 code/main.py
The trace shows subagent context isolation (orchestrator context size stays bounded), hook
execution, and session persistence.
Use It
• Claude Agent SDK for Claude-first products that want the Claude Code harness shape.
• Claude Managed Agents for hosted long-running async work.
• OpenAI Agents SDK (Lesson 16) for OpenAI-first counterparts.
• LangGraph + custom tools if you want the graph-shaped state machine instead.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/17-claude-agent-sdk
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/17-claude-agent-sdk/code
1. Add a subagent spawner that batches 20 tasks into groups of 5 parallel subagents. Mea-
sure orchestrator context size vs one-per-task.
2. Implement a PreToolUse hook that rate-limits write_file calls (5 per minute per session).
Trace the behavior.
3. Wire list_subkeys to render a subagent tree. What does deep nesting look like?
4. Port the toy to the real claude-agent-sdk Python package. What changes about tool
registration?
5. Read the Claude Managed Agents docs. When would you switch from self-hosted to
managed?
Key Terms
AIENGINEERINGFROMSCRATCH.COM 316

THE HARNESS AS A LIBRARY — SUBAGENTS AND SESSION STORE
Term What people say What it actually means
Agent SDK “Claude Code as a library” Harness shape: tools, MCP, hooks, subagents,
session store
Subagent “Child agent” Separate context, own budget; results bubble
up
Session “Conversation DB” Persist, load, list, delete turns with subagent
store cascade
Hook “Lifecycle callback” Pre/post tool, session, prompt submit,
compact, stop
W3C trace “Cross-process trace” Parent span propagates into CLI subprocess
context
Managed “Hosted harness” Anthropic-hosted long-running async work
Agents
--session- “Transcript mirror” Writes session turns to an external file as
mirror they stream
MCP “Tool surface” External tool/resource source attached to the
server agent
Further Reading
• Claude Agent SDK overview — the library form of Claude Code
• Anthropic, Building agents with the Claude Agent SDK — production patterns
• Claude Managed Agents overview — hosted alternative
• OpenAI Agents SDK — counterpart
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/14-agent-engineering/17-claude-agent-sdk
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/14-agent-engineering/17-claude-agent-sdk/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/14-agent-engineering/17-claude-agent-sdk
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 317