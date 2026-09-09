---
title: "Initialization Scripts for Agents"
volume: "vol5-agents"
part: "Part III — Agent Engineering"
chapter_number: 84
source_pages: "397-400"
---

# Initialization Scripts for Agents

Initialization Scripts for Agents
Every session that starts cold pays a tax. The agent reads the same files, retries the
same probes, and rediscovers the same paths. An init script pays the tax once and
writes the answers into state.
Type: Build Languages: Python (stdlib) Prerequisites: Phase 14 · 32 (Minimal Workbench),
Phase 14 · 34 (Repo Memory) Time: ~45 minutes
Learning Objectives
• Identify the work an agent should never have to redo per session.
• Build a deterministic init script that probes runtime, dependencies, and repo health.
• Persist the probe result so the agent reads it instead of re-running checks.
• Fail loud, fast, and with one place to look when initialization fails.
The Problem
Open a session. The agent guesses the Python version. Guesses the test command. Lists the
repo root five times to find the entry point. Tries to import a package that is not installed.
Asks the user where the config file lives. By the time it makes a real edit, ten thousand tokens
have gone to setup work that should have been a single script.
The fix is one initialization script that runs before the agent does anything else and writes a
init_report.json the agent reads at startup.
The Concept
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/14-agent-engineering/35-initialization-scripts
What the init script probes
Probe Why it matters
Runtime versions Wrong Python or Node version means silent wrong-version
bugs
Dependency availability A missing package later costs ten times the cost of catching it
now
Test command The agent must know how to verify; if the command is missing
the workbench is broken
Repo paths Hard-coded paths drift; resolve them once and pin
Environment variables Missing OPENAI_API_KEY is a failure surface, not a runtime
mystery
State + board freshness Stale state from a crashed session is a footgun
AIENGINEERINGFROMSCRATCH.COM 391

INITIALIZATION SCRIPTS FOR AGENTS
Probe Why it matters
Last-known-good commit Anchor for the handoff diff at the end of the session
Fail loud, fail fast, fail in one place
A probe failure means halt and surface to the human. No “the agent will figure it out.” The
whole point of init is to refuse to start when the workbench is broken.
Idempotent
Run it twice in a row. The second run should be a no-op except for a fresh timestamp. Idem-
potency is what lets you wire the script into CI, hooks, or a pre-task slash command.
Init versus startup rules
Rules (Phase 14 · 33) describe what must be true to act. Init is the script that establishes
that those rules can be checked. Rules without init become “be careful.” Init without rules
becomes a polished failure.
Interactive figure: wb-init-probes. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/14-
agent-engineering/35-initialization-scripts
Build It
code/main.py implements init_agent.py:
• Five probes: Python version, listed dependencies via importlib.util.find_spec, test
command resolvability, required env vars, state file freshness.
• Each probe returns (name, status, detail).
• The script writes init_report.json with the full probe set and exits non-zero if any block-
severity probe fails.
Run it:
python3 code/main.py
The script prints the table of probes, writes init_report.json, and exits zero on the happy
path or non-zero with a list of failed probes.
Production patterns in the wild
Three patterns separate a useful init script from a ceremony.
Last-known-good commit anchoring. Probe the current commit against a LKG file written
on the last successful merge. If the diff exceeds a budget (default 50 files), refuse to start and
require a human to ratify the new baseline. This is what Cloudflare’s AI Code Review uses to
scope reviewer agents: every review session anchors against the same last-known-good and
never compounds drift across sessions.
Lock files with TTL. Write a prereqs.lock after the first successful probe pass. Subsequent
runs trust the lock for N hours (24h default) and skip the expensive probes. The init script
reads the lock first; if it is fresh and the dependency manifest hash matches, it short-circuits.
AIENGINEERINGFROMSCRATCH.COM 392

INITIALIZATION SCRIPTS FOR AGENTS
This is the same pattern Docker uses for layer caches: idempotent probe + content hash =
skip.
No network, no LLM, no surprises in the hot path. Init probes are deterministic plumbing.
A probe that calls an LLM to classify a failure or that hits an external service to check a license
is not a probe; it is a workflow. If a probe takes longer than three seconds in a dry run, treat
that as a workbench smell and either move it out of init or cache its result.
Use It
In production:
• Claude Code hooks. pre-task hook calls the init script and refuses to launch the agent
if it fails.
• GitHub Actions. A setup-agent job runs the init script; the agent job depends on it.
• Docker entrypoint. The agent container runs the init script before exec-ing the agent
runtime; logs surface on failure.
The init script is portable because it makes no calls to a specific framework. Bash, Make, or
a tasks file can all wrap it.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/35-initialization-scripts
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/14-agent-engineering/35-initialization-scripts/code
1. Add a probe that diffs the current commit against the last-known-good commit and re-
fuses to start if more than 50 files changed.
2. Wire the script to write a prereqs.lock file and refuse to start if the lock is older than
seven days.
3. Add a --fix flag that auto-installs missing dev dependencies but never modifies runtime
dependencies without approval.
4. Move probes from hardcoded functions to a YAML registry. Defend the trade-off.
5. Add a timing budget per probe. A probe that runs longer than three seconds is a work-
bench smell.
Key Terms
Term What people say What it actually means
Probe “A check” A deterministic function returning (name,
status, detail)
Init report “Setup output” JSON written next to state with the probe
results
Idempotent “Safe to re-run” Two runs in a row produce identical reports
modulo timestamp
Fail loud “Don’t swallow” Halt and surface to the human; no silent
fallback
AIENGINEERINGFROMSCRATCH.COM 393

INITIALIZATION SCRIPTS FOR AGENTS
Term What people say What it actually means
Setup tax “Bootstrap cost” The tokens the agent spends per session
rediscovering the obvious
Further Reading
• Anthropic, Effective harnesses for long-running agents
• GitHub Actions, composite actions for setup
• microservices.io, GenAI dev platform: guardrails — pre-commit + CI checks as init
• Augment Code, How to Build Your AGENTS.md (2026) — init expectations
• Codex Blog, Codex CLI Context Compaction — session start as compaction-aware init
• Phase 14 · 33 — the rule set this script enables
• Phase 14 · 34 — the state file this script seeds
• Phase 14 · 38 — the verification gate the init script feeds
• Phase 14 · 40 — the handoff that consumes the init report’s last-known-good
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/14-agent-engineering/35-initialization-scripts
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/14-agent-engineering/35-initialization-scripts/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/14-agent-engineering/35-initialization-scripts
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 394