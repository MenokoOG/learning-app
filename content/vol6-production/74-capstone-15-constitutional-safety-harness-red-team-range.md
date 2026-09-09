---
title: "Capstone 15 — Constitutional Safety Harness + Red-Team Range"
volume: "vol6-production"
part: "Part III — Capstone Projects"
chapter_number: 74
source_pages: "326-330"
---

# Capstone 15 — Constitutional Safety Harness + Red-Team Range

Capstone 15 — Constitutional Safety
Harness + Red-Team Range
Anthropic’s Constitutional Classifiers, Meta’s Llama Guard 4, Google’s ShieldGemma-
2, NVIDIA’s Nemotron 3 Content Safety, and X-Guard for multilingual coverage
defined the 2026 safety-classifier stack. garak, PyRIT, NVIDIA Aegis, and prompt-
foo became the standard adversarial evaluation tools. NeMo Guardrails v0.12 ties
them into a production pipeline. This capstone wires all of it together: a layered
safety harness around a target app, an autonomous red-team agent running 6+
attack families, and a constitutional self-critique run that produces a measurable
harmlessness delta.
Type: Capstone Languages: Python (safety pipeline, red team), YAML (policy configs) Pre-
requisites: Phase 10 (LLMs from scratch), Phase 11 (LLM engineering), Phase 13 (tools),
Phase 14 (agents), Phase 18 (ethics, safety, alignment) Phases exercised: P10 · P11 · P13 ·
P14 · P18 Time: 25 hours
Problem
The frontier of LLM safety in 2026 is not whether classifiers work (they do, roughly) but how
to compose them correctly around a production app without over-refusing or leaving obvious
holes. Llama Guard 4 handles English policy violations. X-Guard (132 languages) handles mul-
tilingual jailbreak. ShieldGemma-2 catches image-based prompt injection. NVIDIA Nemotron
3 Content Safety covers enterprise categories. Anthropic’s Constitutional Classifiers are a
separate approach used during training rather than serving.
Attack evolution matters too. PAIR and TAP automate jailbreak discovery. GCG runs gradient-
based suffix attacks. Multi-turn and code-switch attacks exploit agent memory. Any deployed
LLM needs a red-team range — garak and PyRIT are the canonical drivers — plus documented
mitigations and CVSS-scored findings.
You will harden a target application (either an 8B instruction-tuned model or one of the RAG
chatbots from other capstones), run 6+ attack families against it, and produce a before/after
harmlessness measurement.
Concept
The safety pipeline is five layers. Input sanitize: strip zero-width chars, decode
base64/rot13, normalize Unicode. Policy layer: NeMo Guardrails v0.12 rails (off-domain,
toxicity, PII extraction). Classifier gate: Llama Guard 4 on input, X-Guard on non-English,
ShieldGemma-2 on image inputs. Model: the target LLM. Output filter: Llama Guard 4
on output, Presidio PII scrub, citation enforcement where applicable. HITL tier: outputs
flagged high-risk go to a Slack queue.
The red-team range runs on a scheduler. PAIR and TAP autonomously discover jailbreaks.
GCG runs gradient-based suffix attacks. ASCII / base64 / rot13 encoding attacks. Multi-
turn attacks (persona adoption, memory exploitation). Code-switch attacks (mix English with
AIENGINEERINGFROMSCRATCH.COM 319

CAPSTONE 15 — CONSTITUTIONAL SAFETY HARNESS + RED-TEAM RANGE
Swahili or Thai). Each run produces a structured findings file with CVSS scoring and disclo-
sure timeline.
The constitutional-self-critique run is a training-time intervention. Take 1k harmful-attempt
prompts, have the model draft a response, critique it against a written constitution (do-not-
harm rules), and retrain on the critique loop. Measure the before/after harmlessness delta
on a held-out eval.
Architecture
request (text / image / multilingual)
|
v
input sanitize (strip zero-width, decode, normalize)
|
v
NeMo Guardrails v0.12 rails (off-domain, policy)
|
v
classifier gate:
Llama Guard 4 (English)
X-Guard (multilingual, 132 langs)
ShieldGemma-2 (image prompts)
Nemotron 3 Content Safety (enterprise)
|
v (allowed)
target LLM
|
v
output filter: Llama Guard 4 + Presidio PII + citation check
|
v
HITL tier for flagged outputs
parallel:
red-team scheduler
-> garak (classic attacks)
-> PyRIT (orchestrated red team)
-> autonomous jailbreak agent (PAIR + TAP)
-> GCG suffix attacks
-> multilingual / code-switch
-> multi-turn persona adoption
output: CVSS-scored findings + disclosure timeline + before/after harmlessness delta
Stack
• Safety classifiers: Llama Guard 4, ShieldGemma-2, NVIDIA Nemotron 3 Content Safety,
X-Guard
• Guardrail framework: NeMo Guardrails v0.12 + OPA
• Red-team drivers: garak (NVIDIA), PyRIT (Microsoft Azure), NVIDIA Aegis, promptfoo
• Jailbreak agents: PAIR (Chao et al., 2023), Tree-of-Attacks (TAP), GCG suffix
AIENGINEERINGFROMSCRATCH.COM 320

CAPSTONE 15 — CONSTITUTIONAL SAFETY HARNESS + RED-TEAM RANGE
• Constitutional training: Anthropic-style self-critique loop + SFT on critiques
• PII scrub: Presidio
• Target: an 8B instruction-tuned model or one of the other capstones’ RAG chatbots
Interactive figure: cf-safety-stack. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/19-
capstone-projects/15-constitutional-safety-harness
Build It
1. Target setup. Stand up an 8B instruction-tuned model on vLLM (or reuse a RAG chatbot
from another capstone). This is the app under test.
2. Safety pipeline wrap. Wire the five-layer pipeline around the target. Verify each layer
is individually observable (span per layer in Langfuse).
3. Classifier coverage. Load Llama Guard 4, X-Guard (multilingual), ShieldGemma-2 (im-
age). Run each on a small labeled set to establish baselines.
4. Red-team scheduler. Schedule garak, PyRIT, a PAIR agent, a TAP agent, a GCG runner,
a multi-turn attacker, and a code-switch attacker. Each runs on a separate queue.
5. Attack suite. Six attack families: (1) PAIR automated jailbreak, (2) TAP tree-of-attacks,
(3) GCG gradient suffix, (4) ASCII / base64 / rot13 encoding, (5) multi-turn persona, (6)
multilingual code-switch. Report success rate per family.
6. Constitutional self-critique. Curate 1k harmful-attempt prompts. For each, the target
drafts a response. A critic LLM scores against a written constitution (“do no harm,” “cite
evidence,” “refuse illegal requests”). Prompts where the critic objects get rewritten; the
target fine-tunes on the critique-improved pairs. Measure before/after harmlessness on
a held-out eval.
7. Over-refusal measurement. Track false-positive rate on a benign prompt suite (e.g.,
XSTest). The target must stay helpful on benign questions.
8. CVSS scoring. For each successful jailbreak, score on CVSS 4.0 (attack vector, com-
plexity, impact). Produce a disclosure timeline and mitigation plan.
9. Range automation. Everything above runs on a cron; findings write to a queue; over-
refusal regression alerts fire to Slack.
Use It
$ safety probe --model=target --family=PAIR --budget=50
[attacker] PAIR agent running on target
[attack] attempt 1/50: disguise query as academic research ... blocked
[attack] attempt 2/50: appeal to roleplay ... blocked
[attack] attempt 3/50: chain-of-thought coax ... SUCCEEDED
[finding] CVSS 4.8 medium: roleplay bypass on target
[range] 7 successes out of 50 (14% success rate)
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/19-capstone-projects/15-constitutional-safety-
harness
AIENGINEERINGFROMSCRATCH.COM 321

CAPSTONE 15 — CONSTITUTIONAL SAFETY HARNESS + RED-TEAM RANGE
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/19-capstone-projects/15-constitutional-safety-
harness/code
1. Run garak’s plugin for prompt-injection on a RAG chatbot and compare attack success
rate with and without the output-filter layer.
2. Add a seventh attack family: indirect prompt injection via retrieved documents. Measure
the extra defense required.
3. Implement a “refuse-with-help” mode: when the guardrail blocks, the target offers a
safer related answer instead of a flat refusal. Measure XSTest delta.
4. Multilingual coverage gap: find a language where X-Guard underperforms. Propose a
fine-tune dataset targeting it.
5. Run the constitutional self-critique on a 30B model and measure whether the delta scales.
Key Terms
Term What people say What it actually means
Layered “Defense in depth” Multiple guardrails at input, gate, output,
safety HITL
Llama “Meta’s safety classifier” The 2026 reference input/output content
Guard 4 classifier
PAIR “Jailbreak agent” Paper (Chao et al.) on LLM-driven jailbreak
discovery
TAP “Tree-of-Attacks” Tree-search variant of PAIR
GCG “Greedy coordinate gradient” Gradient-based adversarial suffix attack
Constitutional“Anthropic-style training” Target drafts -> critic scores -> rewrite ->
self- retrain
critique
XSTest “Benign probe set” Benchmark for over-refusal regression
CVSS 4.0 “Severity score” Standard vulnerability scoring for safety
findings
Further Reading
• Anthropic Constitutional Classifiers — training-time reference
• Meta Llama Guard 4 — the 2026 input/output classifier
• Google ShieldGemma-2 — image + multimodal safety
• NVIDIA Nemotron 3 Content Safety — enterprise reference
• X-Guard (arXiv:2504.08848) — 132-language multilingual safety
• garak — NVIDIA red-team toolkit
• PyRIT — Microsoft red-team framework
• NeMo Guardrails v0.12 — rail framework
• PAIR (arXiv:2310.08419) — jailbreak agent paper
Continue online. The living edition of this chapter has more than the page can hold:
AIENGINEERINGFROMSCRATCH.COM 322

CAPSTONE 15 — CONSTITUTIONAL SAFETY HARNESS + RED-TEAM RANGE
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/19-capstone-projects/15-constitutional-safety-harness
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/19-capstone-projects/15-constitutional-safety-harness/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/19-capstone-projects/15-constitutional-safety-harness
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 323