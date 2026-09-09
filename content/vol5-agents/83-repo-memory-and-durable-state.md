---
title: "Repo Memory and Durable State"
volume: "vol5-agents"
part: "Part III — Agent Engineering"
chapter_number: 83
source_pages: "393-396"
---

# Repo Memory and Durable State

Repo Memory and Durable State
Chat history is volatile. The repo is durable. The workbench stores agent state in
versioned files so the next session, the next agent, and the next reviewer all read
from the same source of truth.
Type: Build Languages: Python (stdlib + jsonschema optional) Prerequisites: Phase 14 ·
32 (Minimal Workbench) Time: ~60 minutes
Learning Objectives
• Define what belongs in repo memory and what belongs in chat history.
• Author JSON Schemas for agent_state.json and task_board.json.
• Build a state manager that loads, validates, mutates, and persists state atomically.
• Use the schema to refuse bad writes before they corrupt the workbench.
The Problem
The agent finishes a session. The chat closes. The next session opens and asks where to start.
The model says “let me check the files,” reads stale notes, and re-does work that was already
complete. Or worse, it rewrites a finished file because no one told it the file was finished.
The workbench fix is repo memory: state lives in JSON files in the repo, written under a
schema, persisted atomically, diff-friendly in code review. Chat is a transient feed; the repo
is the system of record.
The Concept
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/14-agent-engineering/34-repo-memory-and-state
What belongs in repo memory
Belongs Does not belong
Active task id Raw chat transcripts
Touched files this session Token-level reasoning traces
Assumptions the agent made “The user seemed frustrated”
Open blockers Sampled completions
Next action Vendor-specific model ids
The test is durability: would this be useful three months from now in a CI rerun? If yes, repo.
If no, telemetry.
AIENGINEERINGFROMSCRATCH.COM 387

REPO MEMORY AND DURABLE STATE
Schema-first state
JSON Schema is the contract. Without it, every agent invents new fields, every reviewer
learns a new shape, and every CI script has to special-case past versions. With it, a bad write
is a refused write.
The schema covers:
• Required keys.
• Allowed status values.
• Forbidden values (e.g. null for arrays).
• Pattern constraints (task ids match T-\d{3,}).
• Version field for migrations.
Atomic writes
State writes need to survive partial failures: write to a tempfile, fsync, rename over the target.
The state file is the source of truth; a half-written one is worse than no file at all.
Migrations
When the schema changes, ship a migration script next to the schema bump. The state file
carries a schema_version field; the manager refuses to load a file from a version it cannot
migrate.
Interactive figure: wb-state-persist. This one moves. Watch it animate and drag its con-
trols in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/14-
agent-engineering/34-repo-memory-and-state
Build It
code/main.py implements:
• agent_state.schema.json and task_board.schema.json.
• A stdlib-only validator (subset of JSON Schema: required, type, enum, pattern, items).
• StateManager.load, StateManager.update, StateManager.commit with atomic temp-and-
rename writes.
• A demo that mutates state, persists, reloads, and proves the round-trip.
Run it:
python3 code/main.py
The script writes workdir/agent_state.json and workdir/task_board.json, mutates them
across two turns, and prints the validated state at each step.
Production patterns in the wild
Four patterns turn the lesson’s minimum into something a multi-agent monorepo can survive.
Atomic temp-and-rename is not optional. A March 2026 Hive project bug report doc-
uments the failure mode cleanly: state.json was written via write_text() and exceptions
were caught and silenced. Partial writes left sessions resuming against corrupt state with no
signal. The fix is always: tempfile.mkstemp in the same directory as the target, write, fsync,
os.replace (atomic rename on POSIX and Windows). This lesson’s atomic_write does exactly
that.
AIENGINEERINGFROMSCRATCH.COM 388

REPO MEMORY AND DURABLE STATE
Idempotency keys on every non-idempotent tool call. If an agent crashes after calling a
tool but before checkpointing the result, recovery retries the tool call. Safe for reads; danger-
ous for emails, DB inserts, file uploads. The pattern: log every tool call ID before execution
into a pending_calls.jsonl. On retry, check for the ID; if present, skip the call and use the
cached result. Anthropic and LangChain both call this out in 2026 guidance; LangGraph’s
checkpointer persists pending writes for the same reason.
Separate large artifacts from state. Don’t store CSVs, long transcripts, or generated files
in agent_state.json. Save the artifact as a separate file (or upload to object storage) and keep
only the path in state. Checkpoints stay small and fast; the artifacts grow independently.
Event sourcing for audit, snapshots for resume. Append to an event log (state.events.jsonl)
on every mutation; periodically snapshot to state.json. Resume reads the snapshot, then
replays any events after the snapshot’s timestamp. This costs more disk but lets you replay
agent decisions verbatim — essential when debugging long-horizon runs. The same shape
Postgres uses internally for WAL.
Schema migrations or refuse to load. The schema_version integer is the contract. When
the manager loads a file at an unknown version, it refuses to read. Ship a migration script
next to the schema bump; tools/migrate_state.py runs idempotently on every startup.
Use It
In production:
• LangGraph checkpointers. Same idea, different storage. The checkpointer persists
graph state to SQLite, Postgres, or a custom backend. The schema this lesson teaches
is what you reach for when the checkpointer dies and you need to read state by hand.
• Letta memory blocks. Persistent blocks with structured schemas (Phase 14 · 08). Same
discipline scoped to long-running personas.
• OpenAI Agents SDK session store. Pluggable backends, schema-aware. The state
file in this lesson is the local-file backend.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/34-repo-memory-and-
state
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engine
ering-from-scratch/tree/main/phases/14-agent-engineering/34-repo-memory-and-state/code
1. Add a last_human_touch timestamp. Refuse any agent write within five seconds of a
human edit.
2. Extend the validator to support oneOf so a task can be either a build task or a review
task with different required fields.
3. Add a schema_version field and write the migration from v1 to v2 (rename blockers to
risks).
4. Move the storage backend from a local file to SQLite. Keep the StateManager API iden-
tical.
5. Run two agents against the same state file with a 50 ms write race. What goes wrong
and how does the atomic rename save you?
AIENGINEERINGFROMSCRATCH.COM 389

REPO MEMORY AND DURABLE STATE
Key Terms
Term What people say What it actually means
Repo “Notes file” State stored in tracked files in the repo,
memory under schema
Schema- “Validate inputs” Define the contract before the writer, refuse
first drift
Atomic “Just rename” Write to temp, fsync, rename, so partial
write failures cannot corrupt
Migration “Schema bump” A script that turns vN state into v(N+1) state
System of “Source of truth” The artifact the workbench treats as
record authoritative
Further Reading
• JSON Schema specification
• LangGraph checkpointers
• Letta memory blocks
• Fast.io, AI Agent State Checkpointing: A Practical Guide — schema-first checkpointing
with idempotency
• Fast.io, AI Agent Workflow State Persistence: Best Practices 2026 — concurrency con-
trol, TTL, event sourcing
• Hive Issue #6263 — non-atomic state.json writes silently ignored — the failure mode in
a real project
• eunomia, Checkpoint/Restore Systems: Evolution, Techniques, Applications — CR prim-
itives from OS history applied to agents
• Indium, 7 State Persistence Strategies for Long-Running AI Agents in 2026
• Microsoft Agent Framework, Compaction — vendor checkpoint manager
• Phase 14 · 08 — memory blocks and sleep-time compute
• Phase 14 · 32 — the three-file minimum this lesson schematizes
• Phase 14 · 40 — handoff packets read from the same schema
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/14-agent-engineering/34-repo-memory-and-state
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/14-agent-engineering/34-repo-memory-and-state/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/14-agent-engineering/34-repo-memory-and-state
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 390