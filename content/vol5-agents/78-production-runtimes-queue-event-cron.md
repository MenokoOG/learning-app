---
title: "Production Runtimes: Queue, Event, Cron"
volume: "vol5-agents"
part: "Part III — Agent Engineering"
chapter_number: 78
source_pages: "368-371"
---

# Production Runtimes: Queue, Event, Cron

Production Runtimes: Queue, Event,
Cron
Production agents run on six runtime shapes: request-response, streaming, durable
execution, queue-based background, event-driven, and scheduled. Pick the shape
before you pick the framework. Observability is load-bearing at every shape.
Type: Learn Languages: Python (stdlib) Prerequisites: Phase 14 · 13 (LangGraph), Phase
14 · 22 (Voice) Time: ~60 minutes
Learning Objectives
• Name the six production runtime shapes and match each to a framework / product pat-
tern.
• Explain why durable execution (LangGraph) matters for long-horizon tasks.
• Describe the event-driven runtime and when Claude Managed Agents fits.
• Explain the observability-as-load-bearing claim for multi-step agents.
The Problem
Production agents fail in ways a Jupyter notebook doesn’t surface: network timeouts at step
37, user hangs up mid-voice call, cron job dies on machine reboot, background worker runs
out of memory. The runtime shape determines which failures are survivable.
The Concept
Request-response
• Synchronous HTTP. User waits for completion.
• Only viable for short tasks (<30s).
• Stacks: Agno (Python + FastAPI), Mastra (TypeScript + Express/Hono/Fastify/Koa).
• Observability: standard HTTP access logs + OTel spans.
Streaming
• SSE or WebSocket for progressive output.
• LiveKit extends this to WebRTC for voice/video (Lesson 22).
• Stacks: any framework with streaming support + a frontend that handles SSE/WS.
• Observability: per-chunk timing, first-token latency, tail latency.
Durable execution
• State checkpointed after every step; auto-resumes on failure.
• AutoGen v0.4 actor model isolates failures to one agent (Lesson 14).
AIENGINEERINGFROMSCRATCH.COM 362

PRODUCTION RUNTIMES: QUEUE, EVENT, CRON
• LangGraph’s core differentiator (Lesson 13).
• Essential when step count is unknown and recovery cost is high.
Queue-based / background
• Job enters a queue, workers pick up, results flow back via webhooks or pub/sub.
• Essential for long-horizon agents (dozens-to-hundreds of steps per task, per Anthropic’s
computer use announcement).
• Stacks: Celery (Python), BullMQ (Node), SQS + Lambda (AWS), custom.
• Observability: queue depth, per-job latency distribution, DLQ size.
Event-driven
• Agents subscribe to triggers: new email, PR opened, cron fire.
• Claude Managed Agents covers this out of the box (Lesson 17).
• CrewAI Flows (Lesson 15) structures event-driven deterministic workflows.
• Observability: trigger source, event-to-start latency, agent latency.
Scheduled
• Cron-shaped agents that run periodically.
• Combine with durable execution so a failing nightly run resumes next tick.
• Stacks: Kubernetes CronJob + a durable framework; hosted (Render cron, Vercel cron).
2026 deployment patterns
• CrewAI Flows for event-driven production.
• Agno stateless FastAPI for Python microservices.
• Mastra server adapters (Express, Hono, Fastify, Koa) for embedding.
• Pipecat Cloud / LiveKit Cloud for managed voice (Lesson 22).
• Claude Managed Agents for hosted long-running async.
Observability is load-bearing
Without OpenTelemetry GenAI spans (Lesson 23) plus a Langfuse/Phoenix/Opik backend (Les-
son 24), you cannot debug a multi-step agent that failed at step 40. This is not optional for
production. It’s the difference between “we debug fast” and “we replay from scratch with
more logging.”
Where production runtimes fail
• Wrong shape choice. Picking request-response for a 5-minute task. Users hang up;
workers pile up; retries compound.
• No DLQ. Queue workers without dead-letter. Failed jobs vanish.
• Opaque background work. Background agent runs without trace export. Failures are
invisible until the user reports them.
• Skipping durable state. Any run > 30 seconds where you can’t afford to restart needs
durable execution.
Interactive figure: wb-runtime-shapes. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/14-agent-engineering/29-production-runtimes
AIENGINEERINGFROMSCRATCH.COM 363

PRODUCTION RUNTIMES: QUEUE, EVENT, CRON
Build It
code/main.py is a stdlib multi-shape demo:
• Request-response endpoint (plain function).
• Streaming handler (generator).
• Queue-based worker with DLQ.
• Event trigger registry.
• Cron-shaped scheduler.
Run it:
python3 code/main.py
Output: five traces showing each shape’s behavior on the same task. Same agent logic, dif-
ferent outer shells. Durable execution (the sixth shape) is intentionally covered in Lesson 13
with LangGraph checkpointing.
Use It
• Request-response for chat-style UX.
• Streaming for progressive responses.
• Durable for long-horizon tasks.
• Queue for batch / async / long-running.
• Event for agent reactivity.
• Cron for housekeeping (memory consolidation, evals, cost reports).
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/29-production-runtimes
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/14-agent-engineering/29-production-runtimes/code
1. Port your Lesson 01 ReAct loop to all six shapes in your stack. Which shape fits which
product surface?
2. Add a DLQ to the queue-based demo. Simulate 10% job failure; surface DLQ size.
3. Write a cron-triggered eval agent that runs nightly against your top 20 traces from the
day.
4. Implement streaming with backpressure: if the client is slow, pause the agent. How does
this interact with a turn budget?
5. Read Claude Managed Agents docs. When would you move a self-hosted long-horizon
agent to managed?
Key Terms
Term What people say What it actually means
Request- “Synchronous” User waits; short tasks only
response
AIENGINEERINGFROMSCRATCH.COM 364

PRODUCTION RUNTIMES: QUEUE, EVENT, CRON
Term What people say What it actually means
Streaming “SSE / WS” Progressive output; better UX; latency
observable per chunk
Durable “Resume from failure” Checkpointed state; restart at last step
execution
Queue- “Background jobs” Producer / worker pool / DLQ
based
Event- “Trigger-based” Agent reacts to external events
driven
DLQ “Dead-letter queue” Parking lot for failed jobs
Claude “Hosted harness” Anthropic-hosted long-running async with
Managed caching + compaction
Agents
Further Reading
• LangGraph overview — durable execution details
• Claude Managed Agents overview — hosted long-running async
• Anthropic, Introducing computer use — “dozens-to-hundreds of steps per task”
• AutoGen v0.4 (Microsoft Research) — actor-model fault isolation
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/14-agent-engineering/29-production-runtimes
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/14-agent-engineering/29-production-runtimes/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/14-agent-engineering/29-production-runtimes
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 365