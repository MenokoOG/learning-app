---
title: "Stateful Graph Orchestration — Durable Execution and Checkpoints"
volume: "vol5-agents"
part: "Part III — Agent Engineering"
chapter_number: 62
source_pages: "301-304"
---

# Stateful Graph Orchestration — Durable Execution and Checkpoints

Stateful Graph Orchestration — Durable
Execution and Checkpoints
Agent is a state machine; nodes are functions; edges are transitions; state is check-
pointed after each node. Resume from any failure at the last successful checkpoint.
LangGraph is the 2026 reference for this model of low-level stateful orchestration.
Type: Learn + Build Languages: Python (stdlib) Prerequisites: Phase 14 · 01 (Agent Loop),
Phase 14 · 12 (Workflow Patterns) Time: ~75 minutes
Learning Objectives
• Describe LangGraph’s core model: state machine with typed state, function nodes, con-
ditional edges, and post-node checkpoints.
• Name the four capabilities the docs highlight: durable execution, streaming, human-in-
the-loop, comprehensive memory.
• Explain the three orchestration topologies LangGraph supports: supervisor, peer-to-peer
(swarm), hierarchical (nested subgraphs).
• Implement a stdlib state graph with typed state, conditional edges, and a check-
point/resume cycle.
The Problem
Agents and workflows share a problem: when a 40-step run fails at step 38, you want to re-
sume from step 38, not start over. Second-class state models leave operators hacking retries
around a library that assumes fresh runs.
LangGraph’s design answer: state is a first-class typed object, mutations are explicit, and
checkpoints persist after every node. Resume is a load_state(session_id) call.
The Concept
The graph
A graph is defined by:
• State type. A typed dict (or Pydantic model) that every node reads and mutates.
• Nodes. Pure functions (state) -> state_update. Updates are merged into state after
return.
• Edges. Conditional or direct transitions between nodes.
• Entry and exit. START and END sentinel nodes mark the boundary.
Example: an agent with classify, refund, bug, sales, done nodes — a routing workflow as a
graph.
AIENGINEERINGFROMSCRATCH.COM 295

STATEFUL GRAPH ORCHESTRATION — DURABLE EXECUTION AND CHECKPOINTS
Durable execution
After each node returns, the runtime serializes the state and writes it to a checkpointer
(SQLite, Postgres, Redis, custom). On failure at step N, the runtime can resume(session_id)
and pick up from step N+1 with exact state.
The LangGraph docs explicitly highlight production users where this matters: Klarna, Uber,
J.P. Morgan. The claim isn’t the graph shape; it’s that the graph shape plus checkpointing
makes recovery cheap.
Streaming
Every node can yield partial output. The graph streams per-node-delta events to the caller so
UIs update as the graph runs.
Human-in-the-loop
Inspect and modify state between nodes. Implementations: pause before a critical node,
surface state to a human, accept modifications, resume. The checkpointer makes this easy
because state is already serialized.
Memory
Short-term (within a run — conversation history in state) and long-term (across runs — per-
sistent via the checkpointer plus a separate long-term store). LangGraph integrates with
external memory systems (Mem0, custom) via tools.
Three topologies
1. Supervisor. Central router LLM dispatches to specialist subagents. create_supervisor()
in langgraph-supervisor (though the LangChain team in 2026 recommends doing this
through tool calls directly for more context control).
2. Swarm / peer-to-peer. Agents hand off directly via a shared tool surface. No central
router.
3. Hierarchical. Supervisors managing sub-supervisors, implemented as nested sub-
graphs.
Where this pattern goes wrong
• Checkpoints too small. Only checkpointing conversation turns leaves tool state and
memory writes unrecoverable. Full state must serialize.
• Non-deterministic nodes. Resume assumes node inputs produce the same state up-
date. Random seeds, wall-clock, external APIs must be captured.
• Over-use of conditional edges. A graph with every edge conditional is a state machine
that cannot be reasoned about. Prefer linear chains with occasional branches.
Interactive figure: langgraph-state. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/14-
agent-engineering/13-langgraph-stateful-graphs
Build It
code/main.py implements a stdlib stateful graph:
AIENGINEERINGFROMSCRATCH.COM 296

STATEFUL GRAPH ORCHESTRATION — DURABLE EXECUTION AND CHECKPOINTS
• State — a typed dict with messages, step, route, output, human_approval.
• Node — callable taking state and returning an update dict.
• StateGraph — nodes + edges + conditional edges + run + resume.
• SQLiteCheckpointer (in-memory fake) — serializes state after every node; load(session_id)
restores.
• A demo graph: classify -> branch(refund / bug / sales) -> human gate -> send.
Run it:
python3 code/main.py
The trace shows the first run failing at the human gate, persistence, then resume producing
the final output.
Use It
• LangGraph — the reference, production-ready. Use create_react_agent, cre-
ate_supervisor, or build your own graph.
• AutoGen v0.4 (Lesson 14) — actor model alternative for high-concurrency scenarios.
• Claude Agent SDK (Lesson 17) — managed harness with built-in session store.
• Custom — when you need exact control over state shape or checkpointer backend.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/13-langgraph-stateful-
graphs
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/13-langgraph-stateful-
graphs/code
1. Add a conditional edge from classify to end when classification confidence is below a
threshold. Resume the run after a human sets route manually.
2. Swap the SQLite-like fake for a real SQLite checkpointer. Measure per-step serialization
overhead.
3. Implement parallel edges: two nodes run concurrently, merge by a custom reducer. What
does immutable state buy here?
4. Read langgraph-supervisor reference. Port the toy to create_supervisor. Compare the
trace shapes.
5. Add streaming: each node yields partial state while it runs. Print the deltas as they
arrive.
Key Terms
Term What people say What it actually means
State “Agent as state machine” Typed state + nodes + edges + reducers
graph
Checkpointer “Persistence backend” Serializes state after every node; enables
resume
AIENGINEERINGFROMSCRATCH.COM 297

STATEFUL GRAPH ORCHESTRATION — DURABLE EXECUTION AND CHECKPOINTS
Term What people say What it actually means
Reducer “State merger” Function that combines current state with a
node’s update
Conditional “Branch” Edge chosen by a function of state
edge
Subgraph “Nested graph” A graph used as a node inside another graph
Durable “Resume from failure” Restart at the last successful node with exact
execution state
Supervisor “Router LLM” Central dispatcher for specialist subagents
Swarm “P2P agents” Agents hand off via shared tools; no central
router
Further Reading
• LangGraph overview — the reference docs
• langgraph-supervisor reference — supervisor pattern API
• AutoGen v0.4, Microsoft Research — actor-model alternative
• Claude Agent SDK overview — session store and subagents
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/14-agent-engineering/13-langgraph-stateful-graphs
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/14-agent-engineering/13-langgraph-stateful-graphs/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/14-agent-engineering/13-langgraph-stateful-graphs
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 298