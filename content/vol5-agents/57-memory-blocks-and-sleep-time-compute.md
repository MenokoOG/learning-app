---
title: "Memory Blocks and Sleep-Time Compute"
volume: "vol5-agents"
part: "Part III — Agent Engineering"
chapter_number: 57
source_pages: "280-283"
---

# Memory Blocks and Sleep-Time Compute

Memory Blocks and Sleep-Time Com-
pute
Discrete functional memory blocks the model can edit directly, and a sleep-time
agent that consolidates memory asynchronously while the primary agent is idle.
These two ideas are how you scale memory beyond one conversation.
Type: Build Languages: Python (stdlib) Prerequisites: Phase 14 · 07 (MemGPT) Time:
~75 minutes
Learning Objectives
• Name the three memory tiers Letta uses (core, recall, archival) and the role of each.
• Explain the memory-block pattern: Human block, Persona block, and user-defined blocks
as first-class typed objects.
• Describe what sleep-time compute is, why it sits off the critical path, and why it can run
a stronger model than the primary agent.
• Implement a scripted two-agent loop where a primary agent serves responses and a
sleep-time agent consolidates blocks between turns.
The Problem
MemGPT (Lesson 07) solved the virtual-memory control flow. Three production problems
emerged:
1. Latency. Every memory operation sits on the critical path. If the agent has to prune,
summarize, or reconcile while the user waits, tail latency blows up.
2. Memory rot. Writes accumulate. Contradicted facts stay. Retrieval drowns in stale
content.
3. Structure loss. A flat archival store cannot express “the Human block is always in the
prompt; the Persona block is always in the prompt; the Task block swaps per session.”
Letta (letta.com) is the platform name the original MemGPT project adopted in 2024 — the
paper’s pattern keeps the MemGPT name — and the 2026 Letta V1 rewrite is a later, separate
step. Memory blocks make structure explicit; sleep-time compute moves consolidation off the
critical path.
The Concept
Three tiers
AIENGINEERINGFROMSCRATCH.COM 274

MEMORY BLOCKS AND SLEEP-TIME COMPUTE
Tier Scope Where it lives Written by
Core Always visible Inside the main prompt Agent tool call +
sleep-time rewrites
Recall Conversation Retrievable Automatic turn logging
history
Archival Arbitrary facts Vector + KV + graph Agent tool call +
sleep-time ingest
Core is the MemGPT core. Recall is the conversation buffer with its evicted tail. Archival is
the external store. The split cleans up MemGPT’s two-tier overloading.
Memory blocks
A block is a typed, persistent, editable section of the core tier. The original MemGPT paper
defined two:
• Human block — facts about the user (name, role, preferences, goals).
• Persona block — the agent’s self-concept (identity, tone, constraints).
Letta generalizes to arbitrary user-defined blocks: a Task block for the current goal, a Project
block for codebase facts, a Safety block for hard constraints. Each block has an id, label,
value, limit (character cap), description (so the model knows when to edit it).
Blocks are editable via the tool surface:
• block_append(label, text)
• block_replace(label, old, new)
• block_read(label)
• block_summarize(label) — condense a block that is near its limit.
Sleep-time compute
The 2025 Letta addition: run a second agent in background, off the critical path. Sleep-time
agents process conversation transcripts and codebase context, write learned_context into
shared blocks, and consolidate or invalidate archival records.
Properties that fall out:
• No latency cost. Primary responses do not wait for memory ops.
• Stronger model allowed. The sleep-time agent can be a more expensive, slower model
because it is not latency-constrained.
• Natural consolidation window. Dedup, summarize, invalidate contradicted facts when
the user is not waiting.
The shape matches how humans work: you do the task, you sleep on it, the long-term memory
settles overnight.
Native reasoning
Letta V1 (letta_v1_agent, 2026) deprecates send_message/heartbeat and inline Thought: to-
kens in favor of native reasoning. The Responses API (OpenAI) and the Messages API with
extended thinking (Anthropic) emit reasoning on a separate channel, passed through turns
(encrypted across providers in production). The control loop is still ReAct. The thought trace
is structural, not prompt-shaped.
AIENGINEERINGFROMSCRATCH.COM 275

MEMORY BLOCKS AND SLEEP-TIME COMPUTE
Where this pattern goes wrong
• Block bloat. Infinite block_append hits the limit fast. Wire a block summarizer before
the write that pushes over the cap.
• Silent drift. Sleep-time agent rewrites a block and the primary agent never notices.
Version blocks and surface diffs in the trace.
• Poisoned consolidation. Sleep-time agent processes attacker-reachable content into
core. Lesson 27 applies to the sleep-time surface too.
Interactive figure: memory-blocks. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/14-
agent-engineering/08-memory-blocks-sleep-time-compute
Build It
code/main.py implements:
• Block — id, label, value, limit, description.
• BlockStore — CRUD + near_limit(label) helper.
• Two scripted agents — PrimaryAgent serves a turn, SleepTimeAgent consolidates be-
tween turns.
• A trace that shows a three-turn conversation with block writes, plus a sleep-time pass
that summarizes a block and invalidates a stale fact.
Run it:
python3 code/main.py
The transcript shows the split: primary turns are fast and produce raw writes; the sleep pass
compacts and cleans up.
Use It
• Letta (letta.com) for the reference implementation. Self-host or managed cloud.
• Claude Agent SDK skills as block-shaped knowledge — a skill is a named, versioned,
retrievable block of instructions the agent loads on demand.
• Custom builds for teams that want control over the storage backend. Use the Letta
API contract so you can migrate later.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/08-memory-blocks-sleep-
time-compute
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/08-memory-blocks-sleep-
time-compute/code
1. Add a block_summarize tool that replaces the block value with a model-generated sum-
mary when near_limit returns true. Which trigger threshold minimizes both summa-
rization calls and block overflow?
AIENGINEERINGFROMSCRATCH.COM 276

MEMORY BLOCKS AND SLEEP-TIME COMPUTE
2. Implement sleep-time dedup over archival: two records whose text has >90% token
overlap collapse to one. Do it only in the sleep pass, never on the critical path.
3. Version blocks. On every write record the old value and a diff. Expose block_history(label)
so operators can debug “why did the agent forget X.”
4. Treat sleep-time agents as untrusted writers. When they touch the Persona or Safety
block, require a second-agent review before committing.
5. Port the example to use the Letta API (letta_v1_agent). What changes in the block
schema, and how does native reasoning alter the trace shape?
Key Terms
Term What people say What it actually means
Memory “Editable prompt section” Typed, persistent, LLM-editable segment of
block core memory
Human “User memory” Facts about the user, pinned in core
block
Persona “Agent identity” Self-concept, tone, constraints, pinned in core
block
Sleep-time “Async memory work” Second agent doing consolidation off the
compute critical path
Core / “Tiers” Three-layer memory split: always-visible /
Recall / conversation / external
Archival
Block limit “Cap” Character limit per block; forces
summarization
Native “Thinking channel” Provider-level reasoning output, not
reasoning prompt-level Thought:
Learned “Sleep output” Facts the sleep-time agent writes into shared
context blocks
Further Reading
• Letta, Memory Blocks blog — the block pattern
• Letta, Sleep-time Compute blog — async consolidation
• Letta, Rearchitecting the Agent Loop — native reasoning rewrite
• Packer et al., MemGPT (arXiv:2310.08560) — the origin
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/14-agent-engineering/08-memory-blocks-sleep-time-compute
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/14-agent-engineering/08-memory-blocks-sleep-time-compute/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/14-agent-engineering/08-memory-blocks-sleep-time-compute
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 277