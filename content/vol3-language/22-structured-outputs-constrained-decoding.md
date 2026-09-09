---
title: "Structured Outputs & Constrained Decoding"
volume: "vol3-language"
part: "Part I — NLP — Foundations to Advanced"
chapter_number: 22
source_pages: "122-127"
---

# Structured Outputs & Constrained Decoding

Structured Outputs & Constrained De-
coding
Ask an LLM for JSON. Get JSON most of the time. In production, “most” is the
problem. Constrained decoding turns “most” into “always” by editing the logits
before sampling.
Type: Build Languages: Python Prerequisites: Phase 5 · 17 (Chatbots), Phase 5 · 19 (Sub-
word Tokenization) Time: ~60 minutes
The Problem
A classifier prompts an LLM: “Return one of {positive, negative, neutral}.” The model returns
“The sentiment is positive — this review is overwhelmingly favorable because the customer
explicitly states that they …”. Your parser crashes. Your classifier’s F1 is 0.0.
Free-form generation is not a contract. It is a suggestion. A production system needs a
contract.
Three layers exist in 2026.
1. Prompting. Ask nicely. “Return only the JSON object.” Works ~80% on frontier models,
less on smaller ones.
2. Native structured output APIs. OpenAI response_format, Anthropic tool use, Gemini
JSON mode. Reliable on supported schemas. Vendor-locked.
3. Constrained decoding. Modify the logits at every generation step so the model cannot
emit invalid tokens. 100% valid by construction. Works on any local model.
This lesson builds intuition for all three and names when to reach for which.
The Concept
How constrained decoding works. At each generation step, the LLM produces a logit
vector over the full vocabulary (~100k tokens). A logit processor sits between the model
and the sampler. It computes which tokens are valid given the current position in the target
grammar — JSON Schema, regex, context-free grammar — and sets the logits of all invalid
tokens to negative infinity. The softmax over the remaining logits puts probability mass only
on valid continuations.
Implementations in 2026:
• Outlines. Compiles JSON Schema or regex into a finite-state machine. Every token gets
an O(1) valid-next-token lookup. FSM-based, so recursive schemas need flattening.
• XGrammar / llguidance. Context-free grammar engines. Handle recursive JSON
Schema. Near-zero decoding overhead. OpenAI credited llguidance in their 2025
structured output implementation.
• vLLM guided decoding. Built-in guided_json, guided_regex, guided_choice,
guided_grammar via Outlines, XGrammar, or lm-format-enforcer backends.
AIENGINEERINGFROMSCRATCH.COM 119

STRUCTURED OUTPUTS & CONSTRAINED DECODING
constrained decoding — mask invalid tokens before sampling
LLM raw logits (vocab) FSM state masked logits
next-token "(" : 2.1 at pos 0: "(" : -inf
logits "0" : 1.8 \d{3}-\d{3}-\d{4} "0" : 1.8
"1" : 1.6 valid: {0-9} "1" : 1.6
"2" : 1.4 "2" : 1.4
"a" : 0.9 "a" : -inf
"b" : 0.7 "b" : -inf
"-" : -0.1 logit processor "-" : -inf
" " : -0.3 logit[t] = -inf " " : -inf
... if t not in valid ...
100k tokens keeps 10 of 100,000 sample → "5"
repeat at every step; FSM advances with each accepted token
invalid continuations are unreachable — 100% valid output by construction
Figure 11: Constrained decoding masking invalid tokens at each step
• Instructor. Pydantic-based wrapper over any LLM. Retries on validation failure. Cross-
provider, but does not modify logits — it relies on retries + structured-output-aware
prompts.
The counterintuitive result
Constrained decoding is often faster than unconstrained generation. Two reasons. First, it
shrinks the next-token search space. Second, clever implementations skip token generation
entirely for forced tokens (scaffolding like {"name": " — every byte is determined).
The pitfall that costs you
Field order matters. Put answer before reasoning, and the model commits to an answer before
it thinks. JSON is valid. Answer is wrong. No validation catches it.
// BAD
{"answer": "yes", "reasoning": "because ..."}
// GOOD
{"reasoning": "... therefore ...", "answer": "yes"}
Schema field order is logic, not formatting.
Interactive figure: constrained-decoder. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding
Build It
Step 1: regex-constrained generation from scratch
See code/main.py for a standalone FSM implementation. The core idea in 30 lines:
AIENGINEERINGFROMSCRATCH.COM 120

STRUCTURED OUTPUTS & CONSTRAINED DECODING
def mask_logits(logits, valid_token_ids):
mask = [float("-inf")] * len(logits)
for tid in valid_token_ids:
mask[tid] = logits[tid]
return mask
def generate_constrained(model, tokenizer, prompt, fsm):
ids = tokenizer.encode(prompt)
state = fsm.initial_state
while not fsm.is_accept(state):
logits = model.next_token_logits(ids)
valid = fsm.valid_tokens(state, tokenizer)
logits = mask_logits(logits, valid)
tok = sample(logits)
ids.append(tok)
state = fsm.transition(state, tok)
return tokenizer.decode(ids)
The FSM tracks what parts of the grammar we have satisfied so far. valid_tokens(state,
tokenizer) computes which vocabulary tokens can advance the FSM without leaving an ac-
cepting path.
Step 2: Outlines for JSON Schema
from pydantic import BaseModel
from typing import Literal
import outlines
class Review(BaseModel):
sentiment: Literal["positive", "negative", "neutral"]
confidence: float
evidence_span: str
model = outlines.models.transformers("meta-llama/Llama-3.2-3B-Instruct")
generator = outlines.generate.json(model, Review)
result = generator("Classify: 'The wait staff was attentive and the food arrived hot.'")
print(result)
# Review(sentiment='positive', confidence=0.93, evidence_span='attentive ... hot')
Zero validation errors. Ever. The FSM makes invalid output unreachable.
Step 3: Instructor for provider-agnostic Pydantic
import instructor
from anthropic import Anthropic
from pydantic import BaseModel, Field
class Invoice(BaseModel):
vendor: str
total_usd: float = Field(ge=0)
AIENGINEERINGFROMSCRATCH.COM 121

STRUCTURED OUTPUTS & CONSTRAINED DECODING
line_items: list[str]
client = instructor.from_anthropic(Anthropic())
invoice = client.messages.create(
model="claude-opus-4-7",
max_tokens=1024,
response_model=Invoice,
messages=[{"role": "user", "content": "Extract from: 'Acme Corp $420. Widget, Gizmo.'"}],
)
Different mechanism. Instructor does not touch logits. It formats the schema into the prompt,
parses the output, and retries on validation failure (default 3 times). Works with any provider.
Retries add latency and cost. Cross-provider portability is the selling point.
Step 4: native vendor APIs
from openai import OpenAI
client = OpenAI()
response = client.responses.create(
model="gpt-5",
input=[{"role": "user", "content": "Classify: 'The food was cold.'"}],
text={"format": {"type": "json_schema", "name": "sentiment",
"schema": {"type": "object", "required": ["sentiment"],
"properties": {"sentiment": {"type": "string",
"enum": ["positive", "negative", "neutral"]}}}}},
)
print(response.output_parsed)
Server-side constrained decoding. Reliability parity with Outlines for supported schemas. No
local model management. Locks you to the vendor.
Pitfalls
• Recursive schemas. Outlines flattens recursion to a fixed depth. Tree-structured out-
puts (nested comments, AST) need XGrammar or llguidance (CFG-based).
• Huge enums. 10,000-option enum compiles slowly or times out. Switch to a retriever:
predict top-k candidates first, constrain to those.
• Grammar too strict. Force date: "YYYY-MM-DD" regex and the model cannot output
"unknown" for missing dates. Model compensates by inventing a date. Allow null or a
sentinel.
• Premature commitment. See field-order pitfall above. Always put reasoning first.
• Vendor JSON mode without schema. Pure JSON mode only guarantees valid JSON,
not valid for your use case. Always provide a full schema.
Use It
The 2026 stack:
AIENGINEERINGFROMSCRATCH.COM 122

STRUCTURED OUTPUTS & CONSTRAINED DECODING
Situation Pick
OpenAI/Anthropic/Google model, simple schema Native vendor structured
output
Any provider, Pydantic workflow, can tolerate retries Instructor
Local model, need 100% validity, flat schema Outlines (FSM)
Local model, recursive schema XGrammar or llguidance
Self-hosted inference server vLLM guided decoding
Batch processing with retries acceptable Instructor + cheapest model
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/05-nlp-foundations-to-advanced/20-structured-
outputs-constrained-decoding
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/05-nlp-foundations-to-advanced/20-structured-
outputs-constrained-decoding/code
1. Easy. Prompt a small open-weights model (e.g., Llama-3.2-3B) without constrained de-
coding for Review(sentiment, confidence, evidence_span). Measure the fraction that
parse as valid JSON on 100 reviews.
2. Medium. Same corpus with Outlines JSON mode. Compare compliance rate, latency,
and semantic accuracy.
3. Hard. Implement a regex-constrained decoder from scratch for phone numbers (\d{3}-
\d{3}-\d{4}). Verify 0 invalid outputs on 1000 samples.
Key Terms
Term What people say What it actually means
Constrained Force valid output Mask invalid-token logits at every
decoding generation step.
Logit The thing that constrains Function: (logits, state) ->
processor masked_logits.
FSM Finite-state machine Compiled grammar representation; O(1)
valid-next-token lookup.
CFG Context-free grammar Grammar that handles recursion; slower
but more expressive than FSM.
Schema Does it matter? Yes — first field commits; always put
field order reasoning before answer.
Guided vLLM’s name for it Same concept, integrated into the
decoding inference server.
JSON OpenAI’s early version Guarantees JSON syntax; does NOT
mode guarantee schema match.
AIENGINEERINGFROMSCRATCH.COM 123

STRUCTURED OUTPUTS & CONSTRAINED DECODING
Further Reading
• Willard, Louf (2023). Efficient Guided Generation for LLMs — the Outlines paper.
• XGrammar paper (2024) — fast CFG-based constrained decoding.
• vLLM — Structured Outputs — inference server integration.
• OpenAI — Structured Outputs guide — API reference + gotchas.
• Instructor library — Pydantic + retries across providers.
• JSONSchemaBench (2025) — benchmarking 6 constrained decoding frameworks.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com
/lesson.html?path=phases/05-nlp-foundations-to-advanced/20-structured-outputs-
constrained-decoding
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratch/
tree/main/phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-
decoding/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-
decoding
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 124