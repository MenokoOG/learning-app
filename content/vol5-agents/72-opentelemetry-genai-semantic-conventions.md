---
title: "OpenTelemetry GenAI Semantic Conventions"
volume: "vol5-agents"
part: "Part III — Agent Engineering"
chapter_number: 72
source_pages: "344-347"
---

# OpenTelemetry GenAI Semantic Conventions

OpenTelemetry GenAI Semantic Conven-
tions
OpenTelemetry’s GenAI SIG (launched April 2024) defines the standard schema
for agent telemetry. Span names, attributes, and content-capture rules converge
across vendors so agent traces mean the same thing in Datadog, Grafana, Jaeger,
and Honeycomb.
Type: Learn + Build Languages: Python (stdlib) Prerequisites: Phase 14 · 13 (LangGraph),
Phase 14 · 24 (Observability Platforms) Time: ~60 minutes
Learning Objectives
• Name the GenAI span categories: model/client, agent, tool.
• Distinguish invoke_agent CLIENT vs INTERNAL spans and when each applies.
• List the top-level GenAI attributes: provider name, request model, data-source ID.
• Explain the content-capture contract: opt-in, OTEL_SEMCONV_STABILITY_OPT_IN, external-
reference recommendation.
The Problem
Every vendor invents their own span names. Ops teams end up building per-framework dash-
boards. OpenTelemetry’s GenAI SIG fixes this by defining one standard the whole ecosystem
targets.
The Concept
Span categories
1. Model / client spans. Cover raw LLM calls. Emitted by provider SDKs (Anthropic,
OpenAI, Bedrock) and framework model adapters.
2. Agent spans. create_agent (when the agent is constructed) and invoke_agent (when it
runs).
3. Tool spans. One per tool invocation; connected to the agent span by parent-child rela-
tion.
Agent span naming
• Span name: invoke_agent {gen_ai.agent.name} if named; fallback to invoke_agent.
• Span kind:
– CLIENT — for remote agent services (OpenAI Assistants API, Bedrock Agents).
– INTERNAL — for in-process agent frameworks (LangChain, CrewAI, local ReAct).
AIENGINEERINGFROMSCRATCH.COM 338

OPENTELEMETRY GENAI SEMANTIC CONVENTIONS
Key attributes
• gen_ai.provider.name — anthropic, openai, aws.bedrock, google.vertex.
• gen_ai.request.model — the model ID.
• gen_ai.response.model — the resolved model (may differ from request due to routing).
• gen_ai.agent.name — agent identifier.
• gen_ai.operation.name — chat, completion, invoke_agent, tool_call.
• gen_ai.data_source.id — for RAG: which corpus or store was consulted.
Technology-specific conventions exist for Anthropic, Azure AI Inference, AWS Bedrock, Ope-
nAI.
Content capture
The default rule: instrumentations SHOULD NOT capture inputs/outputs by default. Capture
is opt-in via:
• gen_ai.system_instructions
• gen_ai.input.messages
• gen_ai.output.messages
Recommended production pattern: store content externally (S3, your log store), record ref-
erences on spans (pointer IDs, not prose). This is the Lesson 27 content-poisoning defense
wired into observability.
Stability
Most conventions are experimental as of March 2026. Opt in to the stable preview with:
OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental
Datadog v1.37+ maps GenAI attributes natively into its LLM Observability schema. Other
backends (Grafana, Honeycomb, Jaeger) support the raw attributes.
Where this pattern goes wrong
• Capturing full prompts in spans. PII, secrets, customer data in traces that ops can
read. Store externally.
• No gen_ai.provider.name. Multi-provider dashboards break when attribution is miss-
ing.
• Spans without parent links. Orphaned tool spans. Always propagate context.
• Not setting stability opt-in. Your attributes may get renamed on backend upgrade.
Interactive figure: ae-genai-span-tree. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/14-agent-engineering/23-otel-genai-conventions
Build It
code/main.py implements a stdlib span emitter matching GenAI conventions:
• Span with GenAI attribute schema.
• Tracer with start_span, nested contexts.
• A scripted agent run that emits: create_agent, invoke_agent (INTERNAL), per-tool
spans, chat spans for LLM calls.
• A content-capture mode that stores prompts externally and records IDs on spans.
AIENGINEERINGFROMSCRATCH.COM 339

OPENTELEMETRY GENAI SEMANTIC CONVENTIONS
Run it:
python3 code/main.py
Output: a span tree with all required GenAI attributes, and an “external store” showing the
opt-in content references.
Use It
• Datadog LLM Observability (v1.37+) maps attributes natively.
• Langfuse / Phoenix / Opik (Lesson 24) — auto-instrument the ecosystem.
• Jaeger / Honeycomb / Grafana Tempo — raw OTel traces; build dashboards from
GenAI attributes.
• Self-hosted — run the OTel Collector with a GenAI processor.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohit
g00/ai-engineering-from-scratch/tree/main/phases/14-agent-engineering/23-otel-genai-
conventions
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engine
ering-from-scratch/tree/main/phases/14-agent-engineering/23-otel-genai-conventions/code
1. Instrument your Lesson 01 ReAct loop with invoke_agent (INTERNAL) + per-tool spans.
Send to a Jaeger instance.
2. Add content capture in “references only” mode: prompts to SQLite, span attributes carry
only row IDs.
3. Read the spec for gen_ai.data_source.id. Wire it into your Lesson 09 Mem0 search.
4. Set OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental and verify your at-
tributes don’t get renamed by the collector.
5. Build a dashboard: “which tool errors correlate with which models” from GenAI at-
tributes alone.
Key Terms
Term What people say What it actually means
GenAI SIG “OpenTelemetry GenAI OTel working group defining the schema
group”
invoke_agent “Agent span” Name of the span representing an agent run
CLIENT “Remote call” Span for a call to a remote agent service
span
INTERNAL “In-process” Span for an in-process agent run
span
gen_ai.provide“rP.nroavmideer” anthropic / openai / aws.bedrock /
google.vertex
gen_ai.data_so“uRrAcGe.isdource” Which corpus/store a retrieval hit
Content “Prompt logging” Opt-in capture of messages; store externally
capture in prod
AIENGINEERINGFROMSCRATCH.COM 340

OPENTELEMETRY GENAI SEMANTIC CONVENTIONS
Term What people say What it actually means
Stability “Preview mode” Env var to pin experimental conventions
opt-in
Further Reading
• OpenTelemetry GenAI semantic conventions — the spec
• OpenAI Agents SDK — GenAI spans by default
• AutoGen v0.4 (Microsoft Research) — OTel spans built in
• Claude Agent SDK — W3C trace context propagation
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/14-agent-engineering/23-otel-genai-conventions
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/14-agent-engineering/23-otel-genai-conventions/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/14-agent-engineering/23-otel-genai-conventions
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 341