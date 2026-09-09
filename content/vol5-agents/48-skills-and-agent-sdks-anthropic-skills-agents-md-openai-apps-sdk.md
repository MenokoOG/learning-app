---
title: "Skills and Agent SDKs — Anthropic Skills, AGENTS.md, OpenAI Apps SDK"
volume: "vol5-agents"
part: "Part II — Tools & Protocols"
chapter_number: 48
source_pages: "241-245"
---

# Skills and Agent SDKs — Anthropic Skills, AGENTS.md, OpenAI Apps SDK

Skills and Agent SDKs — Anthropic
Skills, AGENTS.md, OpenAI Apps SDK
MCP says “what tools exist.” Skills say “how to do a task.” The 2026 stack layers
both. Anthropic’s Agent Skills (open standard, December 2025) ship as SKILL.md
with progressive disclosure. OpenAI’s Apps SDK is MCP plus widget metadata.
AGENTS.md (now in 60,000+ repos) sits at the repo root as project-level agent
context. This lesson names what each covers and builds a minimal SKILL.md +
AGENTS.md bundle that travels across agents.
Type: Learn Languages: Python (stdlib, SKILL.md parser and loader) Prerequisites: Phase
13 · 07 (MCP server) Time: ~45 minutes
Learning Objectives
• Distinguish the three layers: AGENTS.md (project context), SKILL.md (reusable know-
how), MCP (tools).
• Write a SKILL.md with YAML frontmatter and progressive disclosure.
• Load skills filesystem-style into an agent runtime.
• Compose a skill with an MCP server and an AGENTS.md so one package works in Claude
Code, Cursor, and Codex.
The Problem
An engineer distills a release-notes-writing workflow into a multi-step prompt: “Read the
latest merged PRs. Group by area. Summarize each. Write a changelog entry following the
team’s style. Post to Slack draft.” They put it in a Notion doc for their team.
Now they want to use this workflow from Claude Code, Cursor, and Codex CLI. Each agent
has a different way to load instructions: Claude Code slash-commands, Cursor rules, Codex
.codex.md. The engineer copies the workflow three times and maintains three copies.
AGENTS.md and SKILL.md together fix this:
• AGENTS.md sits at the repo root. Every compatible agent reads it on session start.
“How does this project work? What are the conventions? Which commands run tests?”
• SKILL.md is a portable bundle: YAML frontmatter (name, description) + markdown
body + optional resources. Agents that support skills load them by name on demand.
• MCP (Phase 13 · 06-14) handles the tools the skill needs to invoke.
Three layers, one portable artifact.
AIENGINEERINGFROMSCRATCH.COM 235

SKILLS AND AGENT SDKS — ANTHROPIC SKILLS, AGENTS.MD, OPENAI APPS SDK
The Concept
AGENTS.md (agents.md)
Launched late 2025, adopted by 60,000+ repos by April 2026. One file at repo root. Format:
# Project: my-service
## Conventions
- TypeScript with strict mode.
- Use Pydantic for models on the Python side.
- Tests run with `pnpm test`.
## Build and run
- `pnpm dev` for local dev server.
- `pnpm build` for production bundle.
Agents read this on session start and use it to calibrate their behavior for that project. Every
coding agent in 2026 supports AGENTS.md: Claude Code, Cursor, Codex, Copilot Workspace,
opencode, Windsurf, Zed.
SKILL.md format
Anthropic’s Agent Skills (released as an open standard December 2025):
---
name: release-notes-writer
description: Write a changelog entry for the latest merged PRs following this project's style.
---
# Release notes writer
When invoked, run these steps:
1. List PRs merged since the last tag. Use `gh pr list --base main --state merged`.
2. Group by label: feature, fix, chore, docs.
3. For each PR in each group, write one line: `- <title> (#<num>)`.
4. Draft the release notes and stage them in CHANGELOG.md.
If the user says "ship", run `git tag vX.Y.Z` and `gh release create`.
## Notes
- Never include commits without a PR.
- Skip "chore" entries from the public changelog.
Frontmatter declares the skill’s identity. The body is the prompt shown to the model when
the skill loads.
Progressive disclosure
Skills can reference sub-resources that the agent fetches only when needed. Example:
skills/
release-notes-writer/
SKILL.md
AIENGINEERINGFROMSCRATCH.COM 236

SKILLS AND AGENT SDKS — ANTHROPIC SKILLS, AGENTS.MD, OPENAI APPS SDK
style-guide.md
template.md
scripts/
generate.sh
SKILL.md says “see style-guide.md for the style rules.” The agent pulls style-guide.md only
when the skill is actively running. This avoids bloating the prompt with detail the model may
not need.
Filesystem discovery
Agent runtimes scan known directories for SKILL.md files:
• ~/.anthropic/skills/*/SKILL.md
• Project ./skills/*/SKILL.md
• ~/.claude/skills/*/SKILL.md
Loading is by folder name and frontmatter name. Claude Code, Anthropic Claude Agent SDK,
and SkillKit (cross-agent) all follow this pattern.
Anthropic Claude Agent SDK
@anthropic-ai/claude-agent-sdk (TypeScript) and claude-agent-sdk (Python) load skills at
session start, expose them as callable “agents” inside the runtime. The agent loop dispatches
to a skill when the user invokes it.
OpenAI Apps SDK
Launched October 2025; built directly on MCP. Unifies OpenAI’s prior Connectors and Custom
GPT Actions under a single developer surface. An Apps SDK app is:
• An MCP server (tools, resources, prompts).
• Plus widget metadata for ChatGPT’s UI.
• Plus an optional MCP Apps ui:// resource for interactive surfaces.
Same protocol, richer UX.
Cross-agent portability via SkillKit
Tools like SkillKit and similar cross-agent distribution layers translate a single SKILL.md into
the native format of each of 32+ AI agents (Claude Code, Cursor, Codex, Gemini CLI, Open-
Code, etc.). One source of truth; many consumers.
The three-layer stack
Layer File Loaded when Purpose
AGENTS.md repo root session start project-level
conventions
SKILL.md skills skill invoked reusable workflow
directory
MCP server external tools needed callable actions
process
AIENGINEERINGFROMSCRATCH.COM 237

SKILLS AND AGENT SDKS — ANTHROPIC SKILLS, AGENTS.MD, OPENAI APPS SDK
All three compose: the agent reads AGENTS.md on session start, the user invokes a skill, the
skill’s instructions include MCP tool calls, the agent dispatches via an MCP client.
Interactive figure: t3-skill-layers. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/13-tools-
and-protocols/22-skills-and-agent-sdks
Use It
code/main.py ships a stdlib SKILL.md parser and loader. It discovers skills under ./skills/,
parses the YAML frontmatter plus markdown body, and produces a dict keyed by skill name.
It then simulates an agent loop that invokes release-notes-writer by name.
What to look at:
• YAML frontmatter parsed with a minimal stdlib parser (no pyyaml dependency).
• Skill body stored verbatim; agent prepends it to the system prompt on invocation.
• Progressive disclosure demoed via a read_subresource function that pulls referenced
files on demand.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/13-tools-and-protocols/22-skills-and-agent-sdks
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engine
ering-from-scratch/tree/main/phases/13-tools-and-protocols/22-skills-and-agent-sdks/code
1. Run code/main.py. Add a second skill under skills/ and confirm the loader picks it up.
2. Write an AGENTS.md for this course repo. Include testing commands, style conventions,
and the Phase 13 mental model.
3. Port a multi-step workflow from your team’s internal docs into a SKILL.md. Verify it
loads in Claude Code.
4. Translate the skill into Cursor’s and Codex’s native rule formats by hand. Count the diff
between formats — this is the translation surface SkillKit automates.
5. Read the Anthropic Agent Skills blog post. Identify one feature in the Claude Agent SDK
that this lesson’s loader does not cover. (Hint: agent sub-invocation.)
Key Terms
Term What people say What it actually means
SKILL.md “The skill file” YAML frontmatter plus markdown body,
loaded by agent runtime
AGENTS.md “Repo-root agent context” Project-level conventions file read on session
start
Progressive “Lazy-load sub-resources” Skill body references files pulled only when
disclosure needed
Frontmatter “YAML block at top” Metadata (name, description) in ---
delimiters
AIENGINEERINGFROMSCRATCH.COM 238

SKILLS AND AGENT SDKS — ANTHROPIC SKILLS, AGENTS.MD, OPENAI APPS SDK
Term What people say What it actually means
Claude “Anthropic’s skill runtime” @anthropic-ai/claude-agent-sdk, loads
Agent SDK skills and routes
OpenAI “MCP + widget meta” OpenAI’s dev surface built on MCP plus
Apps SDK ChatGPT UI hooks
Skill “Filesystem scan” Walk known dirs for SKILL.md, key by name
discovery
Cross- “One skill many agents” Translate one SKILL.md to 32+ agents via
agent SkillKit-style tools
portability
Agent Skill “Portable know-how” Reusable task template outside MCP’s tool
concept
Apps SDK “MCP plus ChatGPT UI” Connectors and Custom GPTs unified on MCP
Further Reading
• Anthropic — Agent Skills announcement — December 2025 launch
• Anthropic — Agent Skills docs — SKILL.md format reference
• OpenAI — Apps SDK — MCP-based developer platform for ChatGPT
• agents.md — AGENTS.md format and adoption list
• Anthropic — anthropics/skills GitHub — official skill examples
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/13-tools-and-protocols/22-skills-and-agent-sdks
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/13-tools-and-protocols/22-skills-and-agent-sdks/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 239