---
title: "Capstone: Ship a Reusable Agent Workbench Pack"
volume: "vol5-agents"
part: "Part III — Agent Engineering"
chapter_number: 91
source_pages: "428-431"
---

# Capstone: Ship a Reusable Agent Workbench Pack

Capstone: Ship a Reusable Agent Work-
bench Pack
The mini-track ends with a pack you drop into any repo. Eleven lessons of surfaces
compressed into a directory you can cp -r and have an agent working reliably the
next morning. The capstone is the artifact this curriculum trades on.
Type: Build Languages: Python (stdlib) Prerequisites: Phases 14 · 31 to 14 · 41 Time: ~75
minutes
Learning Objectives
• Package the seven workbench surfaces into one drop-in directory.
• Pin the schemas, scripts, and templates so a new repo gets a known-good baseline.
• Add a single installer script that lays down the pack idempotently.
• Decide what stays in the pack and what stays out, defending the cut for each.
The Problem
A workbench that lives in a Google Doc, a chat history, and three half-remembered scripts is a
workbench that gets rebuilt every quarter. The cure is a versioned pack: a repo or directory
with the surfaces, the schemas, the scripts, and a one-command installer.
You will end this lesson with outputs/agent-workbench-pack/ shipped on disk and a
bin/install.sh that drops it into any target repo.
The Concept
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/14-agent-engineering/42-agent-workbench-capstone
The pack layout
outputs/agent-workbench-pack/
├── AGENTS.md
├── docs/
│ ├── agent-rules.md
│ ├── reliability-policy.md
│ ├── handoff-protocol.md
│ └── reviewer-rubric.md
├── schemas/
│ ├── agent_state.schema.json
│ ├── task_board.schema.json
│ └── scope_contract.schema.json
AIENGINEERINGFROMSCRATCH.COM 422

CAPSTONE: SHIP A REUSABLE AGENT WORKBENCH PACK
├── scripts/
│ ├── init_agent.py
│ ├── run_with_feedback.py
│ ├── verify_agent.py
│ └── generate_handoff.py
├── bin/
│ └── install.sh
└── README.md
What stays in, what stays out
In:
• Surface schemas. They are the contract.
• The four scripts above. They are the runtime.
• The four docs. They are the rules and the rubric.
Out:
• Project-specific tasks. Tasks belong on the target repo’s board, not in the pack.
• Vendor SDK calls. The pack is framework-agnostic.
• Onboarding prose. The pack lives next to the team’s existing onboarding, not inside it.
The installer
A short bin/install.sh (or bin/install.py):
1. Refuses to install over an existing pack without --force.
2. Copies the pack into the target repo.
3. Wires up CI if a .github/workflows/ exists.
4. Prints next steps: fill in the board, set acceptance commands, run the init script.
Versioning
The pack carries a VERSION file. Schema bumps and script changes that require migrations
bump the major. Doc-only changes bump the patch. The target repo’s agent_state.json
records which pack version it was initialized against.
Interactive figure: wb-pack-install. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/14-
agent-engineering/42-agent-workbench-capstone
Build It
code/main.py assembles the pack into outputs/agent-workbench-pack/ next to the lesson,
seeded with the schemas and scripts from the previous lessons in this mini-track and the
docs you already wrote.
Run it:
python3 code/main.py
The script copies and pins the surfaces, writes the README, prints the pack tree, and exits
zero. Re-running is idempotent.
AIENGINEERINGFROMSCRATCH.COM 423

CAPSTONE: SHIP A REUSABLE AGENT WORKBENCH PACK
Production patterns in the wild
A pack is only valuable if it survives forks, updates, and an unfriendly upstream. Four patterns
make that work.
VERSION is the contract, not the marketing. Major bumps require a state migration. Minor
bumps require a checker re-run. Patch bumps are doc-only. The installer writes .workbench-
version into the target repo on every install; lint_pack.py refuses to ship if the target’s lock
disagrees with the pack’s VERSION. This is how npm, Cargo, and pyproject.toml survive 10
years of churn; nothing about agents changes the rules.
Single source for cross-tool distribution. Nx ships one nx ai-setup that lays down
AGENTS.md, CLAUDE.md, .cursor/rules/, .github/copilot-instructions.md, and an MCP
server from a single config. The pack should do the same; the installer emits the symlinks (ln
-s AGENTS.md CLAUDE.md) so a single source of truth fans out to every coding agent. Forking
the pack to support one tool over another is a failure mode.
uninstall.sh that refuses on non-trivial state. Uninstalling the pack must not delete
the user’s agent_state.json, task_board.json, or outputs/. The uninstaller removes the
schemas, scripts, docs, and AGENTS.md (with --keep-agents-md opt-out) and refuses to proceed
if state files have any uncommitted changes. State belongs to the user; the pack does not own
it.
Skill-as-publishable. SkillKit-style distribution. The pack ships as a SkillKit skill: skil-
lkit install agent-workbench-pack lays it down across 32 AI agents from a single source.
The pack repo is the source of truth; SkillKit is the distribution channel. Vendor lock-in col-
lapses; the seven surfaces stay the same.
Use It
Three places the pack ships:
• As a directory you drop into a repo. cp -r outputs/agent-workbench-pack
/path/to/repo.
• As a public template repo. Fork-and-customize, with VERSION controlling drift.
• As a SkillKit skill. Wired into your agent product so a single command lays it down.
The pack is the recipe. Each install is a serving.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/42-agent-workbench-
capstone
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/42-agent-workbench-
capstone/code
1. Decide which optional fifth doc deserves promotion into the canonical pack. Defend the
cut.
2. Rewrite the installer as Python with a --dry-run flag. Compare ergonomics against bash.
3. Add a bin/uninstall.sh that safely removes the pack and refuses if state files have non-
trivial history. What counts as non-trivial?
AIENGINEERINGFROMSCRATCH.COM 424

CAPSTONE: SHIP A REUSABLE AGENT WORKBENCH PACK
4. Add a lint_pack.py that fails when the pack drifts from VERSION. Wire it into CI for the
pack’s own repo.
5. Author the migration runbook from a hand-rolled workbench to this pack. What is the
order of operations that minimizes downtime?
Key Terms
Term What people say What it actually means
Workbench “The starter kit” A versioned directory carrying all seven
pack surfaces
Installer “Setup script” bin/install.sh that lays the pack down
idempotently
Pack “VERSION” Major bumps for schema/script changes,
version patch for doc-only
Drop-in “cp -r and go” Pack works without per-repo customization
pack on day one
Forkable “GitHub template” Public repo that GitHub’s “Use this template”
template can clone from
Further Reading
• Phases 14 · 31 to 14 · 41 — every surface this pack bundles
• SkillKit — install this skill across 32 AI agents
• Nx Blog, Teach Your AI Agent How to Work in a Monorepo — single-source generator
across six tools
• agents.md — the open spec — what your pack’s router must implement
• HKUDS/OpenHarness — reference implementation of a pack-equivalent
• andrewgarst/agentic_harness — Redis-backed reference with eval suite
• Augment Code, A good AGENTS.md is a model upgrade — pack docs quality bar
• Anthropic, Effective harnesses for long-running agents
• Anthropic, Harness design for long-running application development
• Phase 14 · 30 — eval-driven agent development that consumes the pack’s verification
gate
• Phase 14 · 41 — the before/after benchmark this pack improves on
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/14-agent-engineering/42-agent-workbench-capstone
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/14-agent-engineering/42-agent-workbench-capstone/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/14-agent-engineering/42-agent-workbench-capstone
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 425