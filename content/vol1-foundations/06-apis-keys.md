---
title: "APIs & Keys"
volume: "vol1-foundations"
part: "Part I — Setup & Tooling"
chapter_number: 6
source_pages: "18-21"
---

# APIs & Keys

APIs & Keys
Every AI API works the same way: send a request, get a response. The details
change, the pattern doesn’t.
Type: Build Languages: Python, TypeScript Prerequisites: Phase 0, Lesson 01 Time: ~30
minutes
Learning Objectives
• Store API keys securely using environment variables and .env files
• Make an LLM API call using both the Anthropic Python SDK and raw HTTP
• Compare SDK-based and raw HTTP request/response formats for debugging
• Identify and handle common API errors including authentication and rate limits
The Problem
Starting from Phase 11, you’ll call LLM APIs (Anthropic, OpenAI, Google). In Phase 13-16
you’ll build agents that use these APIs in loops. You need to know how API keys work, how to
store them safely, and how to make your first API call.
The Concept
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/00-setup-and-tooling/04-apis-and-keys
Every API call has: 1. An endpoint (URL) 2. An API key (authentication) 3. A request body
(what you want) 4. A response body (what you get back)
Interactive figure: s0-secret-inject. This one moves. Watch it animate and drag its con-
trols in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/00-
setup-and-tooling/04-apis-and-keys
Build It
Step 1: Store API keys safely
Never put API keys in code. Use environment variables.
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
Or use a .env file (add it to .gitignore):
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
AIENGINEERINGFROMSCRATCH.COM 14

APIS & KEYS
Step 2: First API call (Python)
import os
import anthropic
client = anthropic.Anthropic()
MODEL = os.environ.get("LLM_MODEL", "claude-sonnet-5")
response = client.messages.create(
model=MODEL,
max_tokens=256,
messages=[{"role": "user", "content": "What is a neural network in one sentence?"}]
)
print(response.content[0].text)
LLM_MODEL selects the Anthropic model id, and the default is the un-dated Sonnet alias. Other
providers (OpenAI, Google, and others) follow the same pattern of a key plus a model id, but
each has its own SDK, endpoint, and request/response schema.
Step 3: First API call (TypeScript)
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();
const MODEL = process.env.LLM_MODEL ?? "claude-sonnet-5";
const response = await client.messages.create({
model: MODEL,
max_tokens: 256,
messages: [{ role: "user", content: "What is a neural network in one sentence?" }],
});
console.log(response.content[0].text);
Step 4: Raw HTTP (no SDK)
import os
import urllib.request
import json
url = "https://api.anthropic.com/v1/messages"
headers = {
"Content-Type": "application/json",
"x-api-key": os.environ["ANTHROPIC_API_KEY"],
"anthropic-version": "2023-06-01",
}
body = json.dumps({
"model": os.environ.get("LLM_MODEL", "claude-sonnet-5"),
"max_tokens": 256,
"messages": [{"role": "user", "content": "What is a neural network in one sentence?"}],
AIENGINEERINGFROMSCRATCH.COM 15

APIS & KEYS
}).encode()
req = urllib.request.Request(url, data=body, headers=headers, method="POST")
with urllib.request.urlopen(req) as resp:
result = json.loads(resp.read())
print(result["content"][0]["text"])
This is what the SDKs do under the hood. Understanding the raw HTTP call helps when
debugging.
Use It
For this course:
API When you need it Free tier
Anthropic Phases 11-16 (agents, tools) $5 credit on signup
(Claude)
OpenAI Phase 11 (comparison) $5 credit on signup
Hugging Phases 4-10 (models, datasets) Free
Face
You don’t need all of them right now. Set them up when the lesson requires it.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/00-setup-and-tooling/04-apis-and-keys
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/00-setup-and-tooling/04-apis-and-keys/code
1. Get an Anthropic API key and make your first API call
2. Try the raw HTTP version and compare the response format to the SDK version
3. Intentionally use a wrong API key and read the error message
Key Terms
Term What people say What it actually means
API key “Password for the API” A unique string that identifies your account
and authorizes requests
Rate limit “They’re throttling me” Maximum requests per minute/hour to
prevent abuse and ensure fair usage
Token “A word” (in API context) A billing unit: input and output tokens are
counted and charged separately
Streaming “Real-time responses” Getting the response word by word instead
of waiting for the full response
Continue online. The living edition of this chapter has more than the page can hold:
AIENGINEERINGFROMSCRATCH.COM 16

APIS & KEYS
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/00-setup-and-tooling/04-apis-and-keys
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/00-setup-and-tooling/04-apis-and-keys/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/00-setup-and-tooling/04-apis-and-keys
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 17