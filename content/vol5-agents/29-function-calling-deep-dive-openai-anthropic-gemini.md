---
title: "Function Calling Deep Dive — OpenAI, Anthropic, Gemini"
volume: "vol5-agents"
part: "Part II — Tools & Protocols"
chapter_number: 29
source_pages: "138-142"
---

# Function Calling Deep Dive — OpenAI, Anthropic, Gemini

Function Calling Deep Dive — OpenAI,
Anthropic, Gemini
The three frontier providers converged on the same tool-call loop in 2024 and then
diverged on everything else. OpenAI uses tools and tool_calls. Anthropic uses
tool_use and tool_result blocks. Gemini uses functionDeclarations and unique-
id correlation. This lesson diffs the three side by side so code that ships on one
provider does not break when you port it.
Type: Build Languages: Python (stdlib, schema translators) Prerequisites: Phase 13 · 01
(the tool interface) Time: ~75 minutes
Learning Objectives
• State the three shape differences between OpenAI, Anthropic, and Gemini function-
calling payloads (declaration, call, result).
• Translate one tool declaration across all three provider formats and predict where strict-
mode constraints will differ.
• Use tool_choice in each provider to force, forbid, or auto-pick tool calls.
• Know the per-provider hard limits (tool count, schema depth, argument length) and the
error signatures each one emits when limits are violated.
The Problem
The shape of a function-calling request differs by provider. Three concrete examples from
2026 production stacks:
OpenAI Chat Completions / Responses API. You pass tools: [{type: "function",
function: {name, description, parameters, strict}}]. The model’s response contains
choices[0].message.tool_calls: [{id, type: "function", function: {name, argu-
ments}}] where arguments is a JSON string you must parse. Strict mode (strict: true)
enforces schema compliance via constrained decoding.
Anthropic Messages API. You pass tools: [{name, description, input_schema}]. The
response comes back as content: [{type: "text"}, {type: "tool_use", id, name, input}].
input is already parsed (an object, not a string). You reply with a new user message containing
a {type: "tool_result", tool_use_id, content} block.
Google Gemini API. You pass tools: [{functionDeclarations: [{name, description,
parameters}]}] (nested under functionDeclarations). The response arrives as candi-
dates[0].content.parts: [{functionCall: {name, args, id}}] where id is unique in
Gemini 3 and up for parallel-call correlation. You reply with {functionResponse: {name, id,
response}}.
Same loop. Different field names, different nesting, different string-vs-object conventions,
different correlation mechanisms. A team that writes a weather agent on OpenAI pays a
two-day port to Anthropic and another day to Gemini just for the plumbing.
AIENGINEERINGFROMSCRATCH.COM 132

FUNCTION CALLING DEEP DIVE — OPENAI, ANTHROPIC, GEMINI
This lesson builds a translator that unifies the three formats into one canonical tool declaration
and routes at the edge. Phase 13 · 17 generalizes the same pattern into an LLM gateway.
The Concept
The common structure
Every provider needs five things:
1. Tool list. Per-tool name, description, and input schema.
2. Tool choice. Force a specific tool, forbid tools, or let the model decide.
3. Call emission. Structured output naming the tool and arguments.
4. Call id. Correlate the response to the right call (matters for parallel).
5. Result injection. A message or block that ties the result back to the call.
Shape diffs, field by field
Aspect OpenAI Anthropic Gemini
Declaration {type: {name, description, {functionDeclarations:
envelope "function", input_schema} [{...}]}
function: {...}}
Schema field parameters input_schema parameters
Response tool_calls[] on content[] of type parts[] of type
container assistant message tool_use functionCall
Arguments type stringified JSON parsed object parsed object
Id format call_... (OpenAI toolu_... (Anthropic) UUID (Gemini 3+)
generates)
Result block role tool, user with tool_result, functionResponse
tool_call_id tool_use_id with matching id
Force-a-tool tool_choice: tool_choice: {type: tool_config:
{type: "tool", name} {func-
"function", tion_calling_config:
function: {name}} {mode: "ANY"}}
Forbid tools tool_choice: tool_choice: {type: mode: "NONE"
"none" "none"}
Strict schema strict: true schema-is-schema (always responseSchema at
enforced) request level
Limits you will actually hit
• OpenAI. 128 tools per request. Schema depth 5. Argument string <= 8192 bytes. Strict
mode requires no $ref, no oneOf/anyOf/allOf with overlap, every property listed in re-
quired.
• Anthropic. 64 tools per request. Schema depth effectively unbounded but practical
limit 10. No strict-mode flag; schema is a contract and the model tends to comply.
• Gemini. 64 functions per request. Schema types are OpenAPI 3.0 subset (slight diver-
gence from JSON Schema 2020-12). Parallel calls unique-id since Gemini 3.
tool_choice behavior
Three modes everyone supports, named differently.
AIENGINEERINGFROMSCRATCH.COM 133

FUNCTION CALLING DEEP DIVE — OPENAI, ANTHROPIC, GEMINI
• Auto. Model picks tool or text. Default.
• Required / Any. Model must call at least one tool.
• None. Model must not call tools.
Plus one mode unique to each provider:
• OpenAI. Force a specific tool by name.
• Anthropic. Force a specific tool by name; disable_parallel_tool_use flag separates
single vs multi.
• Gemini. mode: "VALIDATED" routes every response through a schema validator regard-
less of model intent.
Parallel calls
OpenAI’s parallel_tool_calls: true (default) emits multiple calls in one assistant mes-
sage. You run them all and reply with a batched tool-role message containing one entry
per tool_call_id. Anthropic historically did single-call; disable_parallel_tool_use: false
(default as of Claude 3.5) enables multi. Gemini 2 allowed parallel calls but did not give stable
ids; Gemini 3 adds UUIDs so out-of-order responses correlate cleanly.
Streaming
All three support streamed tool calls. The wire format differs:
• OpenAI. Delta chunks of tool_calls[i].function.arguments arrive incrementally. You
accumulate until finish_reason: "tool_calls".
• Anthropic. Block-start / block-delta / block-stop events. input_json_delta chunks carry
partial arguments.
• Gemini. streamFunctionCallArguments (new in Gemini 3) emits chunks with a func-
tionCallId so multiple parallel calls can interleave.
Phase 13 · 03 goes deep on parallel + streaming reassembly. This lesson focuses on the
declaration and single-call shapes.
Errors and repair
Invalid-argument errors look different too.
• OpenAI (non-strict). Model returns arguments: "{bad json}", your JSON parse fails,
you inject an error message and re-call.
• OpenAI (strict). Validation happens during decoding; invalid JSON is impossible but
refusal can appear.
• Anthropic. input may contain unexpected fields; schema is advisory. Validate server-
side.
• Gemini. OpenAPI 3.0 quirk: enum on object fields silently ignored; validate yourself.
The translator pattern
A canonical tool declaration in your code looks like this (you pick the shape):
Tool(
name="get_weather",
description="Use when ...",
input_schema={"type": "object", "properties": {...}, "required": [...]},
strict=True,
)
AIENGINEERINGFROMSCRATCH.COM 134

FUNCTION CALLING DEEP DIVE — OPENAI, ANTHROPIC, GEMINI
Three tiny functions translate it to the three provider shapes. The harness in code/main.py
does exactly this, then round-trips a fake tool call through each provider’s response shape.
No network required — this lesson teaches the shapes, not the HTTP.
Production teams wrap this translator in AbstractToolset (Pydantic AI), UniversalToolN-
ode (LangGraph), or BaseTool (LlamaIndex). Phase 13 · 17 ships a gateway that exposes an
OpenAI-shaped API in front of any of the three.
Interactive figure: function-call-args. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/13-tools-and-protocols/02-function-calling-deep-dive
Use It
code/main.py defines one canonical Tool dataclass and three translators that emit the OpenAI,
Anthropic, and Gemini declaration JSON. It then parses a hand-crafted provider response of
each shape into the same canonical call object, demonstrating that the semantics are identical
under the skin. Run it and diff the three declarations side by side.
What to look at:
• The three declaration blocks differ only in envelope and field names.
• The three response blocks differ in where the call lives (top-level tool_calls, content[]
block, parts[] entry).
• One canonical_call() function extracts {id, name, args} from all three response
shapes.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/13-tools-and-protocols/02-function-calling-deep-
dive
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/13-tools-and-protocols/02-function-calling-deep-
dive/code
1. Run code/main.py and verify that the three provider declaration JSONs all serialize the
same underlying Tool object. Modify the canonical tool to add an enum parameter and
confirm only the Gemini translator needs to handle the OpenAPI quirk.
2. Add a ListToolsResponse parser for each provider that extracts the tool list a model
returns after a list_tools or discovery call. OpenAI does not have one natively; note
this asymmetry.
3. Implement tool_choice conversion: map a canonical ToolChoice(mode="force",
tool_name="x") into all three provider shapes. Then map mode="any" and mode="none".
Check the lesson’s diff table.
4. Pick one of the three providers and read its function-calling guide end to end. Find one
field in its schema spec that the other two do not support. Candidates: OpenAI strict,
Anthropic disable_parallel_tool_use, Gemini function_calling_config.allowed_function_names.
5. Write a test vector: a tool call whose arguments violate the declared schema. Run it
through each provider’s validator (the stdlib one in Lesson 01 will do as a proxy) and
AIENGINEERINGFROMSCRATCH.COM 135

FUNCTION CALLING DEEP DIVE — OPENAI, ANTHROPIC, GEMINI
record which errors fire. Document which provider you would use in production for
strictness.
Key Terms
Term What people say What it actually means
Function “Tool use” Provider-level API for structured tool-call
calling emission
Tool “Tool spec” Name + description + JSON Schema input
declaration payload
tool_choice “Force / forbid” Auto / required / none / specific-name modes
Strict “Schema enforcement” OpenAI flag that constrains decoding to
mode match schema
tool_use “Anthropic’s call shape” Inline content block with id, name, input
block
functionCall “Gemini’s call shape” A parts[] entry containing name, args, and id
part
Arguments- “Stringified JSON” OpenAI returns args as a JSON string, not an
as-string object
Parallel “Fan-out in one turn” Multiple tool calls in one assistant message
tool calls
Refusal “Model declines” Strict-mode-only refusal block instead of a
call
OpenAPI “Gemini schema quirk” Gemini uses a JSON-Schema-like dialect with
3.0 subset minor differences
Further Reading
• OpenAI — Function calling guide — canonical reference including strict mode and par-
allel calls
• Anthropic — Tool use overview — tool_use and tool_result block semantics
• Google — Gemini function calling — parallel calls, unique ids, and OpenAPI subset
• Vertex AI — Function calling reference — Gemini’s enterprise surface
• OpenAI — Structured outputs — strict-mode schema enforcement details
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/13-tools-and-protocols/02-function-calling-deep-dive
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/13-tools-and-protocols/02-function-calling-deep-dive/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 136