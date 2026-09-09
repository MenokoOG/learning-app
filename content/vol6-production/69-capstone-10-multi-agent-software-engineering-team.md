---
title: "Capstone 10 — Multi-Agent Software Engineering Team"
volume: "vol6-production"
part: "Part III — Capstone Projects"
chapter_number: 69
source_pages: "304-308"
---

# Capstone 10 — Multi-Agent Software Engineering Team

Capstone 10 — Multi-Agent Software En-
gineering Team
The 2026 shape of a multi-agent engineering team has converged: an architect
plans, N coders work in parallel worktrees, a reviewer gates, a tester verifies. SWE-
AF’s factory architecture, MetaGPT’s role-based prompting, AutoGen 0.4’s typed
actor graph, Cognition’s Devin, and Factory’s Droids all landed on it independently.
Parallel worktrees convert wall-clock into throughput. Shared state and handoff
protocols become the failure surface. The capstone is to build the team, evaluate
on SWE-bench Pro, and report which handoffs break and how often.
Type: Capstone Languages: Python / TypeScript (agents), Shell (worktree scripts) Prereq-
uisites: Phase 11 (LLM engineering), Phase 13 (tools), Phase 14 (agents), Phase 15 (au-
tonomous), Phase 16 (multi-agent), Phase 17 (infrastructure) Phases exercised: P11 · P13 ·
P14 · P15 · P16 · P17 Time: 40 hours
Problem
Single-agent coding harnesses hit a ceiling on large tasks. Not because any individual agent
is weak, but because a 200k-token context cannot hold an architecture plan plus four parallel
codebase slices plus reviewer commentary plus test output. Multi-agent factories split the
problem: an architect owns the plan, coders own implementation in parallel worktrees, a re-
viewer gates, a tester verifies. SWE-AF’s “factory” architecture, MetaGPT’s roles, AutoGen’s
typed actor graph — all three framings describe the same shape.
The failure surface is the handoff. Architect plans something the coders cannot implement.
Coders produce conflicting diffs. Reviewer approves a hallucinated fix. Tester races a still-
writing coder. You will build one of these teams, run it on 50 SWE-bench Pro issues, track
every handoff, and publish the post-mortem.
Concept
Roles are typed agents. Architect (Claude Opus 4.7) reads the issue, writes a plan, and
breaks it into subtasks with explicit interfaces. Coders (Claude Sonnet 4.7, N parallel in-
stances, each in a git worktree + Daytona sandbox) implement subtasks independently. Re-
viewer (GPT-5.4) reads the merged diff and either approves or requests specific changes.
Tester (Gemini 2.5 Pro) runs the test suite in isolation and reports pass/fail with artifacts.
Communication is through a shared task board (file-backed or Redis). Each role consumes
tasks it is permitted to handle. Handoffs are A2A-protocol-typed messages. Coordination
concerns: merge-conflict resolution (coordinator role or automatic three-way merge), shared-
state synchronization (the plan is frozen once coders start; replans are separate events), and
reviewer gatekeeping (the reviewer cannot approve its own changes or changes it proposed).
Token amplification is the hidden cost. Every role boundary adds summary prompts and
handoff context. A 40-turn single-agent run becomes 160 total turns across four roles. The
AIENGINEERINGFROMSCRATCH.COM 297

CAPSTONE 10 — MULTI-AGENT SOFTWARE ENGINEERING TEAM
rubric specifically weighs token efficiency vs single-agent baseline because the question is
not “does multi-agent work” but “does it win per dollar.”
Architecture
GitHub issue URL
|
v
Architect (Opus 4.7)
reads issue, produces plan with subtasks + interfaces
|
v
Task board (file / Redis)
|
+-- subtask 1 ---+-- subtask 2 ---+-- subtask 3 ---+-- subtask 4 ---+
v v v v v
Coder A Coder B Coder C Coder D (4 parallel)
(Sonnet) (Sonnet) (Sonnet) (Sonnet)
worktree A worktree B worktree C worktree D
Daytona Daytona Daytona Daytona
| | | |
+--------+-------+-------+--------+
v
merge coordinator (three-way merge + conflict resolution)
|
v
Reviewer (GPT-5.4)
|
v
Tester (Gemini 2.5 Pro) -> passes? -> open PR
-> fails? -> route back to coder
Stack
• Orchestration: LangGraph with shared state + per-agent sub-graphs
• Messaging: A2A protocol (Google 2025) for typed inter-agent messages
• Models: Opus 4.7 (architect), Sonnet 4.7 (coders), GPT-5.4 (reviewer), Gemini 2.5 Pro
(tester)
• Worktree isolation: git worktree add per coder + Daytona sandbox
• Merge coordinator: custom three-way merge + LLM-mediated conflict resolution
• Eval: SWE-bench Pro (50 issues), SWE-AF scenarios, HumanEval++ for unit tests
• Observability: Langfuse with role-tagged spans, per-agent token accounting
• Deployment: K8s with each role as a separate Deployment + HPA on backlog
Interactive figure: ce-team-handoff. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/19-
capstone-projects/10-multi-agent-software-team
AIENGINEERINGFROMSCRATCH.COM 298

CAPSTONE 10 — MULTI-AGENT SOFTWARE ENGINEERING TEAM
Build It
1. Task board. File-backed JSONL with typed messages: plan_request, subtask,
diff_ready, review_needed, test_needed, approved, rejected, replan_needed. Agents
subscribe to tags.
2. Architect. Reads the GitHub issue, runs Opus 4.7 with a plan template requiring explicit
subtask interfaces (files touched, public functions, test impact). Emits one plan_request
with a DAG of subtasks.
3. Coders. N parallel workers, each claims one subtask from the board. Each spawns a
fresh git worktree add branch plus a Daytona sandbox. Implements the subtask. Emits
diff_ready with the patch + test deltas.
4. Merge coordinator. On all-coders-done, three-way merges the N branches into a stag-
ing branch. LLM-mediated conflict resolution only when file-level overlap exists.
5. Reviewer. GPT-5.4 reads the merged diff. Cannot approve diffs it authored. Emits
approved (no-op) or review_feedback with specific change requests routed back to the
relevant coder.
6. Tester. Gemini 2.5 Pro runs the test suite in a clean sandbox. Captures artifacts. Emits
test_passed or test_failed with stacktraces. Failed tests loop back to the coder owning
the failing subtask.
7. Handoff accounting. Every message crossing a role boundary gets a span in Lang-
fuse with payload size and model used. Compute per-subtask token amplification
(coder_tokens + reviewer_tokens + tester_tokens + architect_share / coder_tokens).
8. Eval. Run on 50 SWE-bench Pro issues. Compare pass@1 and $-per-solved-issue against
a single-agent baseline (one Sonnet 4.7 in a single worktree).
9. Post-mortem. For each failed issue, identify the handoff that broke (plan too vague,
merge conflict, reviewer false-approve, tester flake). Produce a handoff-failure his-
togram.
Use It
$ team run --issue https://github.com/acme/widget/issues/842
[architect] plan: 4 subtasks (parser, cache, api, migration)
[board] dispatched to 4 coders in parallel worktrees
[coder-A] subtask parser -> 42 lines, tests pass locally
[coder-B] subtask cache -> 88 lines, tests pass locally
[coder-C] subtask api -> 31 lines, tests pass locally
[coder-D] subtask migration -> 19 lines, tests pass locally
[merge] 3-way merge: 0 conflicts
[reviewer] comments on cache (thread pool sizing); routed to coder-B
[coder-B] revision: 92 lines; submits
[reviewer] approved
[tester] all 412 tests pass
[pr] opened #3382 4 coders, 1 revision, $4.90, 18m
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/19-capstone-projects/10-multi-agent-software-
team
AIENGINEERINGFROMSCRATCH.COM 299

CAPSTONE 10 — MULTI-AGENT SOFTWARE ENGINEERING TEAM
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/19-capstone-projects/10-multi-agent-software-
team/code
1. Inject an obvious bug into a diff mid-run (extra return None before the main body). Mea-
sure the reviewer’s false-approve rate. Tune the reviewer prompt until false-approval is
under 5%.
2. Reduce to two coders (architect + coder + reviewer + tester, coder runs two subtasks
sequentially). Compare wall-clock and pass rate.
3. Replace the merge coordinator with a single-writer constraint (subtasks touch disjoint
file sets). Measure the planning burden on the architect.
4. Swap reviewer from GPT-5.4 to Claude Opus 4.7. Measure false-approval rate and token
cost delta.
5. Add a fifth role: documenter (Haiku 4.5). After review, it produces a changelog entry.
Measure whether documentation quality justifies the extra token spend.
Key Terms
Term What people say What it actually means
Parallel “Isolated branch” git worktree add producing a fresh
worktree working tree per coder
Task board “Shared message bus” File or Redis store of typed messages agents
subscribe to
Handoff “Role boundary” Any message crossing from one role’s
context to another’s
Token am- “Multi-agent overhead” Total tokens across roles / single-agent
plification tokens for the same task
A2A “Agent-to-agent” Google’s 2025 spec for typed inter-agent
protocol messages
Merge co- “Integrator” Component that runs three-way merge and
ordinator mediates conflicts
False “Reviewer hallucination” Reviewer approves a diff with known bugs
approval
Further Reading
• SWE-AF factory architecture — the reference 2026 multi-agent factory
• MetaGPT — role-based multi-agent framework
• AutoGen v0.4 — Microsoft’s typed actor framework
• Cognition AI (Devin) — reference product
• Factory Droids — alternate reference product
• Google A2A protocol — inter-agent messaging spec
• git worktree documentation — the isolation substrate
• SWE-bench Pro — the evaluation target
Continue online. The living edition of this chapter has more than the page can hold:
AIENGINEERINGFROMSCRATCH.COM 300

CAPSTONE 10 — MULTI-AGENT SOFTWARE ENGINEERING TEAM
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/19-capstone-projects/10-multi-agent-software-team
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/19-capstone-projects/10-multi-agent-software-team/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/19-capstone-projects/10-multi-agent-software-team
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 301