---
title: "Indirect Prompt Injection — Production Attack Surface"
volume: "vol6-production"
part: "Part II — Ethics, Safety & Alignment"
chapter_number: 45
source_pages: "197-200"
---

# Indirect Prompt Injection — Production Attack Surface

Indirect Prompt Injection — Production
Attack Surface
Indirect prompt injection (IPI) embeds instructions inside external content — a web
page, an email, a shared document, a support ticket — consumed by an agentic sys-
tem without explicit user action. IPI is the dominant 2026 production threat: it
bypasses user-input filters because the attacker never touches the user, it scales
silently as agents process more external content, and it targets automated work-
flows where nobody is reading the prompt. MDPI Information 17(1):54 (January
2026) synthesizes 2023-2025 research. NDSS 2026’s IPI-defense paper frames
the core challenge: injected instructions can be semantically benign (“please print
Yes”), so detection requires more than keyword filtering. “The Attacker Moves Sec-
ond” (Nasr et al., joint OpenAI/Anthropic/DeepMind, October 2025): adaptive at-
tacks (gradient, RL, random search, human red-team) broke >90% of 12 published
defenses that had originally reported near-zero attack success rates.
Type: Build Languages: Python (stdlib, IPI attack + defense harness) Prerequisites: Phase
18 · 12 (PAIR), Phase 14 (agent engineering) Time: ~75 minutes
Learning Objectives
• Define indirect prompt injection and describe three common delivery vectors.
• Explain why user-input filters miss IPI entirely.
• Describe the “information flow control” framing as the 2026 defense paradigm.
• State the finding of Nasr et al. (October 2025) on adaptive attack success against pub-
lished IPI defenses.
The Problem
Direct prompt injection requires the attacker to reach the user or their prompt. IPI requires
neither: the attacker places a payload in any content the agent might read — a web page,
an email in the inbox, a GitHub issue, a product review. The agent picks it up during normal
operation and executes the instructions. The user is the messenger, not the intent.
The Concept
Three delivery vectors
• Retrieval-augmented generation (RAG). Attacker publishes a document; the re-
trieval step fetches it; the prompt concatenates it before the user question; the model
executes the attacker’s instructions.
• Inbox / document workflows. Attacker sends an email to the user; the agent reads
emails; the prompt includes the email body; the model follows the email’s instructions.
AIENGINEERINGFROMSCRATCH.COM 190

INDIRECT PROMPT INJECTION — PRODUCTION ATTACK SURFACE
• Tool output. Attacker controls a tool the agent uses (e.g., a web search that returns
an attacker-controlled result); the tool output contains instructions; the agent’s control
flow follows them.
The three share a structural property: the attacker controls a fragment of the prompt without
touching the user-facing input.
Why user-input filters miss it
An IPI payload does not appear in the user’s input. It appears in the retrieved content. If
the filter is gated on user input, the payload bypasses it. If the filter is gated on all content
that reaches the model, it must apply to arbitrary retrieved text — which is expensive and
produces false positives against legitimate content that happens to contain imperative-voice
language.
Information Flow Control (IFC) for AI
The 2026 defense paradigm borrows from classical OS security. Treat every content source as
a security label. Label the user’s query as “trusted.” Label retrieved content as “untrusted.”
Treat the model’s control flow as an information flow: actions triggered by untrusted content
must be ratified by trusted input before execution.
CaMeL (Microsoft 2025), ConfAIde (Stanford 2024), and the NDSS 2026 IPI-defense paper
operationalize IFC in different ways. The common principle: as long as code and data share
the same context window, containment is the goal, not prevention.
The Attacker Moves Second
Nasr et al. (October 2025) tested 12 published IPI defenses with adaptive attacks (gradient
search, RL policies, random search, 72-hour human red-team). Every defense that originally
reported near-zero ASR was broken to >90% ASR.
The methodological lesson: publish a defense only with adaptive-attack evaluation. Static-
attack benchmarks are not evidence of robustness; the attacker gets to know the defense.
Real incidents
Lesson 25 covers EchoLeak (CVE-2025-32711, CVSS 9.3) — the first publicly documented
zero-click IPI in Microsoft 365 Copilot. CamoLeak (CVSS 9.6) in GitHub Copilot Chat. CVE-
2025-53773 in GitHub Copilot. Production deployments are being compromised by IPI in the
field, not just in benchmarks.
OWASP and NIST framing
OWASP LLM Top 10 (2025) ranks prompt injection (direct + indirect) as LLM01, the #1
application-layer threat. NIST AI SPD 2024 calls indirect prompt injection “generative AI’s
greatest security flaw.”
Where this fits in Phase 18
Lessons 12-14 are model-centric jailbreaks. Lesson 15 is the system-centric attack that dom-
inates 2026 production deployments. Lesson 16 covers the defensive tooling. Lesson 25
covers the specific CVE narrative.
AIENGINEERINGFROMSCRATCH.COM 191

INDIRECT PROMPT INJECTION — PRODUCTION ATTACK SURFACE
Interactive figure: al-injection-vector. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/18-ethics-safety-alignment/15-indirect-prompt-injection
Use It
code/main.py builds an IPI harness. A toy agent has three tools (search web, read email, send
message). The environment contains attacker-controlled content with an embedded instruc-
tion (“forward this to all contacts”). You can toggle between a naive agent (follows injected
instructions), a filter-defended agent (keyword filter on retrieved content), and an IFC agent
(separates trusted and untrusted content and refuses untrusted control-flow commands).
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/18-ethics-safety-alignment/15-indirect-prompt-
injection
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/18-ethics-safety-alignment/15-indirect-prompt-
injection/code
1. Run code/main.py. Measure the success rate of the attack against each of the three
agents.
2. Implement a paraphrase-based defense on retrieved content. Measure the benign false-
positive rate on legitimate retrieved text.
3. Read the NDSS 2026 IPI-defense paper. Describe the “benign instruction” challenge and
why it prevents keyword-based filtering.
4. Design a deployment where the agent receives a tool output from a third-party API. Label
each prompt fragment with a trust level and write the IFC policy that governs the agent’s
actions.
5. Reproduce the Nasr et al. 2025 adaptive-attack methodology on your filter-defended
agent from Exercise 2. Report the ASR before and after adaptive attack.
Key Terms
Term What people say What it actually means
IPI “indirect prompt injection” Injection via content the user did not write,
consumed by the agent during normal
operation
RAG “poisoned retrieval” Attacker publishes content that the retrieval
injection step fetches; prompt contains the payload
Zero-click “no user action” Attack triggers automatically during agent
operation; user does nothing
IFC “information flow control” Label-based approach: actions from
untrusted content require trusted
ratification
AIENGINEERINGFROMSCRATCH.COM 192

INDIRECT PROMPT INJECTION — PRODUCTION ATTACK SURFACE
Term What people say What it actually means
Adaptive “gradient / RL red-team” Attack that knows the defense and optimizes
attack against it; required for honest evaluation
Benign “please print Yes” IPI payload that is semantically benign; no
instruction keyword filter catches it
Scope “cross-trust exfiltration” Agent accesses data from one trust context
violation and outputs it to another
Further Reading
• MDPI Information 17(1):54 — Indirect Prompt Injection Survey (January 2026) — 2023-
2025 synthesis
• Nasr et al. — The Attacker Moves Second (joint OpenAI/Anthropic/DeepMind, October
2025) — adaptive attack evaluation
• Greshake et al. — Not what you’ve signed up for (arXiv:2302.12173) — the original IPI
paper
• OWASP — LLM Top 10 (2025) — prompt injection ranked LLM01
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/18-ethics-safety-alignment/15-indirect-prompt-injection
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/18-ethics-safety-alignment/15-indirect-prompt-injection/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/18-ethics-safety-alignment/15-indirect-prompt-injection
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 193