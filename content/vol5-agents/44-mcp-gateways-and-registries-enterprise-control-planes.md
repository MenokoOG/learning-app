---
title: "MCP Gateways and Registries — Enterprise Control Planes"
volume: "vol5-agents"
part: "Part II — Tools & Protocols"
chapter_number: 44
source_pages: "211-227"
---

# MCP Gateways and Registries — Enterprise Control Planes

MCP Gateways and Registries — Enter-
prise Control Planes
Enterprises cannot let every dev install random MCP servers. A gateway central-
izes auth, RBAC, audit, rate limiting, caching, and tool-poisoning detection, then ex-
poses the merged tool surface as a single MCP endpoint. The Official MCP Registry
(Anthropic + GitHub + PulseMCP + Microsoft, namespace-verified) is the canonical
upstream. This lesson names where a gateway fits, walks a minimal implementa-
tion, and surveys the 2026 vendor landscape.
Type: Learn Languages: Python (stdlib, minimal gateway) Prerequisites: Phase 13 · 15
(tool poisoning), Phase 13 · 16 (OAuth 2.1) Time: ~45 minutes
Learning Objectives
• Explain where an MCP gateway sits (between MCP clients and multiple backend MCP
servers).
• Implement the five gateway responsibilities: auth, RBAC, audit, rate limit, policy.
• Enforce a pinned-tool-hash manifest at the gateway layer.
• Differentiate the Official MCP Registry from metaregistries (Glama, MCPMarket,
MCP.so, Smithery, LobeHub).
The Problem
A Fortune 500 has 30 approved MCP servers, 5000 developers, compliance and audit require-
ments, and a security team that wants centralized policy. Letting every developer install
arbitrary servers in their IDEs is a non-starter.
The gateway pattern:
1. Gateway runs as a single Streamable HTTP endpoint developers connect to.
2. Gateway holds credentials for each backend MCP server.
3. Every developer request is authenticated and scoped via the gateway’s own OAuth.
4. Gateway routes the call to the backend server, applying policy.
5. All calls logged for audit.
Cloudflare MCP Portals, Kong AI Gateway, IBM ContextForge, MintMCP, TrueFoundry, Envoy
AI Gateway — all shipped gateways or gateway features in 2025-2026.
Meanwhile, the Official MCP Registry launched as the canonical upstream: curated,
namespace-verified, reverse-DNS-named servers the gateway can pull from. Metaregistries
(Glama, MCPMarket, MCP.so, Smithery, LobeHub) aggregate servers across multiple
sources.
AIENGINEERINGFROMSCRATCH.COM 205

MCP GATEWAYS AND REGISTRIES — ENTERPRISE CONTROL PLANES
The Concept
Five gateway responsibilities
1. Auth. OAuth 2.1 to identify the developer; maps to user roles.
2. RBAC. Per-user policy: which servers, which tools, which scopes.
3. Audit. Every call logged with who, what, when, result.
4. Rate limit. Per-user / per-tool / per-server caps to prevent abuse.
5. Policy. Reject poisoned descriptions, enforce Rule of Two, redact PII.
Gateway as a single endpoint
To developers, the gateway looks like one MCP server. Internally it routes to N backends.
Session ids (Phase 13 · 09) are rewritten at the boundary.
Credential vaulting
Developers never see backend tokens. The gateway holds them (or proxies to an identity
provider that does). A developer with notes:read on the gateway may transitively access the
notes MCP server with the gateway’s own backend credentials — but only under policy that
binds the transitive access.
Tool-hash pinning at the gateway
The gateway holds a manifest of approved tool descriptions (SHA256 hashes). At discovery
time, it fetches each backend’s tools/list, compares hashes to the manifest, and removes
any tool whose description has mutated. This is the rug-pull defense from Phase 13 · 15
applied centrally.
Policy-as-code
Advanced gateways express policy in OPA/Rego, Kyverno, or Styra. Rules like “user alice may
call github.open_pr only on repos in org acme” are encoded declaratively. Simple gateways
use hand-coded Python. Both shapes are valid.
Session-aware routing
When a user’s session includes a mix of servers, the gateway multiplexes: the developer’s
single MCP session holds N backend sessions, one per server. Notifications from any backend
route through the gateway to the developer’s session.
Namespace merging
Gateways merge tool namespaces from all backends, typically with prefix-on-collision.
github.open_pr, notes.search. This makes routing unambiguous.
Registries
• Official MCP Registry (registry.modelcontextprotocol.io). Launched under An-
thropic, GitHub, PulseMCP, Microsoft stewardship. Namespace-verified (reverse-DNS:
io.github.user/server). Pre-filtered for basic quality.
• Glama. Search-centric metaregistry aggregating many sources.
AIENGINEERINGFROMSCRATCH.COM 206

MCP GATEWAYS AND REGISTRIES — ENTERPRISE CONTROL PLANES
• MCPMarket. Commercial-leaning directory with vendor listings.
• MCP.so. Community directory; open submissions.
• Smithery. Package-manager-style installation flow.
• LobeHub. UI-integrated registry in their LobeChat app.
Enterprise gateways pull from the Official Registry by default, allow admin-curated additions
from metaregistries, and reject anything unpinned.
Reverse-DNS naming
Official Registry mandates reverse-DNS names for public servers: io.github.alice/notes.
Namespaces prevent squatting and make trust delegation clearer.
Vendor survey, April 2026
Vendor Strength
Cloudflare MCP Portals Edge-hosted; OAuth integrated; free tier
Kong AI Gateway K8s-native; fine-grained policy; logs to
OpenTelemetry
IBM ContextForge Enterprise IAM; compliance; audit export
TrueFoundry DevOps-leaning; metrics-first
MintMCP Developer-platform oriented
Envoy AI Gateway Open-source; customizable filters
Phase 17 (production infrastructure) dives deeper on gateway operations.
Interactive figure: t3-gateway-funnel. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/13-tools-and-protocols/17-mcp-gateways-and-registries
Use It
code/main.py ships a minimal gateway in ~150 lines: authenticates users by a fake Bearer
token, holds a per-user RBAC policy, routes requests to two backend MCP servers, writes
every call to an audit log, enforces a rate limit, and rejects any backend tool whose description
hash does not match a pinned manifest.
What to look at:
• RBAC dict keyed by user_id with allowed server_tool entries.
• AUDIT_LOG is an append-only list of events.
• Rate limit uses a token bucket per user.
• Pinned manifest is a dict of server::tool -> hash.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/13-tools-and-protocols/17-mcp-gateways-and-
registries
AIENGINEERINGFROMSCRATCH.COM 207

MCP GATEWAYS AND REGISTRIES — ENTERPRISE CONTROL PLANES
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/13-tools-and-protocols/17-mcp-gateways-and-
registries/code
1. Run code/main.py. Make a call as an allowed user; then as a disallowed user; then a
rate-limit-exceeded burst. Verify all three flows.
2. Add a policy that redacts PII from results before returning to the client. Use a simple
regex pass for SSN-shaped strings; note the gap (emails, phone numbers).
3. Extend the audit log to emit OpenTelemetry GenAI spans. Phase 13 · 20 covers the exact
attributes.
4. Design an RBAC policy for a 50-developer team with five backends (notes, github, post-
gres, jira, slack). Who gets read-only on each? Who gets write?
5. Read the Cloudflare enterprise MCP post top to bottom. Identify one feature Cloudflare
ships that this stdlib gateway does not.
Key Terms
Term What people say What it actually means
Gateway “MCP proxy” Centralizing server between clients and
backends
Credential “Backend tokens stay Developers never see upstream tokens
vaulting server-side”
Session- “Multi-backend session” Gateway multiplexes N backend sessions per
aware developer session
routing
Tool-hash “Approved manifest” SHA256 of every approved tool description;
pinning blocks rug-pulls centrally
RBAC “Per-user policy” Role-based access control for tools and
servers
Policy-as- “Declarative rules” OPA/Rego, Kyverno, Styra policies enforced
code at gateway
Audit log “Who, what, when” Append-only event log for compliance
Rate limit “Per-user token bucket” Per-minute caps to prevent abuse
Official “Canonical upstream” registry.modelcontextprotocol.io,
MCP namespace-verified
Registry
Reverse- “Registry namespace” io.github.user/server convention
DNS
naming
Further Reading
• Official MCP Registry — canonical upstream, namespace-verified
• Cloudflare — Enterprise MCP — gateway pattern with OAuth and policy
• agentic-community — MCP gateway registry — open-source reference gateway
• TrueFoundry — What is an MCP gateway? — feature comparison article
AIENGINEERINGFROMSCRATCH.COM 208

MCP GATEWAYS AND REGISTRIES — ENTERPRISE CONTROL PLANES
• IBM — MCP context forge — enterprise gateway from IBM
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/13-tools-and-protocols/17-mcp-gateways-and-registries
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/13-tools-and-protocols/17-mcp-gateways-and-registries/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 209

MCP Auth in Production — Enrollment,
JWKS Refresh, Audience-Pinned Tokens
Lesson 16 stood up the OAuth 2.1 state machine in memory. By 2026, every MCP
server you ship to a real org sits behind production auth: client enrollment that
scales to an unbounded client population (Client ID Metadata Documents first, dy-
namic client registration as a backwards-compatible fallback), authorization-server
metadata discovery (RFC 8414 or OpenID Connect Discovery), JWKS cache refresh
that does not break a 3 a.m. token validation, and audience-pinned tokens that
refuse cross-resource replay. This lesson models the full surface with three roles —
an authorization server, a resource server (the MCP server), and a client — so you
can trace every hop from discovery to a validated tool call.
Spec note (2025-11-25): the November 2025 MCP authorization spec demoted
Dynamic Client Registration from SHOULD to MAY and made Client ID Metadata
Documents (CIMD) the recommended default enrollment mechanism. This lesson
teaches both, in the spec’s priority order, and the code keeps DCR for the walk-
through because it is fully self-contained in one process.
Type: Build Languages: Python (stdlib) Prerequisites: Phase 13 · 16 (OAuth 2.1 state
machine), Phase 13 · 17 (gateways) Time: ~90 minutes
Learning Objectives
• Discover an authorization server through RFC 8414 metadata and verify the contract.
• Implement RFC 7591 dynamic client registration so MCP clients enroll without admin
intervention.
• Cache and refresh JWKS keys on a schedule so signature verification survives key roll-
over.
• Pin tokens to a single MCP resource using RFC 8707 resource indicators and refuse
confused-deputy reuse.
• Separate the three roles cleanly — authorization server, resource server, client — so
each enforces only the checks that belong to it.
• Read an IdP capability matrix and refuse to deploy when the IdP cannot satisfy MCP’s
auth profile.
The Problem
The Lesson 16 simulator runs OAuth 2.1 in memory. Production has three operational gaps
that a memory-only simulator does not see.
The first gap is enrollment. A real org runs hundreds of MCP servers and thousands of MCP
clients. Operators do not hand-register every Cursor user as an OAuth client. The 2025-11-25
spec gives clients a priority order for solving this: use a pre-registered client_id if you have
one, else use a Client ID Metadata Document (the client identifies itself with an HTTPS
URL it controls and the authorization server pulls the metadata), else fall back to RFC 7591
AIENGINEERINGFROMSCRATCH.COM 210

MCP AUTH IN PRODUCTION — ENROLLMENT, JWKS REFRESH, AUDIENCE-PINNED TOKENS
dynamic client registration (the client pushes a POST /register and receives a client_id
on the spot), else prompt the user. CIMD is the recommended default because it removes
per-server registration entirely while keeping a DNS-rooted trust model; DCR is retained for
backwards compatibility. Both discover their entry points from the authorization server’s
metadata: client_id_metadata_document_supported for CIMD, registration_endpoint for
DCR.
The second gap is key rotation. JWT validation depends on the authorization server’s signing
keys, published as a JSON Web Key Set (JWKS). The authorization server rotates these on
a schedule (often hourly, sometimes faster under incident response). An MCP server that
fetches JWKS once at boot validates fine until the rotation window — then every request fails
until restart. Production wires JWKS as a cached value with a refresh job that overwrites the
cache before the previous keys expire, plus a fall-back fetch on cache miss for the case where
a token signed by a key newer than the cache arrives.
The third gap is audience binding. Lesson 16 introduced RFC 8707 resource indicators. In
production, that indicator becomes a hard claim check on every request. The MCP server
compares token.aud against its own canonical resource URL and rejects mismatches with
HTTP 401. This is the only defense against an upstream MCP server (or a malicious client
holding a token meant for one server) replaying that token against another server in the same
trust mesh.
This lesson maps each gap onto a concrete piece of the surface. The metadata document
is an HTTP endpoint. JWKS cache refresh is a scheduled job plus a key-value cache. JWT
validation is a routine the resource server runs before dispatching any tool. Keep the three
roles separate and each one enforces only the checks it owns: the authorization server issues
and rotates keys, the resource server caches and validates, the client discovers and enrolls.
The Concept
RFC 8414 — OAuth Authorization Server Metadata
A document at /.well-known/oauth-authorization-server describes everything a client
needs:
{
"issuer": "https://auth.example.com",
"authorization_endpoint": "https://auth.example.com/authorize",
"token_endpoint": "https://auth.example.com/token",
"jwks_uri": "https://auth.example.com/.well-known/jwks.json",
"registration_endpoint": "https://auth.example.com/register",
"response_types_supported": ["code"],
"grant_types_supported": ["authorization_code", "refresh_token"],
"code_challenge_methods_supported": ["S256"],
"scopes_supported": ["mcp:tools.read", "mcp:tools.invoke"],
"token_endpoint_auth_methods_supported": ["none", "private_key_jwt"]
}
A client given an MCP resource URL chains discovery: oauth-protected-resource from RFC
9728 (the resource server’s document) names the issuer, then oauth-authorization-server
(this RFC) names every endpoint. The client never hard-codes an authorization URL.
The contract you verify before trusting an IdP for MCP:
• code_challenge_methods_supported includes S256 (PKCE per RFC 7636). The spec is
explicit: if this field is absent, the authorization server does not support PKCE and the
AIENGINEERINGFROMSCRATCH.COM 211

MCP AUTH IN PRODUCTION — ENROLLMENT, JWKS REFRESH, AUDIENCE-PINNED TOKENS
client MUST refuse to proceed.
• grant_types_supported includes authorization_code and rejects password and im-
plicit.
• At least one enrollment path is advertised: client_id_metadata_document_supported:
true (CIMD, preferred) or registration_endpoint (RFC 7591 DCR, fallback). Either
satisfies the contract; you no longer hard-require DCR.
• response_types_supported is exactly ["code"] for OAuth 2.1.
If S256 is missing, the MCP server refuses to deploy against this IdP — there is no degraded
mode for PKCE. If neither enrollment path is advertised and you have no pre-registered
client_id, you also cannot enroll; the deployment manifest is wrong, not the code.
RFC 9728 (recap) — Protected Resource Metadata
Lesson 16 covered RFC 9728. The delta in production: this document is the only place a
client looks to find the authorization servers trusted by this MCP server. A single MCP server
may accept tokens from multiple IdPs (one for staff, one for partners). RFC 9728 declares
that set; RFC 8414 documents what each IdP supports.
{
"resource": "https://notes.example.com",
"authorization_servers": ["https://auth.example.com", "https://partners.example.com"],
"scopes_supported": ["mcp:tools.invoke"],
"bearer_methods_supported": ["header"],
"resource_documentation": "https://notes.example.com/docs"
}
Client ID Metadata Documents (the recommended default)
CIMD inverts registration from push to pull. Instead of asking the authorization server to mint
a client_id, the client uses an HTTPS URL it controls as its client_id. The URL resolves
to a JSON metadata document; the authorization server fetches it on demand during the
OAuth flow. Trust is rooted in DNS: if the server operator trusts app.example.com, it trusts
the client served from https://app.example.com/client.json. No registration round-trip, no
client_id namespace to exhaust, no per-server state to keep in sync.
The metadata document the client hosts:
{
"client_id": "https://app.example.com/oauth/client.json",
"client_name": "Example MCP Client",
"client_uri": "https://app.example.com",
"redirect_uris": ["http://127.0.0.1:7333/callback", "http://localhost:7333/callback"],
"grant_types": ["authorization_code", "refresh_token"],
"response_types": ["code"],
"token_endpoint_auth_method": "none"
}
The client_id value in the document MUST equal the URL it is served from (the authorization
server verifies this; mismatches are rejected). The authorization server advertises support
with client_id_metadata_document_supported: true in its RFC 8414 metadata.
Two security facts the spec is blunt about:
• SSRF. The authorization server fetches an attacker-supplied URL. It must defend against
server-side request forgery (no fetches to internal/admin endpoints).
AIENGINEERINGFROMSCRATCH.COM 212

MCP AUTH IN PRODUCTION — ENROLLMENT, JWKS REFRESH, AUDIENCE-PINNED TOKENS
• localhost impersonation. CIMD alone cannot stop a local attacker from claiming a
legitimate client’s metadata URL and binding any localhost redirect. The authorization
server MUST clearly display the redirect URI hostname during consent and SHOULD
warn on localhost-only redirects.
Because CIMD needs no server-side state, there is no registrar to stand up the way DCR
requires. The client side is read-only: serve your metadata document from a static HTTPS
endpoint and let the authorization server pull it.
RFC 7591 — Dynamic Client Registration (fallback / backwards com-
patibility)
DCR is now a MAY, kept for backwards compatibility with pre-2025-11-25 deployments and
IdPs that do not yet support CIMD. Without it (and without CIMD or pre-registration), every
MCP client (Cursor, Claude Desktop, a custom agent) needs an out-of-band exchange with the
IdP admin. With DCR, the client posts:
POST /register
Content-Type: application/json
{
"redirect_uris": ["http://127.0.0.1:7333/callback"],
"grant_types": ["authorization_code", "refresh_token"],
"response_types": ["code"],
"token_endpoint_auth_method": "none",
"scope": "mcp:tools.invoke",
"client_name": "Cursor",
"software_id": "com.cursor.cursor",
"software_version": "0.42.0"
}
The server responds with client_id and a registration_access_token for later updates:
{
"client_id": "c_3e7f1a",
"client_id_issued_at": 1769472000,
"redirect_uris": ["http://127.0.0.1:7333/callback"],
"grant_types": ["authorization_code", "refresh_token"],
"registration_access_token": "regt_b2...",
"registration_client_uri": "https://auth.example.com/register/c_3e7f1a"
}
token_endpoint_auth_method: none is the right default for MCP clients that run on the user’s
device. They get a client_id only — no client_secret to exfiltrate. PKCE provides the proof-
of-possession that public clients need.
Three production pitfalls:
• The registration endpoint must rate-limit by source IP. Without that, a hostile actor
scripts millions of fake registrations and exhausts the client_id namespace. Run a
rate-limit check before the registrar handles the request.
• software_statement (a signed JWT vouching for the client) is required by some enter-
prise IdPs. The lesson’s mock skips it; production wires a verification step that rejects
unsigned registrations from anything other than localhost redirect URIs.
• The registration_access_token must be stored as a hash, not plaintext. Theft of this
token means the attacker can rewrite the client’s redirect URIs.
AIENGINEERINGFROMSCRATCH.COM 213

MCP AUTH IN PRODUCTION — ENROLLMENT, JWKS REFRESH, AUDIENCE-PINNED TOKENS
RFC 8707 (recap) — Resource Indicators
Lesson 16 established the shape. The production rule: every token request includes
resource=<canonical-mcp-url>, and the MCP server verifies token.aud matches its own
resource URL on every call. The canonical URI is the most specific identifier for the
server: it uses lowercase scheme and host, no fragment, and conventionally no trailing
slash. The path component is not stripped by rule — the spec keeps it when it is needed to
identify an individual MCP server. https://mcp.example.com, https://mcp.example.com/mcp,
https://mcp.example.com:8443, and https://mcp.example.com/server/mcp are all valid
canonical URIs. Pick one per server and pin aud to exactly that. (This lesson’s mock uses
bare-host audiences like https://notes.example.com for brevity; a deployment that co-hosts
several MCP servers under one origin distinguishes them by path.)
RFC 7636 (recap) — PKCE
PKCE is mandatory in OAuth 2.1. The lesson’s authorization-code flow always carries
code_challenge and code_verifier. The server rejects any token request without a verifier
or with a verifier that does not hash to the stored challenge.
MCP Spec 2025-11-25 Auth Profile
The MCP spec (2025-11-25) is precise about what an MCP server’s authorization layer must
do:
• Implement RFC 9728 protected-resource metadata, and provide its location either
through the WWW-Authenticate: Bearer resource_metadata="..." header on a 401
or the well-known URI /.well-known/oauth-protected-resource (SEP-985 made the
header optional with a well-known fallback). The metadata authorization_servers field
MUST name at least one server.
• Accept tokens only via Authorization: Bearer ... on every request — never in a query
string, never validated only at session start.
• Validate aud, iss, exp, and required scopes per request. The server MUST validate
that the token was issued specifically for it (audience); a missing or mismatched aud is
rejected, never treated as wildcard.
• On 401/403, return WWW-Authenticate: Bearer carrying error=..., the resource_metadata="<PRM-
URL>" parameter (the URL of the metadata document, not the bare resource), and
scope="..." on insufficient_scope (403). Note: the parameter is resource_metadata,
a discovery pointer — there is no resource parameter in the challenge.
• Authorization-server discovery accepts either RFC 8414 OAuth metadata or OpenID
Connect Discovery 1.0; clients must try both well-known suffixes in priority order.
• The client (not the server) defends against mix-up attacks: it records the expected
issuer before redirecting and validates the iss authorization-response parameter (RFC
9207) before redeeming the code. PKCE alone does not stop mix-up, because the client
hands its code_verifier to whatever token endpoint it was steered to.
The OAuth 2.1 draft is the substrate; RFC 8414/7591/8707/9728/9207 + RFC 7636 + CIMD
are the surface; the MCP spec is the profile.
IdP capability matrix
Not every IdP supports the full MCP profile. The matrix below documents factual capability
statements as of the 2025-11-25 spec. It is a deployment gate, not a recommendation.
CIMD shipped in the 2025-11-25 spec and the underlying OAuth draft was adopted only in
October 2025, so vendor support is still arriving — treat “CIMD” below as “where it stands
AIENGINEERINGFROMSCRATCH.COM 214

MCP AUTH IN PRODUCTION — ENROLLMENT, JWKS REFRESH, AUDIENCE-PINNED TOKENS
today, verify in your tenant,” not a permanent statement.
AS RFC 7636
IdP metadata RFC 7591 RFC 8707 S256
category (8414/OIDC) CIMD DCR resource PKCE Notes
Self-hosted yes emerging yes yes (since yes Reference
(Keycloak) 24.x) IdP for the
MCP
profile in
this lesson;
full DCR
path
end-to-end,
CIMD
tracking
the new
spec.
Enterprise yes emerging yes yes yes DCR
SSO (premium availability
(Microsoft tiers) differs by
Entra ID) tenant tier;
verify in
target
tenant
before
deploying.
Enterprise yes emerging yes (Okta yes yes DCR
SSO (Okta) CIC / available
Auth0) on Auth0
(now Okta
CIC);
classic
Okta orgs
require
admin pre-
registration.
AIENGINEERINGFROMSCRATCH.COM 215

MCP AUTH IN PRODUCTION — ENROLLMENT, JWKS REFRESH, AUDIENCE-PINNED TOKENS
AS RFC 7636
IdP metadata RFC 7591 RFC 8707 S256
category (8414/OIDC) CIMD DCR resource PKCE Notes
Social varies no rarely rarely yes Most
login IdPs social IdPs
(generic) treat
clients as
static
partners;
no self-
service
enrollment.
Use as
identity
source
only, layer
your own
MCP-
aware
authoriza-
tion server
on top.
Custom / depends depends depends depends depends If you ship
home- your own,
grown ship the
full profile
and prefer
CIMD.
Skipping
PKCE or
audience
binding
breaks the
MCP auth
contract.
Refusal rule for the deployment manifest: if the chosen IdP does not list S256 in
code_challenge_methods_supported, the MCP server refuses to start — PKCE has no
degraded mode. Enrollment is a softer gate: you need one working path (a pre-registered
client_id, client_id_metadata_document_supported: true, or a registration_endpoint).
DCR’s absence alone is no longer a refusal trigger, because CIMD or pre-registration can
cover it.
JWKS refresh pattern (rotate at the AS, refresh at the resource server)
Keep two verbs separate, because conflating them is a real production bug:
• Rotate is what the authorization server does: mint a new signing key, publish it in the
JWKS, retire the old one later. The resource server has no part in this and cannot do it
— it does not hold the IdP’s private keys.
• Refresh is what the resource server does: re-GET the published JWKS into its cache.
That is the only JWKS action a resource server ever performs.
AIENGINEERINGFROMSCRATCH.COM 216

MCP AUTH IN PRODUCTION — ENROLLMENT, JWKS REFRESH, AUDIENCE-PINNED TOKENS
The production failure mode is a stale cache. Solve it with a scheduled refresh job plus a key-
value cache. The resource server runs a job (cron, timer, whatever your runtime offers) that,
on a fixed interval, fetches <issuer>/.well-known/jwks.json and overwrites cache[issuer]
= {keys, fetched_at}. The validator reads from that cache. A token whose kid is missing
from the cache triggers one synchronous refresh as a fall-back, then re-checks. This handles
two cases at once: the scheduled refresh, and key-overlap windows where a token signed by
a brand-new key arrives before the next scheduled refresh.
The fall-back must be a re-fetch, never a rotate. If you wire the cache-miss path to a rotate-
and-mint, two things break: (1) minting a fresh key produces a kid that still does not match
the token, so the lookup fails anyway; and (2) an attacker who sprays tokens with random
kid values forces an unbounded series of key creations — a self-inflicted DoS. A re-fetch is
idempotent, so a bogus kid costs at most one wasted fetch.
The cache shape:
{
"https://auth.example.com": {
"keys": [
{"kid": "k_2026_03", "kty": "RSA", "n": "...", "e": "AQAB", "alg": "RS256", "use": "sig"},
{"kid": "k_2026_04", "kty": "RSA", "n": "...", "e": "AQAB", "alg": "RS256", "use": "sig"}
],
"fetched_at": 1772668800
}
}
Two keys at once is the steady state. Authorization servers rotate by introducing the next
key (k_2026_04) before retiring the previous (k_2026_03), so tokens issued under the old key
remain valid until they expire. The cache holds the union; the validator picks by kid.
The validation routine
The MCP server runs validation before dispatching any tool. The shape code/main.py uses:
result = server.validate(bearer_token, required_scope="mcp:tools.invoke")
if not result["valid"]:
return {"status": result["status"], "WWW-Authenticate": result["www_authenticate"]}
validate decodes the JWT, resolves the signing key from the JWKS cache (refreshing once on
a miss), verifies the signature, then checks iss against the allow-list, aud against this server’s
canonical resource, exp, and the required scope — returning a WWW-Authenticate challenge
on the first failure. Keeping it a single routine on the resource server means every entry point
(every tool call, every transport) goes through the same checks; there is no path that reaches
a tool without validating first.
Audience-replay walkthrough (access-token privilege restriction)
Server A (notes.example.com) and Server B (tasks.example.com) both register against the
same authorization server. Server A is compromised. The attacker takes a user’s notes token
and replays it against Server B.
Server B’s validator:
1. Decode JWT, fetch JWKS by kid, verify signature.
2. Check iss against its protected-resource metadata’s authorization_servers. (Pass —
same IdP.)
3. Check aud == "https://tasks.example.com". (Fail — token’s aud is https://notes.example.com.)
AIENGINEERINGFROMSCRATCH.COM 217

MCP AUTH IN PRODUCTION — ENROLLMENT, JWKS REFRESH, AUDIENCE-PINNED TOKENS
4. Return 401 with WWW-Authenticate: Bearer error="invalid_token", error_description="audience
mismatch", resource_metadata="https://tasks.example.com/.well-known/oauth-
protected-resource".
The audience claim is the only defense against this attack at the protocol layer. Skipping it
for performance is the most common production mistake; the validator must run on every
request, not just at session start. The spec calls this access-token privilege restriction: an
MCP server MUST reject any token that does not name it in the audience.
Naming note. The spec reserves the term confused deputy for a related-but-
distinct problem: an MCP server acting as an OAuth proxy to a third-party API,
using a static client ID, that forwards a token without obtaining per-client user con-
sent. Audience binding fixes the replay above; the confused-deputy fix is per-client
consent plus never passing the inbound token through to upstream APIs (the MCP
server MUST get its own separate upstream token).
Mix-up attacks (a client-side defense the server cannot provide)
A client talks to many authorization servers over its life. A malicious AS can try to make the
client redeem an honest AS’s authorization code at the attacker’s token endpoint. Audience
binding does not help here — the attack happens before any token exists. The defense lives
in the client (RFC 9207):
1. Before redirecting, the client records the expected issuer from the validated AS meta-
data.
2. On the authorization response, the client compares the returned iss parameter against
that recorded issuer (simple string comparison, no normalization) before sending the
code anywhere.
3. Mismatch (or iss absent when the AS advertised authorization_response_iss_parameter_supported)
→ reject, and do not even display the error fields.
PKCE alone does not stop mix-up, because the client hands its code_verifier to whatever
token endpoint it was steered to. This is why the spec records the issuer per-request alongside
the PKCE verifier and state.
Failure modes
• Stale JWKS. The validator rejects valid tokens after the AS rotates a key. The fix is the
cron-refresh + cache-miss-refetch pattern above. Never cache JWKS without a refresh
job.
• Rotate-as-fall-back. Wiring the cache-miss path to a rotate-and-mint instead of a re-
fetch is a real bug: it never produces the missing kid, and it turns attacker-controlled
kid values into a key-creation DoS. The fall-back must be the idempotent refresh-jwks.
• Missing aud claim. Some IdPs default to omitting aud unless resource is present in the
token request. The validator must reject tokens with missing aud, not treat absence as
wildcard.
• Mix-up via missing iss check. A client that does not validate the RFC 9207 iss
authorization-response parameter against the issuer it recorded before redirecting can
be steered into redeeming an honest AS’s code at an attacker’s token endpoint. This is
a client-side failure; the resource server cannot compensate for it.
• Scope upgrade race. Two concurrent step-up flows for the same user can both suc-
ceed and produce two access tokens with different scopes. The validator must use the
token presented on the request, not look up “the user’s current scope” — that creates a
TOCTOU window.
AIENGINEERINGFROMSCRATCH.COM 218

MCP AUTH IN PRODUCTION — ENROLLMENT, JWKS REFRESH, AUDIENCE-PINNED TOKENS
• Registration token theft. A leaked registration_access_token lets the attacker
rewrite redirect URIs. Hash these at rest; require the client to present the cleartext on
every update; rotate on suspicion.
• iss not pinned. A validator that accepts any iss lets an attacker stand up their own
authorization server, register a client for the target audience, and issue tokens. The
protected-resource metadata’s authorization_servers list is the allow-list; enforce it.
Interactive figure: t3-jwks-rotate. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/13-tools-
and-protocols/18-mcp-auth-production
Use It
code/main.py walks the full production flow with stdlib Python and three roles — Authoriza-
tionServer, ResourceServer, and Client. The flow:
1. Authorization server publishes RFC 8414 metadata at /.well-known/oauth-authorization-
server.
2. MCP client calls the metadata endpoint and checks its enrollment options (client_id_metadata_document_supported
for CIMD, registration_endpoint for DCR) and S256 PKCE support.
3. The walk-through takes the DCR fallback path: the client posts to /register (RFC
7591) and receives a client_id. (A CIMD client would instead present its own HTTPS
client_id URL and skip this step.)
4. MCP client runs PKCE-protected authorization code flow (RFC 7636) with resource in-
dicator (RFC 8707).
5. MCP client calls a tool on the MCP server with Authorization: Bearer ....
6. MCP server runs validate, resolving the signing key from the JWKS cache.
7. The IdP rotates a key; the scheduled refresh re-pulls the JWKS into the cache.
8. The next call validates against the refreshed keys without restart, and the previous token
still validates during the overlap window.
9. An audience-replay attempt against a different MCP resource gets 401 with audience
mismatch and a resource_metadata pointer.
The JWT here uses HS256 with a shared secret (so the lesson runs on stdlib only). Production
uses RS256 or EdDSA with the JWKS pattern above; the validation logic is otherwise identical.
Because the IdP and resource server live in one process, refresh_jwks reads the authorization
server’s key list directly; over the wire it is an HTTP GET to jwks_uri.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/13-tools-and-protocols/18-mcp-auth-production
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engine
ering-from-scratch/tree/main/phases/13-tools-and-protocols/18-mcp-auth-production/code
1. Run code/main.py. Trace the flow. Note how the IdP rotates a key in step 6, the sched-
uled refresh_jwks re-pulls the published set, and both the old token (overlap window)
and a fresh token validate without restart.
2. Add a new IdP to the protected-resource metadata’s authorization_servers list. Issue
a token signed by the new IdP and confirm the validator accepts it. Issue a token signed
by an unlisted IdP and confirm the validator rejects with WWW-Authenticate: Bearer
error="invalid_token", error_description="iss not allowed".
AIENGINEERINGFROMSCRATCH.COM 219

MCP AUTH IN PRODUCTION — ENROLLMENT, JWKS REFRESH, AUDIENCE-PINNED TOKENS
3. Add a rate-limit check to register_client that runs before the registrar accepts a re-
quest. Use a token-bucket per source IP held in a small dict keyed by IP.
4. Read RFC 7591 and identify two fields the lesson’s /register handler does not validate.
Add the validation. (Hint: software_statement and redirect_uris URI scheme.)
5. Add a Client ID Metadata Document path. Serve a client.json whose client_id equals
its own URL, and have the authorization server fetch and verify it (reject if client_id ≠
URL). Confirm a CIMD client enrolls with no register_client call.
6. Prove the DoS fix. Send the validator a token with a random kid and confirm re-
fresh_jwks runs at most once and the authorization server’s key count does not grow.
Then deliberately re-wire the fall-back to a rotate-and-mint and watch the key count
climb per bogus token — restore the re-fetch afterward.
7. Implement the client-side RFC 9207 iss check from the mix-up section: record the ex-
pected issuer before the authorization request, then reject an authorization response
whose iss does not match.
Key Terms
Term What people say What it actually means
ASM “OAuth metadata document” RFC 8414
/.well-known/oauth-authorization-server
JSON
CIMD “Client metadata URL” Client ID Metadata Document — an HTTPS
URL used as the client_id; the AS pulls the
JSON. Recommended default since
2025-11-25
DCR “Self-service client RFC 7591 POST /register flow; demoted to a
registration” MAY fallback in 2025-11-25
JWKS “Public keys for JWT JSON Web Key Set, fetched from jwks_uri,
validation” indexed by kid
Rotate vs “Updating the keys” Rotate = AS mints/retires signing keys;
refresh refresh = resource server re-fetches the
published set. Resource servers only ever
refresh
Resource “Audience parameter” RFC 8707 resource parameter pinning the
indicator token to one server
aud claim “Audience” JWT claim the validator compares against the
canonical resource URL
Audience “Token replay” Token issued for Server A presented to
replay Server B; defended by audience validation
(spec: access-token privilege restriction)
Confused “Proxy token misuse” An MCP proxy with a static client ID
deputy forwarding a token without per-client
consent; distinct from audience replay
Mix-up “Wrong token endpoint” Client steered to redeem an honest AS’s code
attack at an attacker’s endpoint; defended
client-side via RFC 9207 iss
iss “Trusted authorization The set named in protected-resource
allow-list servers” metadata’s authorization_servers
AIENGINEERINGFROMSCRATCH.COM 220

MCP AUTH IN PRODUCTION — ENROLLMENT, JWKS REFRESH, AUDIENCE-PINNED TOKENS
Term What people say What it actually means
resource_meta“dWathaere to find the PRM doc” WWW-Authenticate parameter naming the
RFC 9728 metadata URL on a 401/403
Public “Native or browser client” OAuth client with no client_secret; PKCE
client compensates
WWW- “401/403 response header” Carries Bearer error=... directives that
Authenticate drive client recovery
Further Reading
• MCP — Authorization spec (2025-11-25) — the MCP auth profile this lesson implements
• MCP blog — One Year of MCP: November 2025 Spec Release — what changed in 2025-
11-25 (CIMD, XAA, DCR demotion)
• Aaron Parecki — Client Registration in the November 2025 MCP Authorization Spec —
the CIMD-over-DCR rationale
• OAuth Client ID Metadata Document (draft-ietf-oauth-client-id-metadata-document-00)
— CIMD
• RFC 8414 — OAuth 2.0 Authorization Server Metadata — discovery contract
• RFC 7591 — OAuth 2.0 Dynamic Client Registration Protocol — DCR (fallback path)
• RFC 7636 — Proof Key for Code Exchange (PKCE) — public-client proof-of-possession
• RFC 8707 — Resource Indicators for OAuth 2.0 — audience pinning
• RFC 9728 — OAuth 2.0 Protected Resource Metadata — resource server discovery
• RFC 9207 — OAuth 2.0 Authorization Server Issuer Identification — the iss parameter
that defends against mix-up attacks
• OAuth 2.1 draft — the consolidated OAuth substrate
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/13-tools-and-protocols/18-mcp-auth-production
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/13-tools-and-protocols/18-mcp-auth-production/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 221