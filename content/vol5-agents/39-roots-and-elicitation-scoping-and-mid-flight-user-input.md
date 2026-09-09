---
title: "Roots and Elicitation — Scoping and Mid-Flight User Input"
volume: "vol5-agents"
part: "Part II — Tools & Protocols"
chapter_number: 39
source_pages: "187-191"
---

# Roots and Elicitation — Scoping and Mid-Flight User Input

Roots and Elicitation — Scoping and
Mid-Flight User Input
Hard-coded paths break the moment a user opens a different project. Pre-filled tool
arguments break when the user under-specifies. Roots scope the server to a user-
controlled set of URIs; elicitation pauses mid-tool-call to ask the user for structured
input via a form or URL. Two client primitives, two fixes for common MCP failure
modes. SEP-1036 (URL-mode elicitation, 2025-11-25) is experimental through H1
2026 — check SDK versions before depending on it.
Type: Build Languages: Python (stdlib, roots + elicitation demo) Prerequisites: Phase 13
· 07 (MCP server) Time: ~45 minutes
Learning Objectives
• Declare roots and respond to notifications/roots/list_changed.
• Restrict server file operations to URIs inside the declared root set.
• Use elicitation/create to ask the user for a confirmation or structured input mid-tool-
call.
• Choose between form-mode and URL-mode elicitation (the latter is experimental; drift-
risk noted).
The Problem
Two concrete failures a notes MCP server hits in production.
Broken path assumption. The server is written against ~/notes. A user on a different
machine with notes in ~/Documents/Notes gets a tool call that fails silently (no file found) or
worse, wrote to the wrong place.
Missing argument the user would know. The user asks “delete the old TPS report note”.
The model calls notes_delete(title: "TPS report") but there are three matching notes from
2023, 2024, and 2025. The tool cannot guess. Failing with “ambiguous” is annoying; running
on all three is catastrophic.
Roots fix the first: the client declares at initialize the set of URIs the server may touch.
Elicitation fixes the second: the server pauses the tool call and sends elicitation/create to
ask the user to pick which one.
The Concept
Roots
The client declares a root list at initialize:
AIENGINEERINGFROMSCRATCH.COM 181

ROOTS AND ELICITATION — SCOPING AND MID-FLIGHT USER INPUT
{
"capabilities": {"roots": {"listChanged": true}}
}
Server can then call roots/list:
{"roots": [{"uri": "file:///Users/alice/Documents/Notes", "name": "Notes"}]}
Servers MUST treat roots as the boundary: any file read or write outside the root set is
rejected. This is not enforced by the client (the server is still code the user trusted), but
spec-compliant servers honor it.
When the user adds or removes a root, the client sends notifications/roots/list_changed.
The server re-calls roots/list and updates its boundary.
Why roots are a client primitive
Roots are declared by the client because they represent the user’s consent model. The user
told Claude Desktop “give this notes server access to these two directories”. The server
cannot widen that scope.
Elicitation: the form-mode default
elicitation/create takes a form schema plus a natural-language prompt:
{
"method": "elicitation/create",
"params": {
"message": "Delete 'TPS report'? Multiple notes match; pick one.",
"requestedSchema": {
"type": "object",
"properties": {
"note_id": {
"type": "string",
"enum": ["note-3", "note-7", "note-14"]
},
"confirm": {"type": "boolean"}
},
"required": ["note_id", "confirm"]
}
}
}
Client renders a form, collects the user’s answer, returns:
{
"action": "accept",
"content": {"note_id": "note-14", "confirm": true}
}
Three possible actions: accept (user filled it), decline (user closed it), cancel (user aborted
the whole tool call).
Form schemas are flat — nested objects are not supported in v1. SDKs typically reject any-
thing more complex than a single layer.
AIENGINEERINGFROMSCRATCH.COM 182

ROOTS AND ELICITATION — SCOPING AND MID-FLIGHT USER INPUT
Elicitation: URL mode (SEP-1036, experimental)
New in 2025-11-25. Instead of a schema, the server sends a URL:
{
"method": "elicitation/create",
"params": {
"message": "Sign in to GitHub",
"url": "https://github.com/login/oauth/authorize?client_id=..."
}
}
Client opens the URL in a browser, waits for completion, returns when the user comes back.
Useful for OAuth flows, payment authorization, and document signing where a form is insuf-
ficient.
Drift-risk note: the SEP-1036 response shape is still settling; some SDKs return the callback
URL, others return a completion token. Read your SDK’s release notes before using URL
mode in production.
When elicitation is the right tool
• User confirmation before destructive actions (destructive hint + elicitation).
• Disambiguation (pick one of N matches).
• First-run setup (API keys, directories, preferences).
• OAuth-style flows (URL mode).
When elicitation is wrong
• Filling a tool’s required arguments that the model could have asked for in prose. Use a
normal re-prompt, not an elicitation dialog.
• High-frequency calls. Elicitation interrupts the conversation; do not fire it inside a loop.
• Anything the server could validate after the fact. Validate, return an error, let the model
ask the user in text.
Human-in-the-loop bridge
Elicitation plus sampling together enable MCP’s “human-in-the-loop” model. A server’s agent
loop can pause for either user input (elicitation) or model reasoning (sampling). Phase 13 · 11
covered sampling; this lesson covers elicitation. Put them together for full mid-loop control.
Interactive figure: t3-roots-boundary. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/13-tools-and-protocols/12-mcp-roots-and-elicitation
Use It
code/main.py extends the notes server with:
• roots/list response that the server re-queries after root-list-changed notifications.
• A notes_delete tool that uses elicitation/create to disambiguate when multiple notes
match.
• A notes_setup tool that uses URL-mode elicitation to open a first-run config page (simu-
lated).
• A boundary check that refuses operations on URIs outside the declared roots.
AIENGINEERINGFROMSCRATCH.COM 183

ROOTS AND ELICITATION — SCOPING AND MID-FLIGHT USER INPUT
The demo runs three scenarios: happy path (one match), disambiguation (three matches,
elicitation fires), out-of-root-write (rejected).
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/13-tools-and-protocols/12-mcp-roots-and-
elicitation
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/13-tools-and-protocols/12-mcp-roots-and-
elicitation/code
1. Run code/main.py. Trigger the disambiguation path; confirm the simulated user answer
gets routed back to the tool.
2. Add a new tool notes_archive that requires elicitation confirmation every time (destruc-
tive hint). Check the UX: how does this compare to the model re-asking in text?
3. Implement URL-mode elicitation for a first-run OAuth flow. Note the drift risk and add
an SDK-version guard.
4. Extend roots/list handling: when a notification arrives, the server should atomically
re-read and rescan open file handles that might now be out of scope.
5. Read the SEP-1036 issue discussion thread on GitHub. Identify one open question that
affects how servers should handle URL-mode callbacks.
Key Terms
Term What people say What it actually means
Root “Consent boundary” URI the client has allowed the server to touch
roots/list “Server asks for scope” Client returns the current root set
notifications“/Ursoeortcsh/lainsgte_dchscaongpeed” Client signals the root set has mutated
Elicitation “Ask the user mid-call” Server-initiated request for structured user
input
elicitation/c“rTehaetemethod” JSON-RPC method for elicitation requests
Form mode “Schema-driven form” Flat JSON Schema rendered as a form in the
client UI
URL mode “Browser redirect” SEP-1036 experimental; opens a URL and
waits
accept / “User response outcomes” Three branches the server handles
decline /
cancel
Disambiguatio“nPick one” Common elicitation use case when a tool has
N candidates
Flat form “Top-level properties only” Elicitation schemas cannot nest
Further Reading
• MCP — Client roots spec — canonical roots reference
AIENGINEERINGFROMSCRATCH.COM 184

ROOTS AND ELICITATION — SCOPING AND MID-FLIGHT USER INPUT
• MCP — Client elicitation spec — canonical elicitation reference
• Cisco — What’s new in MCP elicitation, structured content, OAuth enhancements —
2025-11-25 additions walk-through
• MCP — GitHub SEP-1036 — URL-mode elicitation proposal (experimental, drift-risk)
• The New Stack — How elicitation brings human-in-the-loop to AI tools — UX walkthrough
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/13-tools-and-protocols/12-mcp-roots-and-elicitation
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/13-tools-and-protocols/12-mcp-roots-and-elicitation/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 185