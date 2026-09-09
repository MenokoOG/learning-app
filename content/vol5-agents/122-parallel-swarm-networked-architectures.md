---
title: "Parallel / Swarm / Networked Architectures"
volume: "vol5-agents"
part: "Part V — Multi-Agent & Swarms"
chapter_number: 122
source_pages: "590-593"
---

# Parallel / Swarm / Networked Architectures

Parallel / Swarm / Networked Architec-
tures
Contrast with supervisor: no central decider. Agents read a shared event bus, pick
up work asynchronously, write results back. LangGraph explicitly supports “Swarm
Architecture” for decentralized, dynamic environments. Matrix (arXiv:2511.21686)
represents both control and data flow as serialized messages passed through dis-
tributed queues to eliminate the orchestrator bottleneck. The tradeoff is explicit:
determinism and traceability for scalability. Swarm fits tasks with many indepen-
dent sub-problems; it does not fit tasks that need a single coherent plan.
Type: Learn + Build Languages: Python (stdlib, threading, queue) Prerequisites: Phase
16 · 05 (Supervisor Pattern), Phase 16 · 04 (Primitive Model) Time: ~75 minutes
Problem
Supervisor scales to a few workers. What about hundreds? The supervisor itself becomes the
bottleneck: every decision about who does what funnels through one agent. One slow plan
step stalls the whole system.
Swarm architectures flip the design. Instead of a central planner dispatching work, workers
pick work off a shared queue. The “coordination” is baked into the event bus semantics. No
orchestrator; the system scales until the queue does.
Concept
The shape
┌──── shared queue ────┐
│ │
┌────────┼────────┐ ◄──────┬───┘
▼ ▼ ▼ │
Worker Worker Worker Worker
A B C D
│ │ │ │
└────────┴────────┴─────────┘
│
▼
results pool
No orchestrator. Each worker repeats: pull a task, process, write result (and optionally en-
queue follow-ups).
AIENGINEERINGFROMSCRATCH.COM 584

PARALLEL / SWARM / NETWORKED ARCHITECTURES
When swarm fits
• Many independent tasks. Scraping, transforming, classifying. Tasks do not depend
on each other.
• Variable-duration work. If some tasks take 100ms and others take 10s, a swarm bal-
ances load automatically — fast workers pull next jobs. A supervisor has to anticipate
duration.
• Throughput over determinism. You care about total completion time, not strict order-
ing.
When swarm fails
• Ordered workflows. If step 3 needs step 2’s output, a swarm risks step 3 firing before
step 2 is done.
• Global-plan tasks. Complex research questions benefit from a planner. A swarm of
researchers produces independent facts, not a coherent report.
• Debugging. With no central log and asynchronous work, reproducing a bug is expen-
sive.
Matrix (arXiv:2511.21686)
Matrix is the 2025 paper that takes swarm to its natural conclusion: both control flow and data
flow are serialized messages on distributed queues. No central coordinator. Fault tolerance
comes from message durability. Scalability is the message broker’s problem, not the system’s.
Contribution: a programming model where multi-agent coordination is “what message topic
does this agent subscribe to?” rather than “which agent does the supervisor pick next?” This
makes the system look like a pub/sub event mesh.
Swarm in graph frameworks
LangGraph 2025 docs explicitly describe “Swarm Architecture” as one of the multi-agent
patterns: agents are nodes, but edges form a directed graph with cycles and any node can be
activated from the pool. A worker picks from available work by condition, not by supervisor
assignment.
Failure mode: starvation and hot-spotting
If all workers pull the fastest-available task, long-running tasks never get picked until they
are the only ones left. Classic queue starvation.
Mitigations: - Priority queues with explicit aging (increase priority with wait time). - Worker
specialization: some workers only take “long” tasks. - Back-pressure: limit how many fast
tasks enter the queue.
The content-based routing link
Swarm pairs naturally with content-based routing (Lesson 22). Instead of a generic queue,
have one queue per message type. Specialist workers subscribe only to their type. This is the
basis for message-bus architectures that scale to thousands of agents.
Interactive figure: sw-work-stealing. This one moves. Watch it animate and drag its con-
trols in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/16-
multi-agent-and-swarms/09-parallel-swarm-networks
AIENGINEERINGFROMSCRATCH.COM 585

PARALLEL / SWARM / NETWORKED ARCHITECTURES
Build It
code/main.py implements a swarm of 4 worker threads pulling from a shared queue.Queue.
Tasks have variable durations (some fast, some slow). The demo contrasts:
• Sequential baseline: one worker processes all tasks serially.
• Fixed assignment: each task pre-assigned to a specific worker (supervisor-style).
• Swarm: workers pull from a shared queue.
Swarm balances load automatically; fixed assignment leaves fast workers idle when their
assigned task is slow.
Run:
python3 code/main.py
Output shows per-worker task counts (swarm distributes unevenly but optimally) and wall-
clock times.
Use It
outputs/skill-swarm-fit.md evaluates whether a task should use swarm vs supervisor. In-
puts: task independence, duration variance, ordering requirements, debuggability needs.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/16-multi-agent-and-swarms/09-parallel-swarm-
networks
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/16-multi-agent-and-swarms/09-parallel-swarm-
networks/code
1. Run code/main.py. How much faster is swarm than sequential on the variable-duration
workload? How much faster than fixed assignment?
2. Add a priority queue variant (use queue.PriorityQueue). Assign priority by task “impor-
tance” field. Observe whether low-priority tasks ever starve under continuous load.
3. Implement a hot-spot detector: log when any worker processes 3× more tasks than the
slowest worker. What does that indicate about task-duration distribution?
4. Read the Matrix paper (arXiv:2511.21686) abstract and Section 3. Identify one specific
tradeoff Matrix accepts (scalability gain) and one it gives up (traceability, determinism).
5. Convert the swarm demo to use a queue.Queue of (task_type, payload) tuples, with work-
ers subscribing only to specific types. What routing rules make sense when tasks are
heterogeneous?
Key Terms
Term What people say What it actually means
Swarm ar- “Decentralized agents” Workers pull from shared queue; no central
chitecture orchestrator.
AIENGINEERINGFROMSCRATCH.COM 586

PARALLEL / SWARM / NETWORKED ARCHITECTURES
Term What people say What it actually means
Event bus “Agents subscribe to topics” Message broker that routes tasks to workers
by type or content.
Starvation “Task never runs” Low-priority task never gets picked because
higher-priority work arrives continuously.
Hot- “One worker drowns” Load imbalance where one worker gets most
spotting tasks.
Back- “Slow down the producer” Mechanism that signals upstream to stop
pressure producing when the queue fills up.
Idempotent “Safe to re-run” A task processed twice produces the same
worker result. Required because workers may crash
mid-run.
Durable “Survives crashes” Queue backed by disk or replicated storage;
queue tasks are not lost when a worker crashes.
Matrix “Full message-passing Both data and control flow are serialized
framework swarm” messages on distributed queues.
Further Reading
• LangGraph workflows and agents — Swarm Architecture — explicit swarm support
• Matrix — A Decentralized Framework for Multi-Agent Systems — full message-passing
swarm
• Anthropic engineering — why supervisor not swarm in Research — why a specific pro-
duction system explicitly chose supervisor over swarm
• AutoGen v0.4 actor-model docs — the event-driven actor rewrite, closer to swarm than
v0.2’s GroupChat
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/16-multi-agent-and-swarms/09-parallel-swarm-networks
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/16-multi-agent-and-swarms/09-parallel-swarm-networks/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 587