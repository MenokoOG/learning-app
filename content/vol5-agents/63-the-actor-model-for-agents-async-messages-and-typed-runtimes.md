---
title: "The Actor Model for Agents — Async Messages and Typed Runtimes"
volume: "vol5-agents"
part: "Part III — Agent Engineering"
chapter_number: 63
source_pages: "305-308"
---

# The Actor Model for Agents — Async Messages and Typed Runtimes

The Actor Model for Agents — Async
Messages and Typed Runtimes
Agents as actors: async message exchange, event-driven handlers, fault isolation,
natural concurrency. AutoGen v0.4 (Microsoft Research, Jan 2025) redesigned
agent orchestration around this model; the framework is now in maintenance mode,
with Microsoft Agent Framework (public preview Oct 2025) as its production suc-
cessor.
Type: Learn + Build Languages: Python (stdlib) Prerequisites: Phase 14 · 01 (Agent Loop),
Phase 14 · 12 (Workflow Patterns) Time: ~75 minutes
Learning Objectives
• Describe the actor model: agents as actors, messages as the only IPC, failure isolation
per actor.
• Name AutoGen v0.4’s three API layers — Core, AgentChat, Extensions — and what each
is for.
• Explain why decoupling message delivery from handling gives fault isolation and natural
concurrency.
• Implement a stdlib actor runtime in Python and port a two-agent code-review flow onto
it.
The Problem
Most agent frameworks are synchronous: one agent produces, one agent consumes, in a call
stack. Failures crash the stack. Concurrency is bolted on. Distribution requires rewriting.
AutoGen v0.4’s answer: the actor model. Each agent is an actor with a private inbox. Mes-
sages are the only interaction. The runtime decouples delivery from handling. Failures isolate
to one actor. Concurrency is native. Distribution is just different transport.
The Concept
Actors
An actor has:
• A private state (never directly touched from outside).
• An inbox (message queue).
• A handler: receive(message) -> effects where effects can be “reply,” “send to other
actor,” “spawn new actor,” “update state,” “stop self.”
Two actors cannot share memory. They can only send messages.
AIENGINEERINGFROMSCRATCH.COM 299

THE ACTOR MODEL FOR AGENTS — ASYNC MESSAGES AND TYPED RUNTIMES
Three API layers
AutoGen v0.4 splits its surface into three:
1. Core. Low-level actor framework. AgentRuntime, Agent, Message, Topic. Async message
exchange, event-driven.
2. AgentChat. Task-driven high-level API (replacement for v0.2’s ConversableAgent). As-
sistantAgent, UserProxyAgent, RoundRobinGroupChat, SelectorGroupChat.
3. Extensions. Integrations — OpenAI, Anthropic, Azure, tools, memory.
Why decoupling matters
In the v0.2 model, calling agent_a.chat(agent_b) synchronously blocks agent_a until agent_b
returns. In v0.4, send(agent_b, msg) puts the message in agent_b’s inbox and returns. The
runtime delivers later. Three consequences:
• Fault isolation. Agent B crashing does not crash Agent A — the runtime catches the
failure in B’s handler and decides what to do (log, retry, dead-letter).
• Natural concurrency. Many messages in flight at once; actors process their inbox
concurrently.
• Distribution-ready. Inbox + transport is the same abstraction whether the actor is
in-process or on another host.
Topologies
• RoundRobinGroupChat. Agents take turns in a fixed rotation.
• SelectorGroupChat. A selector agent picks who goes next based on conversation con-
text.
• Magentic-One. Reference multi-agent team for web browsing, code execution, file han-
dling. Built on AgentChat.
Observability
OpenTelemetry support is built in. Every message emits a span; tool calls carry gen_ai.*
attributes per the 2026 OTel GenAI semantic conventions (Lesson 23).
Status: maintenance mode
Early 2026: AutoGen v0.7.x is stable for research and prototyping. Microsoft has shifted
active development to the Microsoft Agent Framework, the production successor (public pre-
view Oct 1 2025; 1.0 GA was targeted for end of Q1 2026). AutoGen patterns port forward
cleanly — the actor model is the durable idea.
Interactive figure: actor-mailbox. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/14-
agent-engineering/14-autogen-actor-model
Build It
code/main.py implements a stdlib actor runtime:
• Message — typed payload with sender, recipient, topic, body.
• Actor — abstract with receive(message, runtime).
• Runtime — event loop with a shared queue, delivery, failure isolation.
AIENGINEERINGFROMSCRATCH.COM 300

THE ACTOR MODEL FOR AGENTS — ASYNC MESSAGES AND TYPED RUNTIMES
• A two-actor demo: ReviewerAgent reviews code, ChecklistAgent runs a checklist; they
exchange messages until consensus.
Run it:
python3 code/main.py
The trace shows message delivery, a simulated failure in one actor that does not crash the
other, and convergence on a shared verdict.
Use It
• AutoGen v0.4/v0.7 (maintenance) — stable for research, prototyping, multi-agent pat-
terns.
• Microsoft Agent Framework — the production successor (public preview Oct 2025);
same actor-model ideas in a refreshed API.
• LangGraph swarm topology (Lesson 13) — similar pattern via shared-tool handoffs.
• Custom actor runtime — when you need specific transport (NATS, RabbitMQ, gRPC).
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/14-autogen-actor-model
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/14-agent-engineering/14-autogen-actor-model/code
1. Add a dead-letter queue: when a handler raises, park the failing message for human
inspection. How often does DLQ get hit in your toy?
2. Implement SelectorGroupChat: a selector actor picks who processes the next message
based on conversation state.
3. Add distributed transport: swap the in-process queue for a JSON-over-HTTP server so
actors can run in separate processes.
4. Wire an OTel span per message (or a no-op stand-in). Emit gen_ai.agent.name,
gen_ai.operation.name per Lesson 23.
5. Read AutoGen v0.4’s architecture post. Port your toy to the real autogen_core API. What
did you skip that matters in production?
Key Terms
Term What people say What it actually means
Actor “Agent” Private state + inbox + handler; no shared
memory
Message “Event” Typed payload; the only way actors interact
Inbox “Mailbox” Per-actor queue of pending messages
Runtime “Agent host” Event loop that routes messages and isolates
failures
Topic “Channel” Named publish-subscribe route between
actors
Fault “Let it crash” One actor failing does not crash others
isolation
AIENGINEERINGFROMSCRATCH.COM 301

THE ACTOR MODEL FOR AGENTS — ASYNC MESSAGES AND TYPED RUNTIMES
Term What people say What it actually means
RoundRobinG“roFuixpeCdh-raottation team” Agents take turns in order
SelectorGroup“CChoanttext-routed team” Selector picks who goes next
Magentic- “Reference team” Multi-agent squad for web + code + files
One
Further Reading
• AutoGen v0.4, Microsoft Research — the redesign post
• LangGraph overview — graph-shaped alternative
• OpenTelemetry GenAI semantic conventions — spans AutoGen emits by default
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/14-agent-engineering/14-autogen-actor-model
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/14-agent-engineering/14-autogen-actor-model/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/14-agent-engineering/14-autogen-actor-model
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 302