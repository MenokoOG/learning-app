---
title: "Capstone 16 — GitHub Issue-to-PR Autonomous Agent"
volume: "vol6-production"
part: "Part III — Capstone Projects"
chapter_number: 75
source_pages: "331-335"
---

# Capstone 16 — GitHub Issue-to-PR Autonomous Agent

Capstone 16 — GitHub Issue-to-PR Au-
tonomous Agent
Label an issue, get a PR — the 2026 product shape for autonomous coding agents:
run an agent in a cloud sandbox, verify tests pass, and post a review-ready PR with
rationale. AWS Remote SWE Agents, Cursor Background Agents, OpenAI Codex
cloud, and Google Jules all ship it. The hard parts are reproducing the repo’s build
environment automatically, preventing credential leakage, enforcing per-repo bud-
gets, and making sure the agent cannot force-push. This capstone builds the self-
hosted version and compares it on cost and pass rate to the hosted alternatives.
Type: Capstone Languages: Python (agent), TypeScript (GitHub App), YAML (Actions) Pre-
requisites: Phase 11 (LLM engineering), Phase 13 (tools), Phase 14 (agents), Phase 15 (au-
tonomous), Phase 17 (infrastructure) Phases exercised: P11 · P13 · P14 · P15 · P17 Time:
30 hours
Problem
The async cloud coding agent is a separate product category from interactive coding agents
(capstone 01). The UX is a GitHub label. You label an issue @agent fix this, a worker
spins up in a cloud sandbox, clones the repo, runs tests, edits files, verifies, and opens a PR
with the agent’s rationale in the body. No interactive loop, no terminal. AWS Remote SWE
Agents, Cursor Background Agents, OpenAI Codex cloud, Google Jules, and Factory Droids
all converge on this.
The engineering challenges are concrete: environment reproduction (the agent has to build
the repo from scratch without a cached dev image), flaky tests (must be re-run or isolated),
credential scoping (a GitHub App with minimal fine-grained permissions), budget enforce-
ment per repo per day, and no-force-push policy. The capstone measures pass rate, cost, and
safety vs the hosted alternatives.
Concept
The trigger is a GitHub webhook (issue label or PR comment). A dispatcher enqueues work
to ECS Fargate or Lambda. The worker pulls the repo into a Daytona or E2B sandbox with
a generic Dockerfile inferred from the repo (language, framework). The agent runs a mini-
swe-agent or SWE-agent v2 loop against Claude Opus 4.7 or GPT-5.4-Codex. It iterates: read
code, propose fix, apply patch, run tests.
Verification is the gating step. Full CI must pass in the sandbox before the PR opens. Coverage
delta is computed; if negative beyond a threshold, the PR opens but gets labeled needs-review.
The agent posts the rationale as the PR description plus an @agent thread the reviewer can
ping for follow-ups.
Safety is scoped through two different GitHub surfaces: the App provides a short-lived instal-
lation token with workflows: read and narrow repo contents/PR scopes; branch protection
(not app permissions) enforces “no direct writes to main” and “no force-push” — the app is
AIENGINEERINGFROMSCRATCH.COM 324

CAPSTONE 16 — GITHUB ISSUE-TO-PR AUTONOMOUS AGENT
never added to the bypass list. Path-scoped read-only access to .github/workflows is not a
real GitHub App primitive, so the agent’s allow-list on file edits has to enforce that at the
worker. Budget ceilings per repo per day are enforced at the dispatcher (e.g., max 5 PRs per
repo per day, $20 per PR).
Architecture
GitHub issue labeled `@agent fix` or PR comment
|
v
GitHub App webhook -> AWS Lambda dispatcher
|
v
ECS Fargate task (or GitHub Actions self-hosted runner)
- pull repo
- infer Dockerfile (language, package manager)
- Daytona / E2B sandbox with target runtime
- clone -> git worktree -> agent branch
|
v
mini-swe-agent / SWE-agent v2 loop
Claude Opus 4.7 or GPT-5.4-Codex
tools: ripgrep, tree-sitter, read/edit, run_tests, git
|
v
verify CI passes in-sandbox + coverage delta check
|
v (verified)
git push + open PR via GitHub App
PR body = rationale + diff summary + trace URL
label: needs-review
|
v
operator reviews; can @-mention agent for follow-ups
Stack
• Trigger: GitHub App with fine-grained token; webhook receiver via Lambda or Fly.io
• Worker: ECS Fargate task (or GitHub Actions self-hosted runner)
• Sandbox: Daytona devcontainer or E2B sandbox per task
• Agent loop: mini-swe-agent baseline or SWE-agent v2 over Claude Opus 4.7 / GPT-5.4-
Codex
• Retrieval: tree-sitter repo-map + ripgrep
• Verification: full CI in-sandbox + coverage delta gate
• Observability: Langfuse with per-PR trace archive linked from the PR body
• Budget: per-repo daily dollar ceiling; max PRs per repo per day
Interactive figure: cf-issue-to-pr. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/19-
capstone-projects/16-github-issue-to-pr-agent
AIENGINEERINGFROMSCRATCH.COM 325

CAPSTONE 16 — GITHUB ISSUE-TO-PR AUTONOMOUS AGENT
Build It
1. GitHub App. Fine-grained installation token: issues read+write, pull_requests write,
contents read+write, workflows read. Branch protection (the only surface that can do
this) enforces “no direct push to main” and “no force-push”; the app is not in the bypass
list. The worker enforces “no writes under .github/workflows” as an allow-list check on
the proposed diff, since GitHub App permissions are not path-scoped.
2. Webhook receiver. Lambda function accepts issue label / PR comment webhooks. Fil-
ters by label @agent fix this. Enqueues to SQS.
3. Dispatcher. Pops tasks from SQS. Enforces per-repo per-day budget. Spins up an ECS
Fargate task with the repo URL, issue body, and a fresh Daytona sandbox.
4. Environment inference. Detect language (Python, Node, Go, Rust) and package man-
ager (uv, pnpm, go mod, cargo). Generate a Dockerfile on the fly if one does not exist.
5. Agent loop. mini-swe-agent or SWE-agent v2 with Claude Opus 4.7. Tools: ripgrep,
tree-sitter repo-map, read_file, edit_file, run_tests, git. Hard limits: $20 cost, 30 min
wall-clock, 30 agent turns.
6. Verification. After the loop concludes, run the full test suite in-sandbox. Compute
coverage delta via jacoco / coverage.py. If CI red: halt, do not open PR. If coverage
drops more than 2%: open PR with needs-review label.
7. PR posting. Push the agent branch. Open PR via GitHub API with: title, rationale, diff
summary, trace URL, cost, turns.
8. Credential hygiene. Worker runs with a short-lived GitHub App installation token.
Logs are scrubbed for secrets before archival.
9. Eval. 30 seeded internal issues of varying difficulty. Measure pass rate, PR quality (diff
size, style, coverage), cost, latency. Compare with Cursor Background Agents and AWS
Remote SWE Agents on the same issues.
Use It
# on github.com
- user labels issue #842 with `@agent fix this`
- PR #1903 appears 14 minutes later
- body:
> Fixed NPE in widget.dedupe() caused by null comparator entry.
> Added regression test widget_test.go::TestDedupeNullComparator.
> Coverage delta: +0.12%
> Turns: 7 Cost: $1.80 Trace: langfuse:...
> Label: needs-review
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/19-capstone-projects/16-github-issue-to-pr-
agent
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engine
ering-from-scratch/tree/main/phases/19-capstone-projects/16-github-issue-to-pr-agent/code
AIENGINEERINGFROMSCRATCH.COM 326

CAPSTONE 16 — GITHUB ISSUE-TO-PR AUTONOMOUS AGENT
1. Add a “fix flaky test” mode: the label @agent stabilize-flake TestX runs the test 50
times in-sandbox and proposes a minimal change that stabilizes it.
2. Compare cost vs Cursor Background Agents on three shared issues. Report which tools
win where.
3. Implement a budget dashboard: per-repo per-day cost, per-user cost. Alert on anomaly.
4. Build a “dry-run” mode that opens a draft PR without running CI, so reviewers can ex-
amine the plan cheap.
5. Add a retention policy: PR branches older than 7 days without merge get deleted auto-
matically.
Key Terms
Term What people say What it actually means
GitHub “Scoped bot identity” App with fine-grained permissions +
App short-lived installation token
Async “Background agent” Non-interactive worker that runs in a cloud
cloud sandbox, not a terminal
agent
Environment “Dockerfile synthesis” Detect language + package manager,
inference generate a Dockerfile if absent
Verification “CI-in-sandbox” Run the full test suite inside the worker
before opening a PR
Coverage “Coverage preservation” Change in test coverage % from base to
delta agent branch
Per-repo “Daily ceiling” Dollar and PR-count cap enforced at the
budget dispatcher
Rationale “PR body explanation” Agent’s summary of what changed and why;
required in the PR body
Further Reading
• AWS Remote SWE Agents — the canonical async cloud agent reference
• SWE-agent — CLI reference
• Cursor Background Agents — commercial alternative
• OpenAI Codex (cloud) — hosted competitor
• Google Jules — Google’s hosted version
• Factory Droids — alternate commercial reference
• GitHub App documentation — scoped bot identity
• Daytona cloud sandboxes — reference sandbox
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/19-capstone-projects/16-github-issue-to-pr-agent
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/19-capstone-projects/16-github-issue-to-pr-agent/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/19-capstone-projects/16-github-issue-to-pr-agent
AIENGINEERINGFROMSCRATCH.COM 327

CAPSTONE 16 — GITHUB ISSUE-TO-PR AUTONOMOUS AGENT
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 328