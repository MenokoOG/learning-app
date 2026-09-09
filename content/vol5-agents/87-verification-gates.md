---
title: "Verification Gates"
volume: "vol5-agents"
part: "Part III — Agent Engineering"
chapter_number: 87
source_pages: "410-413"
---

# Verification Gates

Verification Gates
The agent does not get to mark its own work as done. A verification gate reads the
scope contract, the feedback log, the rule report, and the diff, and answers a single
question: is this task actually complete? If the gate says no, the task is not done,
no matter what the chat says.
Type: Build Languages: Python (stdlib) Prerequisites: Phase 14 · 33 (Rules), Phase 14 · 36
(Scope), Phase 14 · 37 (Feedback) Time: ~55 minutes
Learning Objectives
• Define a verification gate as a deterministic function over workbench artifacts.
• Combine rule report, scope report, feedback records, and diff into a single verdict.
• Emit a verification_report.json the reviewer agent and CI can both read.
• Refuse to advance a task on any block-severity failure, without exception.
The Problem
Agents declare success too easily. Three failure shapes dominate:
• “Looks good.” The model read its own diff and decided it was correct.
• “Tests passed.” Said with confidence. No record of the test actually running.
• “Acceptance met.” Acceptance criteria interpreted loosely enough to mean “anything
resembling done.”
The workbench fix is a single verification gate that reads the artifacts the agent has already
produced and makes the call. The gate is deterministic. The gate is in version control. The
gate is wired into CI. The agent cannot bribe it.
The Concept
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/14-agent-engineering/38-verification-gates
What the gate checks
Check Source artifact Severity
All acceptance feedback_record.jsonl block
commands ran
All acceptance feedback_record.jsonl block
commands exited
zero
AIENGINEERINGFROMSCRATCH.COM 404

VERIFICATION GATES
Check Source artifact Severity
Scope check has scope_report.json block
no forbidden
writes
Scope check has scope_report.json block or warn
no off-scope
writes
All block-severity rule_report.json block
rules pass
No null exit feedback_record.jsonl block
codes in feedback
Touched files both warn
match
scope.allowed_files
A warn finding annotates the verdict; a block finding prevents passed: true.
Deterministic, not probabilistic
The gate must produce the same verdict for the same artifact set every time. No LLM judges.
LLM judges belong on the reviewer side (Phase 14 · 39) where the goal is qualitative evalua-
tion, not status.
One report, one path
The gate emits one verification_report.json per task close-out, written under out-
puts/verification/<task_id>.json. CI consumes the same path. Multiple gates with
different paths fork the source of truth.
Refuse without exception
Block-severity findings cannot be overridden by the agent. They can only be overridden by
a human, with a recorded override_reason and an overridden_by user id. The override is a
signed change, not an agent decision.
Interactive figure: wb-gate-sequence. This one moves. Watch it animate and drag its con-
trols in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/14-
agent-engineering/38-verification-gates
Build It
code/main.py implements:
• A loader for each input artifact, all stubbed locally so the lesson is self-contained.
• A verify(task_id, artifacts) -> VerdictReport pure function.
• A printer that shows the per-check results and the final pass/fail.
• A demo with three task scenarios: clean pass, scope creep, missing acceptance.
Run it:
python3 code/main.py
Output: three verdict reports, each saved next to the script.
AIENGINEERINGFROMSCRATCH.COM 405

VERIFICATION GATES
Production patterns in the wild
Four patterns elevate the gate from “another lint job” to “the deciding edge.”
Defense-in-depth, not single gate. Pre-commit hook → CI status check → pre-tool authz
hook → pre-merge gate. Each layer is deterministic so a failure in one layer is caught by
the next. microservices.io’s March 2026 playbook is explicit: the pre-commit hook is non-
bypassable because, unlike a model-side skill, it does not depend on the agent following in-
structions. The verification gate sits at the CI / pre-merge layer.
Defense by deterministic check, model-judge only for nuance. Anthropic’s 2026 Hybrid
Norm pairing: verifiable rewards (unit tests, schema checks, exit codes) answer “did the code
solve the problem?” — LLM rubrics answer “is the code readable, secure, on-style?” The gate
runs the first class; the reviewer (Phase 14 · 39) runs the second. Mixing them collapses the
signal.
Signed override log, not Slack threads. Every override emits a row in outputs/verification/overrides.jsonl
with: timestamp, finding code, reason, signing user, current HEAD commit. The runtime
refuses any override that lacks the signature; the audit trail is git-tracked. This is the line
between an override policy and an override theater.
Coverage floor as a first-class check. A coverage_report.json feeds a coverage_floor
(default 80%) check. The gate fails if measured coverage drops below the floor or below the
previous merge’s floor by more than 1 percentage point. Without this check, agents quietly
delete tests that fail and the verification reports stay green.
--strict mode promotes warns to blocks. For release branches, ship-blocking PRs, or
post-incident triage, --strict makes every warning a hard fail. The flag is opt-in by branch;
not the global default, because strict-on-everything corrodes day-to-day flow.
Use It
Production patterns:
• CI step. A verify_agent job runs the gate against the agent’s final artifacts. Merge
protection refuses without passed: true.
• Pre-handoff hook. The agent runtime calls the gate before generating the handoff doc.
No green verdict, no handoff.
• Manual triage. Operators read the report when an agent claims success and a human
suspects it.
The gate is the deciding edge in the workbench flow. Every other surface is upstream of it.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/38-verification-gates
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/14-agent-engineering/38-verification-gates/code
1. Add a coverage_floor check: the test command must produce a coverage report with at
least 80%. Decide which artifact carries the floor.
2. Support a --strict mode that promotes every warn to block. Document the cases where
strict mode is the right default.
AIENGINEERINGFROMSCRATCH.COM 406

VERIFICATION GATES
3. Make the gate produce a Markdown summary in addition to JSON. Defend which fields
belong in the summary.
4. Add a time_since_last_human_touch check: any file edited within 60 seconds of a human
keystroke is exempt from off-scope flags.
5. Run the gate on a real agent diff from your product. How many findings are real and
how many are noise? Where does the gate need to grow?
Key Terms
Term What people say What it actually means
Verification “The check that stops things” Deterministic function over workbench
gate artifacts producing a pass/fail verdict
Block “Hard fail” A finding that prevents passed: true and
severity requires a signed override
Override “Why we let it through” Signed entries with reason and user id,
log audited by review
Acceptance “The proof” A shell command whose zero exit is what
command done means
One report “Source of truth” outputs/verification/<task_id>.json,
path consumed by CI and humans alike
Further Reading
• Anthropic, Harness design for long-running application development
• OpenAI Agents SDK guardrails
• microservices.io, GenAI dev platform: guardrails — defense in depth between pre-
commit and CI
• ICMD, The 2026 Playbook for Agentic AI Ops — approval-gate ladder (draft → approval
→ auto under thresholds)
• Type-Checked Compliance: Deterministic Guardrails (arXiv 2604.01483) — Lean 4 as
the upper bound of deterministic gating
• logi-cmd/agent-guardrails — merge gate spec — scope + mutation-testing gates
• Guardrails AI x MLflow — deterministic validators as CI scorers
• Akira, Real-Time Guardrails for Agentic Systems — pre/post-tool gates
• Phase 14 · 27 — prompt injection defenses (the gate’s adversarial pair)
• Phase 14 · 36 — the scope contract this gate enforces
• Phase 14 · 37 — the feedback log this gate scores
• Phase 14 · 39 — the reviewer agent the gate hands off to
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/14-agent-engineering/38-verification-gates
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/14-agent-engineering/38-verification-gates/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/14-agent-engineering/38-verification-gates
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 407