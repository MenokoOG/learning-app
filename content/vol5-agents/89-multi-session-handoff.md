---
title: "Multi-Session Handoff"
volume: "vol5-agents"
part: "Part III — Agent Engineering"
chapter_number: 89
source_pages: "419-423"
---

# Multi-Session Handoff

Multi-Session Handoff
The session is going to end. The work is not. The handoff packet is the artifact that
turns “the agent worked for an hour” into “the next session is productive in the first
minute.” Build it on purpose, not as an afterthought.
Type: Build Languages: Python (stdlib) Prerequisites: Phase 14 · 34 (Repo Memory), Phase
14 · 38 (Verification), Phase 14 · 39 (Reviewer) Time: ~50 minutes
Learning Objectives
• Identify the seven fields every handoff packet needs.
• Generate a handoff from the workbench artifacts without hand-writing prose.
• Trim large feedback logs into a handoff-sized summary.
• Make the next session’s first action deterministic.
The Problem
The session ends. The agent says “great, we made progress.” The next session opens. The
next agent asks “where did we leave off?” The first agent’s answer is gone. The next agent
rediscovers, re-runs the same commands, re-asks the human the same questions, and burns
thirty minutes recovering the last thirty seconds of the previous session.
The cost of a bad handoff is paid every session for the life of the task. The fix is a packet
generated automatically at session end: what changed, why, what was tried, what failed,
what is left, what to do first next time.
The Concept
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/14-agent-engineering/40-multi-session-handoff
Seven fields every handoff carries
Field Question it answers
summary One paragraph of what was done
changed_files The diff at a glance
commands_run What was actually executed
failed_attempts What was tried and why it did not work
open_risks What could bite next session, with severity
next_action The first concrete step next session takes
verdict_pointer Path to the verification + review reports
AIENGINEERINGFROMSCRATCH.COM 413

MULTI-SESSION HANDOFF
The next_action field is the load-bearing one. A handoff with everything except next_action
is a status report, not a handoff.
Handoffs are generated, not written
A hand-written handoff is a handoff that gets skipped on a hard day. The generator reads
the workbench artifacts and emits the packet. The agent’s job is to leave the workbench in a
state the generator can summarize, not to write the summary.
Two forms: human-readable and machine-readable
handoff.md is what the human reads. handoff.json is what the next agent loads. Both come
from the same source artifacts. If they diverge, the JSON wins.
Feedback log trimming
The full feedback_record.jsonl may be hundreds of entries. The handoff carries only the last
K plus every entry with a non-zero exit. The next session loads the full log if it needs to, but
the packet stays small.
Leave a clean state
A handoff describes the work. A clean state makes the work resumable. They are not the
same thing. A perfect handoff.md is worthless if the next session opens to a half-applied diff,
a temp file the agent forgot, a stray branch, and tests that error before they even run. The
next agent then spends its first ten minutes cleaning up after the last one instead of building,
and the cost compounds every session for the life of the task.
So the session does not end when the feature works. It ends when the workbench is in a state
the generator can summarize and the next session can trust. Cleanup is its own phase, run
before the handoff, and it is a check, not a habit, because a habit is the thing that gets skipped
on a hard day.
Check Clean means Dirty blocks because
Working tree Every change committed A half-applied diff looks like intentional work
or explicitly stashed with a to the next agent
note
Temp artifacts No *.tmp, scratch dirs, Stray files pollute the diff and the next
debug prints, or agent’s mental model
commented-out blocks left
behind
Tests Green, or red with the A silent red test is a trap the next session
failure named in steps in
open_risks
Feature board feature_list.json status A stale board sends the next session to work
reflects reality (Phase 14 · that is already done
36)
Branch On the expected branch, Wrong branch means the next session’s first
no detached HEAD, no commit lands in the wrong place
orphan branches
The cleanup phase emits a clean_state.json of blocking issues; an empty list is the precondi-
tion the handoff generator asserts before it writes a packet. A handoff built on a dirty tree is
AIENGINEERINGFROMSCRATCH.COM 414

MULTI-SESSION HANDOFF
not a handoff, it is a forwarded mess. The two artifacts pair: cleanup proves the workbench
is safe to leave, the handoff proves the next session knows where to start.
Interactive figure: wb-handoff-packet. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/14-agent-engineering/40-multi-session-handoff
Build It
code/main.py implements:
• A loader that gathers state, verdict, review, and feedback into a single WorkbenchSnap-
shot.
• A generate_handoff(snapshot) -> (markdown, payload) function.
• A filter that picks the last K feedback entries plus all non-zero exits.
• A demo run that writes handoff.md and handoff.json next to the script.
Run it:
python3 code/main.py
Output: a printed handoff body, plus both files on disk.
Production patterns in the wild
Codex CLI, Claude Code, and OpenCode each ship a different compaction story; the struc-
tured handoff packet sits on top of all three.
Compaction strategies vary; the packet schema does not. Codex CLI’s POST
/v1/responses/compact is a server-side opaque AES blob (fast path for OpenAI models);
the fallback is a local “handoff summary” appended as a _summary user-role message. Claude
Code runs five-stage progressive compaction at 95% of context. OpenCode does timestamp-
based message hiding plus a 5-heading LLM summary. Three different mechanisms, same
need: serialize what survives compression into a portable artifact. The packet is that artifact.
Fresh-session handoff is not compaction. Compaction extends a session; handoff closes
one cleanly and starts the next. The Hermes Issue #20372 framing (April 2026) is right:
when in-place compression starts degrading, the agent should write a compact handoff, end
the session, and resume in fresh context. The packet is what makes that transition cheap.
The mistake is to keep compressing until quality collapses; the fix is to budget for an early,
clean handoff.
One active handoff per branch and topic. Multi-agent coordination breaks down on stale
handoffs more than on bad model output. Always include branch, last_known_good_commit,
and a status of active | superseded | archived. Stale handoffs are archived; only the active
one drives the next session. This is the difference between handoff-as-notes and handoff-as-
state.
Wrap up before 50-75% context, not at the wall. The hand-written-pattern playbook
(CLAUDE.md + HANDOVER.md) reports best results when the session ends at 50-75% con-
text budget instead of 95%. The packet generator runs cleanly before compression artifacts
pollute the source state. Cheap to write while context is intact; expensive when the model is
already losing its place.
AIENGINEERINGFROMSCRATCH.COM 415

MULTI-SESSION HANDOFF
Use It
Production patterns:
• Session-end hook. The runtime fires the generator when the user closes the chat. The
packet goes into outputs/handoff/<session_id>/.
• PR template. The generator’s markdown is also a PR body. Reviewers read it without
opening five other files.
• Cross-agent handoff. Build with one product (Claude Code), continue with another
(Codex). The packet is the lingua franca.
The packet is small, regular, and cheap to produce. The cost saving compounds with every
session.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/40-multi-session-handoff
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engine
ering-from-scratch/tree/main/phases/14-agent-engineering/40-multi-session-handoff/code
1. Add an assumptions_to_validate field that surfaces every assumption the builder logged
but the reviewer did not score above 1.
2. Trim the feedback summary differently for failing runs versus passing ones. Defend the
asymmetry.
3. Include a “questions for the human” list. What is the threshold for a question to make it
into the packet versus into a chat message?
4. Make the generator idempotent: running it twice produces the same packet. What needs
to be stable for that to hold?
5. Add a “next session prereqs” section listing exactly the artifacts the next session must
load before acting.
Key Terms
Term What people say What it actually means
Handoff “Session summary” Generated artifact carrying the seven fields,
packet both markdown and JSON
Next “What to do first” The one concrete step that starts the next
action session
Feedback “Log summary” Last K records plus every non-zero exit
trim
Status “What we did” A document missing next_action; useful, but
report not a handoff
Verdict “Receipt” Path to the verification + review reports for
pointer traceability
Further Reading
• Anthropic, Effective harnesses for long-running agents
AIENGINEERINGFROMSCRATCH.COM 416

MULTI-SESSION HANDOFF
• OpenAI Agents SDK handoffs
• Codex Blog, Codex CLI Context Compaction: Architecture, Configuration, Managing
Long Sessions — POST /v1/responses/compact and local fallback
• Justin3go, Shedding Heavy Memories: Context Compaction in Codex, Claude Code,
OpenCode — three-vendor compaction comparison
• JD Hodges, Claude Handoff Prompt: How to Keep Context Across Sessions (2026) —
CLAUDE.md + HANDOVER.md, 50-75% context budget
• Mervin Praison, Managing Handoffs in Multi-Agent Coding Sessions: Fresh Context
Without Losing Continuity — distributed-systems framing
• Hermes Issue #20372 — automatic fresh-session handoff when compression becomes
risky
• Hermes Issue #499 — Context Compaction Quality Overhaul — handoff-oriented
prompts in Codex CLI
• Microsoft Agent Framework, Compaction
• OpenCode, Context Management and Compaction
• LangChain, Context Engineering for Agents
• Phase 14 · 34 — the state file the generator reads
• Phase 14 · 38 — the verification verdict the packet points at
• Phase 14 · 39 — the reviewer report bundled into the packet
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/14-agent-engineering/40-multi-session-handoff
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/14-agent-engineering/40-multi-session-handoff/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/14-agent-engineering/40-multi-session-handoff
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 417