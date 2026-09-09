---
title: "Production Agent Runtimes — Fast Instantiation and Typed Workflows"
volume: "vol5-agents"
part: "Part III — Agent Engineering"
chapter_number: 67
source_pages: "324-327"
---

# Production Agent Runtimes — Fast Instantiation and Typed Workflows

Production Agent Runtimes — Fast In-
stantiation and Typed Workflows
A production agent runtime optimizes what prototyping frameworks ignore: instan-
tiation cost, typed workflow surfaces, and a serving-ready backend. The 2026 pair-
ing: Agno (Python) aims at microsecond agent instantiation and stateless FastAPI
backends. Mastra ships agents, tools, workflows, unified model routing, and com-
posite storage on the Vercel AI SDK substrate.
Type: Learn Languages: Python, TypeScript Prerequisites: Phase 14 · 01 (Agent Loop),
Phase 14 · 13 (LangGraph) Time: ~45 minutes
Learning Objectives
• Identify Agno’s performance targets and when they matter.
• Name Mastra’s three primitives — Agents, Tools, Workflows — and the supported server
adapters.
• Explain why a stateless session-scoped FastAPI backend is the recommended Agno pro-
duction path.
• Pick Agno vs Mastra for a given stack (Python-first vs TypeScript-first).
The Problem
LangGraph, AutoGen, CrewAI are framework-heavy. Teams that want “just the agent loop,
fast, in my runtime” reach for Agno (Python) or Mastra (TypeScript). Both trade some of the
framework-owned primitives for raw speed and a tighter fit to the surrounding stack.
The Concept
Agno
• Python runtime, formerly Phi-data.
• “No graphs, chains, or convoluted patterns — just pure python.”
• Performance targets from their docs: ~2μs agent instantiation, ~3.75 KiB memory per
agent, ~23 model providers.
• Production path: stateless session-scoped FastAPI backend. Each request starts a fresh
agent; session state lives in a DB.
• Native multimodal (text, image, audio, video, file) and agentic RAG.
The speed targets matter when you have thousands of short-lived agents per second (chat
fan-in, evaluation pipelines). They matter less when one agent runs for 10 minutes.
Mastra
• TypeScript, built on Vercel AI SDK.
AIENGINEERINGFROMSCRATCH.COM 318

PRODUCTION AGENT RUNTIMES — FAST INSTANTIATION AND TYPED WORKFLOWS
• Three primitives: Agents, Tools (Zod-typed), Workflows.
• Unified Model Router — 3,300+ models across 94 providers (March 2026).
• Composite storage: memory, workflows, observability to different backends; ClickHouse
recommended for observability at scale.
• Apache 2.0 with ee/ directories under source-available enterprise license.
• Server adapters for Express, Hono, Fastify, Koa; first-class Next.js and Astro integration.
• Ships Mastra Studio (localhost:4111) for debugging.
• 22k+ GitHub stars, 300k+ weekly npm downloads at 1.0 (Jan 2026).
Positioning
Neither is trying to be LangGraph. They compete on:
• Language fit. Agno for Python-first teams; Mastra for TypeScript-first.
• Runtime ergonomics. Agno = near-zero overhead; Mastra = integrated with the Vercel
ecosystem.
• Observability. Both integrate with Langfuse/Phoenix/Opik (Lesson 24) but Mastra Stu-
dio is first-party.
When to pick each
• Agno — Python backend, many short-lived agents, strong perf requirements, FastAPI
shop.
• Mastra — TypeScript backend, Next.js / Vercel deploy, unified multi-provider model
routing, Zod-typed tools.
• LangGraph (Lesson 13) — when durable state and explicit graph reasoning matter more
than raw speed.
• OpenAI / Claude Agent SDK — when you want the provider’s productized shape
(Lessons 16–17).
Where this pattern goes wrong
• Perf-for-perf’s-sake. Picking Agno because “2μs” sounds good when the workload is
one slow agent call per request. Overhead is not the bottleneck.
• Ecosystem lock-in. Mastra’s Vercel-flavored integration is a plus on Vercel, a minus
elsewhere.
• Enterprise license confusion. Mastra’s ee/ directories are source-available, not
Apache 2.0. Read the licenses if you’re planning to fork.
Interactive figure: wb-runtime-spawn. This one moves. Watch it animate and drag its con-
trols in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/14-
agent-engineering/18-agno-and-mastra-runtimes
Build It
This lesson is primarily comparative — no single code artifact would do both frameworks
justice. See code/main.py for a side-by-side toy: a minimal “run an agent, stream the output,
persist session” flow implemented twice (once Agno-shaped, once Mastra-shaped).
Run it:
python3 code/main.py
Two structurally different but functionally equivalent traces.
AIENGINEERINGFROMSCRATCH.COM 319

PRODUCTION AGENT RUNTIMES — FAST INSTANTIATION AND TYPED WORKFLOWS
Use It
• Agno — Python backend that needs speed and FastAPI shape.
• Mastra — TypeScript backend with many providers and workflow primitives.
• Both ship first-party observability hooks. Both integrate with Langfuse.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/18-agno-and-mastra-
runtimes
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/18-agno-and-mastra-
runtimes/code
1. Read Agno’s docs. Port the stdlib ReAct loop (Lesson 01) to Agno. What disappeared?
What stayed?
2. Read Mastra’s docs. Port the same loop to Mastra. What changed in tool typing (Zod vs
nothing)?
3. Benchmark: measure agent instantiation latency on your stack. Does Agno’s 2μs matter
to your workload?
4. Design a migration: if you’ve been running CrewAI in Python, what breaks if you move
to Agno?
5. Read Mastra’s ee/ license terms. What restrictions would affect an open-source fork?
Key Terms
Term What people say What it actually means
Agno “Fast Python agents” Stateless session-scoped agent runtime
Mastra “TypeScript agents on Vercel Agents + Tools + Workflows + Model Router
AI SDK”
Unified “Multi-provider access” Single client for 3,300+ models across 94
Model providers
Router
Composite “Multiple backends” Memory/workflows/observability each to a
storage different store
Mastra “Local debugger” localhost:4111 UI for introspecting agents
Studio
Source- “Not OSS” License permits source reading but restricts
available commercial use
Further Reading
• Agno Agent Framework docs — performance targets, FastAPI integration
• Mastra docs — primitives, server adapters, Model Router
• LangGraph overview — the stateful-graph alternative
• Comet Opik — observability comparisons cited by Mastra integrations
AIENGINEERINGFROMSCRATCH.COM 320

PRODUCTION AGENT RUNTIMES — FAST INSTANTIATION AND TYPED WORKFLOWS
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/14-agent-engineering/18-agno-and-mastra-runtimes
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/14-agent-engineering/18-agno-and-mastra-runtimes/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/14-agent-engineering/18-agno-and-mastra-runtimes
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 321