---
title: "Browser Agents and Long-Horizon Web Tasks"
volume: "vol5-agents"
part: "Part IV — Autonomous Systems"
chapter_number: 102
source_pages: "476-480"
---

# Browser Agents and Long-Horizon Web Tasks

Browser Agents and Long-Horizon Web
Tasks
ChatGPT agent (July 2025) merged Operator and deep research into one
browser/terminal agent and set BrowseComp SOTA at 68.9%. OpenAI shut
Operator down August 31, 2025 — consolidation at the product layer. Anthropic’s
Vercept acquisition moved Claude Sonnet on OSWorld from under 15% to 72.5%.
WebArena-Verified (ServiceNow, ICLR 2026) fixed 11.3 percentage points of
false-negative rate in the original WebArena and shipped the 258-task Hard subset.
The numbers are real. So is the attack surface: OpenAI’s head of preparedness
stated publicly that indirect prompt injection into browser agents “is not a bug that
can be fully patched.” Documented 2025–2026 attacks: Tainted Memories (Atlas
CSRF), HashJack (Cato Networks), and one-click hijacks in Perplexity Comet.
Type: Learn Languages: Python (stdlib, indirect prompt-injection attack surface model)
Prerequisites: Phase 15 · 10 (Permission modes), Phase 15 · 01 (Long-horizon agents) Time:
~45 minutes
The Problem
A browser agent is a long-horizon agent that reads untrusted content and takes consequential
actions. Every page the agent visits is an input the user did not write. Every form on every
page is a potential command channel. The 2025–2026 attack corpus shows this is not hypo-
thetical: Tainted Memories lets an attacker bind malicious instructions to the agent’s memory
via a crafted page; HashJack hides commands in URL fragments the agent visits; Perplexity
Comet hijacks hit in a single click.
The defensive picture is uncomfortable. OpenAI’s head of preparedness said the quiet part
loud: indirect prompt injection “is not a bug that can be fully patched.” This is because the
attack lives in the agent’s reading-vs-acting boundary, which is architecturally fuzzy — every
token the model reads could, in principle, be read as an instruction.
This lesson names the attack surface, names the benchmark landscape (BrowseComp, OS-
World, WebArena-Verified), and models a minimal indirect-prompt-injection scenario so you
can reason about real defenses in Lessons 14 and 18.
The Concept
The 2026 landscape, in one paragraph per system
ChatGPT agent (OpenAI). Launched July 2025. Unifies Operator (browsing) and Deep Re-
search (multi-hour research). Shut down the standalone Operator August 31, 2025. SOTA on
BrowseComp at 68.9%; strong numbers on OSWorld and WebArena-Verified.
Claude Sonnet + Vercept (Anthropic). Anthropic’s Vercept acquisition focused on
computer-use capabilities. Moved Claude Sonnet on OSWorld from <15% to 72.5%. Claude
Computer Use ships as a tool API.
AIENGINEERINGFROMSCRATCH.COM 470

BROWSER AGENTS AND LONG-HORIZON WEB TASKS
Gemini 3 Pro with Browser Use (DeepMind). Browser Use integration ships computer-use
controls; FSF v3 (April 2026, Lesson 20) tracks autonomy in the ML R&D domain specifically.
WebArena-Verified (ServiceNow, ICLR 2026). Fixes a well-documented problem: the orig-
inal WebArena had ~11.3% false-negative rate (tasks marked failed that were actually solved).
The Verified release re-grades with human-curated success criteria and adds a 258-task Hard
subset (ICLR 2026 paper, openreview.net/forum?id=94tlGxmqkN).
BrowseComp vs OSWorld vs WebArena
Benchmark What it measures Horizon
BrowseComp Finding specific facts on the minutes
open web under time
pressure
OSWorld Agent operating a full tens of minutes
desktop (mouse, keyboard,
shell)
WebArena-Verified Transactional web tasks in minutes
simulated sites
Hard subset WebArena-Verified tasks tens of minutes
with multi-page state
transitions
Different axes. A high BrowseComp score says the agent finds facts; it does not say the agent
can book a flight. The OSWorld score is closer to “does it work on my desktop.” WebArena-
Verified is closer to “can it finish a flow.” Any production decision needs the benchmark that
matches the task distribution.
The attack surface, named
1. Indirect prompt injection. Untrusted page content contains instructions. The agent
reads them. The agent executes them. Public examples: 2024 Kai Greshake et al., 2025
Tainted Memories paper, 2026 HashJack (Cato Networks).
2. URL fragment / query injection. The #fragment or query string of a crawled URL
contains commands. Never rendered visibly; still inside the agent’s context.
3. Memory-binding attacks. Page instructs the agent to write a persistent memory (Les-
son 12 covers durable state). Next session, the memory fires the payload with no visible
trigger.
4. CSRF-shaped attacks on authenticated sessions. Tainted Memories class: agent is
logged in somewhere; attacker’s page issues state-changing requests the agent executes
with the user’s cookies.
5. One-click hijack. A visually innocuous button rides a payload the agent follows. Comet
class.
6. Content-Security-Policy holes in the agent’s host surface. The rendering and tool
layers can themselves be attack vectors; the browser-in-a-browser-agent stack is wide.
Why “not fully patchable”
The attack is isomorphic to the agent’s capability. The agent must read untrusted content
to do its job. Any content the agent reads could contain instructions. Any instructions the
agent follows could be misaligned with the user’s actual request. Defenses (trust boundaries,
AIENGINEERINGFROMSCRATCH.COM 471

BROWSER AGENTS AND LONG-HORIZON WEB TASKS
classifiers, tool allowlists, HITL on consequential actions) raise the cost of the attack and
reduce its blast radius. They do not close the class.
This is the same reasoning pattern as Lob’s theorem (Lesson 8): the agent cannot prove the
next token is safe; it can only set up a system where unsafe tokens are more detectable.
Defense posture that actually ships
• Read / write boundary. Reading is never consequential. Writing (submitting a form,
posting content, calling a tool with side effects) requires fresh human approval if the
initiating content came from outside the trust boundary.
• Tool allowlist per task. The agent can browse; it cannot initiate a wire transfer unless
that tool was explicitly enabled for the task. Lesson 13 covers budgets.
• Session isolation. Browser agent sessions run with scoped credentials only. No pro-
duction auth, no personal email. Logs of every HTTP request retained for audit.
• Content sanitizer. Fetched HTML is stripped of known-bad patterns before being con-
catenated into the model context. (Reduces the easy attacks; does not stop sophisticated
payloads.)
• HITL on consequential actions. Propose-then-commit pattern (Lesson 15).
• Canary tokens on memory. If a memory entry fires, the user sees it (Lesson 14).
Interactive figure: injection-boundary. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/15-autonomous-systems/11-browser-agents
Use It
code/main.py models a tiny browser-agent run against three synthetic pages. One page is be-
nign, one has a direct prompt-injection blob in visible text, one has a URL-fragment injection
(not visible but inside the agent’s context). The script shows (a) what a naïve agent would
do, (b) what a read/write boundary catches, (c) what a sanitizer catches, (d) what neither
catches.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/15-autonomous-systems/11-browser-agents
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/15-autonomous-systems/11-browser-agents/code
1. Run code/main.py. Identify which attack the sanitizer catches but the read/write bound-
ary does not, and which attack only the read/write boundary catches.
2. Extend the sanitizer to detect one class of HashJack-style URL-fragment injection. Mea-
sure the false-positive rate on benign URLs with legitimate fragments.
3. Pick one real browser-agent workflow you know (e.g., “book a flight”). List every read
and every write. Mark which writes need HITL and why.
4. Read the WebArena-Verified ICLR 2026 paper. Identify one category of task where the
original WebArena’s scoring was unreliable and explain how the Verified subset resolves
it.
AIENGINEERINGFROMSCRATCH.COM 472

BROWSER AGENTS AND LONG-HORIZON WEB TASKS
5. Design a memory canary for a browser-agent setting. What would you store, where, and
what triggers the alarm?
Key Terms
Term What people say What it actually means
Indirect prompt injection “Bad page text” Untrusted content in a page
the agent reads contains
instructions the agent
executes
Tainted Memories “Memory attack” Agent writes an
attacker-supplied instruction
to durable memory;
triggered next session
HashJack “URL fragment attack” Payload hidden in URL
fragment / query string is in
the agent’s context but not
visibly rendered
One-click hijack “Bad button” Visible affordance rides a
follow-on payload the agent
executes
BrowseComp “Web search benchmark” Finding specific facts on the
open web; minute-scale
horizon
OSWorld “Desktop benchmark” Full OS control; multi-step
GUI tasks
WebArena-Verified “Fixed web-task benchmark” ServiceNow’s regraded
WebArena with Hard subset
Read/write boundary “Side-effect gate” Reading never
consequential; writing
requires fresh approval if
content is out-of-trust
Further Reading
• OpenAI — Introducing ChatGPT agent — merge of Operator and deep research; BrowseC-
omp SOTA.
• OpenAI — Computer-Using Agent — the Operator lineage and the architecture that be-
came ChatGPT agent.
• Zhou et al. — WebArena — the original benchmark.
• WebArena-Verified (OpenReview) — ICLR 2026 fixed-subset paper.
• Anthropic — Measuring agent autonomy in practice — includes attack-surface discussion
for computer-use agents.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/15-autonomous-systems/11-browser-agents
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/15-autonomous-systems/11-browser-agents/code
AIENGINEERINGFROMSCRATCH.COM 473

BROWSER AGENTS AND LONG-HORIZON WEB TASKS
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 474