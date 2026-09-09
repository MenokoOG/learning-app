---
title: "Structured Outputs: JSON, Schema Validation, Constrained Decoding"
volume: "vol4-llms"
part: "Part IV — LLM Engineering"
chapter_number: 56
source_pages: "428-439"
---

# Structured Outputs: JSON, Schema Validation, Constrained Decoding

Structured Outputs: JSON, Schema Vali-
dation, Constrained Decoding
Your LLM returns a string. Your application needs JSON. That gap has crashed more
production systems than any model hallucination. Structured output is the bridge
between natural language and typed data. Get it right and your LLM becomes a
reliable API. Get it wrong and you’re parsing free-text with regex at 3am.
Type: Build Languages: Python Prerequisites: Phase 10, Lessons 01-05 (LLMs from
Scratch) Time: ~90 minutes Related: Phase 5 · 20 (Structured Outputs & Constrained
Decoding) covers the decoder-level theory (FSM/CFG logit processors, Outlines, XGrammar).
This lesson focuses on the production SDK surface (OpenAI response_format, Anthropic tool
use, Instructor) — read Phase 5 · 20 first if you want to understand what is happening below
the API.
Learning Objectives
• Implement JSON-mode and schema-constrained outputs using OpenAI and Anthropic
API parameters
• Build a Pydantic validation layer that rejects malformed LLM outputs and retries with
error feedback
• Explain how constrained decoding forces valid JSON at the token level without post-
processing
• Design robust extraction prompts that reliably convert unstructured text into typed data
structures
The Problem
You ask an LLM: “Extract the product name, price, and availability from this text.” It responds:
The product is the Sony WH-1000XM5 headphones, which cost $348.00 and are currently in stock.
That is a perfectly correct answer. It is also completely useless to your application. Your
inventory system needs {"product": "Sony WH-1000XM5", "price": 348.00, "in_stock":
true}. You need a JSON object with specific keys, specific types, and specific value constraints.
You do not need a sentence.
The naive solution: add “Respond in JSON” to your prompt. This works 90% of the time.
The other 10% the model wraps the JSON in markdown code fences, or adds a preamble like
“Here’s the JSON:”, or produces syntactically invalid JSON because it closed a bracket early.
Your JSON parser crashes. Your pipeline breaks. You add try/except and a retry loop. The
retry sometimes produces different data. Now you have a consistency problem on top of a
parsing problem.
This is not a prompt engineering problem. It is a decoding problem. The model generates
tokens left to right. At each position, it picks the most likely next token from a vocabulary of
100K+ options. Most of those options would produce invalid JSON at any given position. If
AIENGINEERINGFROMSCRATCH.COM 424

STRUCTURED OUTPUTS: JSON, SCHEMA VALIDATION, CONSTRAINED DECODING
the model just emitted {"price":, the next token must be a digit, a quote (for string), null,
true, false, or a negative sign. Anything else produces invalid JSON. Without constraints,
the model might pick a perfectly reasonable English word that is catastrophically wrong syn-
tactically.
The Concept
The Structured Output Spectrum
There are four levels of structured output control, each more reliable than the last.
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/11-llm-engineering/03-structured-outputs
Prompt-based (“Respond in valid JSON”): no enforcement. The model usually complies but
sometimes does not. Reliability: ~90%. Failure mode: markdown fences, preamble text,
truncated output, wrong structure.
JSON mode: the API guarantees the output is valid JSON. OpenAI’s response_format: {
type: "json_object" } enables this. The output will parse without errors. But it may not
match your expected schema – extra keys, wrong types, missing fields.
Schema mode: the API takes a JSON Schema and guarantees the output matches it. In
2026 every major provider supports this natively: OpenAI’s response_format: { type:
"json_schema", json_schema: {...} } (also as tool_choice="required"), Anthropic’s tool
use with input_schema, and Gemini’s response_schema + response_mime_type: "applica-
tion/json". The output has the exact keys, types, and constraints you specified.
Constrained decoding: at each token position during generation, the decoder masks out all
tokens that would produce invalid output. If the schema requires a number and the model
is about to emit a letter, that token is set to probability zero. The model can only produce
tokens that lead to valid output. This is what OpenAI’s structured output mode and libraries
like Outlines and Guidance implement under the hood.
JSON Schema: The Contract Language
JSON Schema is how you tell the model (or validation layer) what shape the output must have.
Every major structured output system uses it.
{
"type": "object",
"properties": {
"product": { "type": "string" },
"price": { "type": "number", "minimum": 0 },
"in_stock": { "type": "boolean" },
"categories": {
"type": "array",
"items": { "type": "string" }
}
},
"required": ["product", "price", "in_stock"]
}
This schema says: the output must be an object with a string product, a non-negative number
price, a boolean in_stock, and an optional array of string categories. Any output that does
not match gets rejected.
AIENGINEERINGFROMSCRATCH.COM 425

STRUCTURED OUTPUTS: JSON, SCHEMA VALIDATION, CONSTRAINED DECODING
Schemas handle the hard cases: nested objects, arrays with typed items, enums (constrain a
string to specific values), pattern matching (regex on strings), and combinators (oneOf, anyOf,
allOf for polymorphic outputs).
The Pydantic Pattern
In Python, you do not write JSON Schema by hand. You define a Pydantic model and it gener-
ates the schema for you.
from pydantic import BaseModel
class Product(BaseModel):
product: str
price: float
in_stock: bool
categories: list[str] = []
This produces the same JSON Schema as above. The Instructor library (and OpenAI’s SDK)
accept Pydantic models directly: pass the model class, get back a validated instance. If the
LLM output does not match, Instructor retries automatically.
Function Calling / Tool Use
An alternative interface for the same problem. Instead of asking the model to produce JSON
directly, you define “tools” (functions) with typed parameters. The model outputs a function
call with structured arguments. OpenAI calls this “function calling.” Anthropic calls it “tool
use.” The result is the same: structured data.
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/11-llm-engineering/03-structured-outputs
Tool use is preferred when the model needs to choose which function to call, not just fill in
parameters. If you have 10 different extraction schemas and the model must pick the right
one based on the input, tool use gives you both the schema selection and the structured
output.
Common Failure Modes
Even with schema enforcement, structured outputs can fail in subtle ways.
Hallucinated values: the output matches the schema but contains invented data. The model
produces {"price": 299.99} when the text says $348. Schema validation cannot catch this –
the type is correct, the value is wrong.
Enum confusion: you constrain a field to ["in_stock", "out_of_stock", "preorder"]. The
model outputs "available" – semantically correct, but not in the allowed set. Good con-
strained decoding prevents this. Prompt-based approaches do not.
Nested object depth: deeply nested schemas (4+ levels) produce more errors. Each level
of nesting is another place where the model can lose track of structure.
Array length: the model may produce too many or too few items in an array. Schemas
support minItems and maxItems but not all providers enforce them at the decoding level.
Optional field omission: the model omits fields that are technically optional but semanti-
cally important for your use case. Set them as required in the schema even if the data is
sometimes missing – force the model to produce null explicitly.
AIENGINEERINGFROMSCRATCH.COM 426

STRUCTURED OUTPUTS: JSON, SCHEMA VALIDATION, CONSTRAINED DECODING
Interactive figure: mx-schema-funnel. This one moves. Watch it animate and drag its con-
trols in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/11-
llm-engineering/03-structured-outputs
Build It
Step 1: JSON Schema Validator
Build a validator from scratch that checks whether a Python object matches a JSON Schema.
This is what runs on the output side to verify compliance.
import json
def validate_schema(data, schema):
errors = []
_validate(data, schema, "", errors)
return errors
def _validate(data, schema, path, errors):
schema_type = schema.get("type")
if schema_type == "object":
if not isinstance(data, dict):
errors.append(f"{path}: expected object, got {type(data).__name__}")
return
for key in schema.get("required", []):
if key not in data:
errors.append(f"{path}.{key}: required field missing")
properties = schema.get("properties", {})
for key, value in data.items():
if key in properties:
_validate(value, properties[key], f"{path}.{key}", errors)
elif schema_type == "array":
if not isinstance(data, list):
errors.append(f"{path}: expected array, got {type(data).__name__}")
return
min_items = schema.get("minItems", 0)
max_items = schema.get("maxItems", float("inf"))
if len(data) < min_items:
errors.append(f"{path}: array has {len(data)} items, minimum is {min_items}")
if len(data) > max_items:
errors.append(f"{path}: array has {len(data)} items, maximum is {max_items}")
items_schema = schema.get("items", {})
for i, item in enumerate(data):
_validate(item, items_schema, f"{path}[{i}]", errors)
elif schema_type == "string":
if not isinstance(data, str):
errors.append(f"{path}: expected string, got {type(data).__name__}")
return
enum_values = schema.get("enum")
if enum_values and data not in enum_values:
AIENGINEERINGFROMSCRATCH.COM 427

STRUCTURED OUTPUTS: JSON, SCHEMA VALIDATION, CONSTRAINED DECODING
errors.append(f"{path}: '{data}' not in allowed values {enum_values}")
elif schema_type == "number":
if not isinstance(data, (int, float)):
errors.append(f"{path}: expected number, got {type(data).__name__}")
return
minimum = schema.get("minimum")
maximum = schema.get("maximum")
if minimum is not None and data < minimum:
errors.append(f"{path}: {data} is less than minimum {minimum}")
if maximum is not None and data > maximum:
errors.append(f"{path}: {data} is greater than maximum {maximum}")
elif schema_type == "boolean":
if not isinstance(data, bool):
errors.append(f"{path}: expected boolean, got {type(data).__name__}")
elif schema_type == "integer":
if not isinstance(data, int) or isinstance(data, bool):
errors.append(f"{path}: expected integer, got {type(data).__name__}")
Step 2: Pydantic-Style Model to Schema
Build a minimal class-to-schema converter. Define a Python class and generate its JSON
Schema automatically.
class SchemaField:
def __init__(self, field_type, required=True, default=None, enum=None, minimum=None, maximum=None):
self.field_type = field_type
self.required = required
self.default = default
self.enum = enum
self.minimum = minimum
self.maximum = maximum
def python_type_to_schema(field):
type_map = {
str: "string",
int: "integer",
float: "number",
bool: "boolean",
}
schema = {}
if field.field_type in type_map:
schema["type"] = type_map[field.field_type]
elif field.field_type == list:
schema["type"] = "array"
schema["items"] = {"type": "string"}
elif isinstance(field.field_type, dict):
schema = field.field_type
if field.enum:
AIENGINEERINGFROMSCRATCH.COM 428

STRUCTURED OUTPUTS: JSON, SCHEMA VALIDATION, CONSTRAINED DECODING
schema["enum"] = field.enum
if field.minimum is not None:
schema["minimum"] = field.minimum
if field.maximum is not None:
schema["maximum"] = field.maximum
return schema
def model_to_schema(name, fields):
properties = {}
required = []
for field_name, field in fields.items():
properties[field_name] = python_type_to_schema(field)
if field.required:
required.append(field_name)
return {
"type": "object",
"properties": properties,
"required": required,
}
Step 3: Constrained Token Filter
Simulate constrained decoding. Given a partial JSON string and a schema, determine which
token categories are valid at the current position.
def next_valid_tokens(partial_json, schema):
stripped = partial_json.strip()
if not stripped:
return ["{"]
try:
json.loads(stripped)
return ["<EOS>"]
except json.JSONDecodeError:
pass
last_char = stripped[-1] if stripped else ""
if last_char == "{":
return ['"', "}"]
elif last_char == '"':
if stripped.endswith('":'):
return ['"', "0-9", "true", "false", "null", "[", "{"]
return ["a-z", '"']
elif last_char == ":":
return [" ", '"', "0-9", "true", "false", "null", "[", "{"]
elif last_char == ",":
return [" ", '"', "{", "["]
elif last_char in "0123456789":
return ["0-9", ".", ",", "}", "]"]
AIENGINEERINGFROMSCRATCH.COM 429

STRUCTURED OUTPUTS: JSON, SCHEMA VALIDATION, CONSTRAINED DECODING
elif last_char == "}":
return [",", "}", "]", "<EOS>"]
elif last_char == "]":
return [",", "}", "<EOS>"]
elif last_char == "[":
return ['"', "0-9", "true", "false", "null", "{", "[", "]"]
else:
return ["any"]
def demonstrate_constrained_decoding():
partial_states = [
'',
'{',
'{"product"',
'{"product":',
'{"product": "Sony"',
'{"product": "Sony",',
'{"product": "Sony", "price":',
'{"product": "Sony", "price": 348',
'{"product": "Sony", "price": 348}',
]
print(f"{'Partial JSON':<45} {'Valid Next Tokens'}")
print("-" * 80)
for state in partial_states:
valid = next_valid_tokens(state, {})
display = state if state else "(empty)"
print(f"{display:<45} {valid}")
Step 4: Extraction Pipeline
Combine everything into an extraction pipeline: define a schema, simulate an LLM producing
structured output, validate the output, and handle retries.
def simulate_llm_extraction(text, schema, attempt=0):
if "headphones" in text.lower() or "sony" in text.lower():
if attempt == 0:
return '{"product": "Sony WH-1000XM5", "price": 348.00, "in_stock": true, "categories": ["audio", "headphones"]}'
return '{"product": "Sony WH-1000XM5", "price": 348.00, "in_stock": true}'
if "laptop" in text.lower():
return '{"product": "MacBook Pro 16", "price": 2499.00, "in_stock": false, "categories": ["computers"]}'
return '{"product": "Unknown", "price": 0, "in_stock": false}'
def extract_with_retry(text, schema, max_retries=3):
for attempt in range(max_retries):
raw = simulate_llm_extraction(text, schema, attempt)
try:
data = json.loads(raw)
except json.JSONDecodeError as e:
print(f" Attempt {attempt + 1}: JSON parse error -- {e}")
continue
AIENGINEERINGFROMSCRATCH.COM 430

STRUCTURED OUTPUTS: JSON, SCHEMA VALIDATION, CONSTRAINED DECODING
errors = validate_schema(data, schema)
if not errors:
return data
print(f" Attempt {attempt + 1}: Schema validation errors -- {errors}")
return None
product_schema = {
"type": "object",
"properties": {
"product": {"type": "string"},
"price": {"type": "number", "minimum": 0},
"in_stock": {"type": "boolean"},
"categories": {"type": "array", "items": {"type": "string"}},
},
"required": ["product", "price", "in_stock"],
}
Step 5: Run the Full Pipeline
def run_demo():
print("=" * 60)
print(" Structured Output Pipeline Demo")
print("=" * 60)
print("\n--- Schema Definition ---")
product_fields = {
"product": SchemaField(str),
"price": SchemaField(float, minimum=0),
"in_stock": SchemaField(bool),
"categories": SchemaField(list, required=False),
}
generated_schema = model_to_schema("Product", product_fields)
print(json.dumps(generated_schema, indent=2))
print("\n--- Schema Validation ---")
test_cases = [
({"product": "Test", "price": 10.0, "in_stock": True}, "Valid object"),
({"product": "Test", "price": -5.0, "in_stock": True}, "Negative price"),
({"product": "Test", "in_stock": True}, "Missing price"),
({"product": "Test", "price": "ten", "in_stock": True}, "String as price"),
("not an object", "String instead of object"),
]
for data, label in test_cases:
errors = validate_schema(data, product_schema)
status = "PASS" if not errors else f"FAIL: {errors}"
print(f" {label}: {status}")
print("\n--- Constrained Decoding Simulation ---")
demonstrate_constrained_decoding()
AIENGINEERINGFROMSCRATCH.COM 431

STRUCTURED OUTPUTS: JSON, SCHEMA VALIDATION, CONSTRAINED DECODING
print("\n--- Extraction Pipeline ---")
texts = [
"The Sony WH-1000XM5 headphones are priced at $348 and currently available.",
"The new MacBook Pro 16-inch laptop costs $2499 but is sold out.",
"This is a random sentence with no product info.",
]
for text in texts:
print(f"\n Input: {text[:60]}...")
result = extract_with_retry(text, product_schema)
if result:
print(f" Output: {json.dumps(result)}")
else:
print(f" Output: FAILED after retries")
Use It
OpenAI Structured Outputs
# from openai import OpenAI
# from pydantic import BaseModel
#
# client = OpenAI()
#
# class Product(BaseModel):
# product: str
# price: float
# in_stock: bool
#
# response = client.beta.chat.completions.parse(
# model="gpt-5-mini",
# messages=[
# {"role": "system", "content": "Extract product information."},
# {"role": "user", "content": "Sony WH-1000XM5, $348, in stock"},
# ],
# response_format=Product,
# )
#
# product = response.choices[0].message.parsed
# print(product.product, product.price, product.in_stock)
OpenAI’s structured output mode uses constrained decoding internally. Every token the
model generates is guaranteed to produce output matching the Pydantic schema. No retries
needed. No validation needed. The constraint is baked into the decoding process.
Anthropic Tool Use
# import anthropic
#
# client = anthropic.Anthropic()
#
# response = client.messages.create(
# model="claude-opus-4-7",
AIENGINEERINGFROMSCRATCH.COM 432

STRUCTURED OUTPUTS: JSON, SCHEMA VALIDATION, CONSTRAINED DECODING
# max_tokens=1024,
# tools=[{
# "name": "extract_product",
# "description": "Extract product information from text",
# "input_schema": {
# "type": "object",
# "properties": {
# "product": {"type": "string"},
# "price": {"type": "number"},
# "in_stock": {"type": "boolean"},
# },
# "required": ["product", "price", "in_stock"],
# },
# }],
# messages=[{"role": "user", "content": "Extract: Sony WH-1000XM5, $348, in stock"}],
# )
Anthropic achieves structured output through tool use. The model emits a tool call with
structured arguments that match the input_schema. Same result, different API surface.
Instructor Library
# pip install instructor
# import instructor
# from openai import OpenAI
# from pydantic import BaseModel
#
# client = instructor.from_openai(OpenAI())
#
# class Product(BaseModel):
# product: str
# price: float
# in_stock: bool
#
# product = client.chat.completions.create(
# model="gpt-5-mini",
# response_model=Product,
# messages=[{"role": "user", "content": "Sony WH-1000XM5, $348, in stock"}],
# )
Instructor wraps any LLM client and adds automatic retries with validation. If the first at-
tempt fails validation, it sends the errors back to the model as context and asks it to fix the
output. This works with any provider, not just OpenAI.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/11-llm-engineering/03-structured-outputs
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/11-llm-engineering/03-structured-outputs/code
1. Extend the schema validator to support oneOf (the data must match exactly one of several
schemas). This handles polymorphic outputs – for example, a field that can be either a
AIENGINEERINGFROMSCRATCH.COM 433

STRUCTURED OUTPUTS: JSON, SCHEMA VALIDATION, CONSTRAINED DECODING
Product or a Service object with different shapes.
2. Build a “schema diff” tool that compares two schemas and identifies breaking changes
(removed required fields, changed types) versus non-breaking changes (added optional
fields, relaxed constraints). This is essential for versioning your extraction schemas in
production.
3. Implement a more realistic constrained decoding simulator. Given a JSON Schema and
a vocabulary of 100 tokens (letters, digits, punctuation, keywords), walk through gener-
ation step by step, masking invalid tokens at each position. Measure what percentage
of the vocabulary is valid at each step.
4. Build an extraction eval suite. Create 50 product descriptions with hand-labeled JSON
outputs. Run your extraction pipeline on all 50 and measure exact match, field-level
accuracy, and type compliance. Identify which fields are hardest to extract correctly.
5. Add “confidence scores” to your extraction pipeline. For each extracted field, estimate
how confident the model is (based on token probabilities, or by running extraction 3
times and measuring consistency). Flag low-confidence fields for human review.
Key Terms
Term What people say What it actually means
JSON mode “Returns JSON” API flag that guarantees syntactically valid
JSON output, but does not enforce any
particular schema
Structured “Typed JSON” Output that matches a specific JSON
output Schema with correct keys, types, and
constraints
Constrained “Guided generation” At each token position, mask out tokens
decoding that would produce invalid output –
guarantees 100% schema compliance
JSON “A JSON template” A declarative language for describing the
Schema structure, types, and constraints of JSON
data (used by OpenAPI, JSON Forms, etc.)
Pydantic “Python dataclasses+” Python library that defines data models
with type validation, used by FastAPI and
Instructor to generate JSON Schemas
Function “Tool use” LLM outputs a structured function
calling invocation (name + typed arguments)
instead of free text – OpenAI and Anthropic
both support this
Instructor “Pydantic for LLMs” Python library that wraps LLM clients to
return validated Pydantic instances, with
automatic retry on validation failure
Token “Filtering the vocabulary” Setting specific token probabilities to zero
masking during generation so the model cannot
produce them
Schema “Matches the shape” The output has every required field, correct
compliance types, values within constraints, and no
extra disallowed fields
AIENGINEERINGFROMSCRATCH.COM 434

STRUCTURED OUTPUTS: JSON, SCHEMA VALIDATION, CONSTRAINED DECODING
Term What people say What it actually means
Retry loop “Try again until it works” Send validation errors back to the model
and ask it to fix the output – Instructor does
this automatically, up to a configurable max
Further Reading
• OpenAI Structured Outputs Guide – official documentation for JSON Schema-based con-
strained decoding in the OpenAI API
• Willard & Louf, 2023 – “Efficient Guided Generation for Large Language Models” – the
Outlines paper, describing how to compile JSON Schemas into finite state machines for
token-level constraints
• Instructor documentation – the standard library for getting structured outputs from any
LLM with Pydantic validation and retries
• Anthropic Tool Use Guide – how Claude implements structured output via tool use with
JSON Schema input_schema
• JSON Schema specification – the full spec for the schema language used by every major
structured output system
• Outlines library – open-source constrained generation using regex and JSON Schema
compiled to finite state machines
• Dong et al., “XGrammar: Flexible and Efficient Structured Generation Engine for
Large Language Models” (MLSys 2025) – the current state-of-the-art grammar engine;
pushdown-automaton compilation that masks tokens at ~100 ns / token.
• Beurer-Kellner et al., “Prompting Is Programming: A Query Language for Large Lan-
guage Models” (LMQL) – the LMQL paper framing constrained decoding as a query lan-
guage with type and value constraints.
• Microsoft Guidance (framework docs) – template-driven constrained generation; vendor-
agnostic complement to Outlines and XGrammar.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/11-llm-engineering/03-structured-outputs
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/11-llm-engineering/03-structured-outputs/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/11-llm-engineering/03-structured-outputs
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 435