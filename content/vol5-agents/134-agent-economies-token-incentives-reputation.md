---
title: "Agent Economies, Token Incentives, Reputation"
volume: "vol5-agents"
part: "Part V — Multi-Agent & Swarms"
chapter_number: 134
source_pages: "647-651"
---

# Agent Economies, Token Incentives, Reputation

Agent Economies, Token Incentives,
Reputation
Long-horizon autonomous agents (METR’s 1-hour to 8-hour work-curve) need eco-
nomic agency. The emerging 5-layer stack is: DePIN (physical compute) → Iden-
tity (W3C DIDs + reputation capital) → Cognition (RAG + MCP) → Settlement
(account abstraction) → Governance (Agentic DAOs). Production agent-incentive
networks include Bittensor (TAO subnets reward task-specific models), Fetch.ai /
ASI Alliance (ASI-1 Mini LLM + FET token), and Gonka (transformer-based PoW
that reallocates compute to productive AI tasks). Academic work: AAMAS 2025’s
decentralized LaMAS uses Shapley-value credit attribution to fairly reward con-
tributing agents; Google Research “Mechanism design for large language models”
proposes token auctions with second-price payment under monotone aggregation.
This lesson builds a minimal agent marketplace, applies Shapley-value credit at-
tribution to a multi-agent pipeline, and runs a second-price token auction so the
game-theory machinery lands concretely.
Type: Learn Languages: Python (stdlib) Prerequisites: Phase 16 · 16 (Negotiation and
Bargaining), Phase 16 · 09 (Parallel Swarm Networks) Time: ~75 minutes
Problem
Multi-agent systems get complicated when agents produce value jointly but need to be re-
warded individually. Classical mechanisms — equal split, last-contributor-takes-all — are
unfair or gameable. Coalition-based rewarding via Shapley values is fair by construction but
expensive to compute. The 2025-2026 literature pushes useful approximations: Shapley sam-
pling, monotone aggregation auctions, and on-chain reputation that accrues from confirmed
contributions.
Beyond credit attribution, the field has turned to actual economic agents: Bittensor TAO re-
wards mining compute to fine-tune subnet-specific models, Fetch.ai/ASI rewards ASI-1 Mini
LLM usage with FET tokens, Gonka reallocates transformer proof-of-work toward productive
AI tasks. Agents that transact autonomously exist today; the question is how to align incen-
tives.
This lesson treats agent economies as a specific problem family — credit attribution, mecha-
nism design, and reputation — and builds each with the minimal math so the ideas stick.
Concept
The 5-layer agent-economy stack
1. DePIN (physical compute). Decentralized infrastructure that rents GPU, storage,
bandwidth. Bittensor subnets, Render Network, Akash. Not agent-specific; agents use
it.
AIENGINEERINGFROMSCRATCH.COM 641

AGENT ECONOMIES, TOKEN INCENTIVES, REPUTATION
2. Identity. W3C Decentralized Identifiers (DIDs) give each agent a durable ID indepen-
dent of any platform. Reputation accrues to the DID. The Agent Network Protocol (ANP)
uses DID as the discovery layer.
3. Cognition. The agent’s reasoning loop: LLM + RAG + MCP. This is what the other
phases build.
4. Settlement. Account abstraction (ERC-4337) lets agents pay gas from their own bal-
ances without holding ETH. Agents can pay for services, each other, or compute.
5. Governance. Agentic DAOs: governance structures where humans and agents vote on
protocol changes, with voting power tied to reputation.
Not every production system uses all five. Bittensor uses 1, 2, partially 3, partially 4, none of
5. OpenAI agents use none except 3. The stack is a reference map, not a requirement.
Bittensor, Fetch.ai, Gonka — what runs
Bittensor (TAO). Subnets are specialized tasks (language modeling, image generation, fore-
casting). Miners submit model outputs. Validators rank them; stake-weighted scoring dis-
tributes the TAO rewards. Each subnet has its own evaluation. The economic lesson: pay for
task-specific output quality, not compute used.
Fetch.ai / ASI Alliance. ASI-1 Mini LLM runs on Fetch.ai’s network; users pay FET tokens
for inference. The agents-as-peers narrative is stronger here: an agent on Fetch can call
another for a task and pay in FET.
Gonka. Transformer proof-of-work: the “work” is forward passes of a transformer. Min-
ers earn by running inference tasks that have known correct outputs (from training data).
Resource-productive PoW instead of hash-based PoW.
All three are production-grade as of April 2026. Payoff distribution differs. Bittensor rewards
quality relative to subnet validators; Fetch rewards utility measured by paying users; Gonka
rewards verifiable inference work.
Shapley-value credit attribution
Three agents collaborate on a task. The output scores 0.8. Who contributed what?
Shapley value: the unique credit allocation satisfying four axioms (efficiency, symmetry, lin-
earity, null). For agent i:
shapley(i) = (1/N!) * sum over all orderings O of (v(S_i_O ∪ {i}) - v(S_i_O))
where S_i_O is the set of agents before i in ordering O. In practice: enumerate all permuta-
tions, record marginal contribution of each agent in each permutation, average.
For N=3 agents, there are 6 permutations. For N=10, 3.6M — so in practice you sample
orderings rather than enumerate.
Second-price auction for aggregation
Google Research (“Mechanism design for large language models”) proposes second-price
token auctions for aggregating LLM outputs. Setup: N agents each propose a completion;
each has a private value for being selected. The auctioneer picks the highest-value proposal
and pays the second-highest value. Under monotone aggregation (value depends on which
proposal is chosen, not how many were bid), this is truthful — agents bid their true value.
Why this matters for LLM systems: you can outsource completion tasks to multiple agents
with different pricing; the auction picks the best + pays fairly, and agents have no incentive
to misreport.
AIENGINEERINGFROMSCRATCH.COM 642

AGENT ECONOMIES, TOKEN INCENTIVES, REPUTATION
Reputation capital
A DID-bound reputation score accumulates from confirmed contributions. A simple update
rule:
rep(i, t+1) = alpha * rep(i, t) + (1 - alpha) * contribution_quality(i, t)
With decay factor alpha close to 1. Reputation:
• Is cheap to read for routing decisions (“send hard tasks to high-rep agents”).
• Is expensive to forge (accumulates over time, bound to DID).
• Can be slashed: contributions that fail verification subtract.
AAMAS 2025 decentralized LaMAS
The LaMAS proposal (AAMAS 2025) combines: DID identity, Shapley-value credit attribution,
and a simple auction mechanism. The key claim: decentralizing the credit attribution step
makes the system auditable and immune to single-point manipulation.
Where the economics falls apart
• Price oracle manipulation. If the credit function can be gamed, agents will game it.
Every mechanism needs an adversarial test.
• Sybil attacks. One operator spins up N fake agents to inflate their own contribution.
DIDs slow but do not stop this; reputation cost-to-forge is the mitigation.
• Verification cost. Credit attribution is only as fair as the verifier. If verification is cheap
(small LLM), it can be gamed; if expensive (human panel), the system does not scale.
• Regulatory overhang. Agent economies intersect with financial regulation. Bittensor,
Fetch, and Gonka all operate in legal gray areas in some jurisdictions as of 2026.
When agent economies make sense
• Open networks with heterogeneous operators. No single team controls all agents.
• Verifiable outputs. Without verification, credit attribution is a guess.
• Long-horizon workflows. One-shot tasks do not benefit from reputation accumulation.
• Tokenized payments are legally viable in your jurisdiction.
In closed corporate systems, economics gives way to simpler allocation (managers assign
work, metrics are internal). The economics literature applies mostly to open networks.
Interactive figure: swarm-auction. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/16-
multi-agent-and-swarms/21-agent-economies
Build It
code/main.py implements:
• shapley(value_fn, agents) — exact Shapley computation by enumeration for small N.
• second_price_auction(bids) — truthful mechanism; winner pays second-highest.
• Reputation — DID-bound reputation with exponential decay and slashing.
• Demo 1: three agents collaborate, exact Shapley attributes credit.
• Demo 2: five agents bid for a task slot; second-price auction picks winner + payment.
• Demo 3: 100 rounds of task assignment to agents with heterogeneous rep; rep-weighted
routing beats random.
AIENGINEERINGFROMSCRATCH.COM 643

AGENT ECONOMIES, TOKEN INCENTIVES, REPUTATION
Run:
python3 code/main.py
Expected output: Shapley values for each agent; auction result showing truthful-bid equilib-
rium; rep-weighted routing showing 10-20% quality gain over random after warmup.
Use It
outputs/skill-economy-designer.md designs a minimal agent economy: choice of identity
layer, credit attribution mechanism, payment mechanism, reputation rule.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg0
0/ai-engineering-from-scratch/tree/main/phases/16-multi-agent-and-swarms/21-agent-
economies
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engine
ering-from-scratch/tree/main/phases/16-multi-agent-and-swarms/21-agent-economies/code
1. Run code/main.py. Confirm Shapley values sum to total value (efficiency axiom). Change
the value function; do Shapley allocations change in the expected direction?
2. Implement Shapley sampling (Monte Carlo over K orderings). How does K affect approx-
imation accuracy? Compare to exact for N=4.
3. Implement a coalition-forming step before the auction: agents can merge into teams
and bid as a unit. Which coalitions form? Is the outcome Pareto-better than individual
bidding?
4. Read the Google Research mechanism-design post. Identify one assumption that, if vio-
lated, breaks truthfulness. What does that failure mode look like in an LLM setting?
5. Read the AAMAS 2025 decentralized LaMAS paper. Implement their Shapley step over
10 agents on a synthetic task. How long does exact computation take? How close does
sampling get with 100 draws?
Key Terms
Term What people say What it actually means
DePIN “Decentralized physical Token-incentivized
infrastructure” compute/storage/bandwidth. Bittensor,
Akash, Render.
DID “Decentralized identifier” W3C spec for portable IDs. Agent reputation
binds to DID, not to a platform.
ERC-4337 “Account abstraction” Contract accounts that can sponsor gas,
enabling agent payments.
Shapley “Fair credit attribution” Unique allocation satisfying efficiency,
value symmetry, linearity, null.
Second- “Vickrey auction” Truthful mechanism: winner pays
price second-highest bid. Monotone aggregation
auction compatible.
AIENGINEERINGFROMSCRATCH.COM 644

AGENT ECONOMIES, TOKEN INCENTIVES, REPUTATION
Term What people say What it actually means
Reputation “Accumulated quality score” DID-bound score from confirmed
capital contributions; decays over time.
Agentic “Agents + humans govern” DAO with agent voters as first-class, voting
DAO power tied to reputation.
TAO / FET / “Token denominations” Bittensor TAO, Fetch.ai FET, various DePIN
GPU tokens.
credits
Further Reading
• The Agent Economy — 2026 survey of the 5-layer agent-economy stack
• Google Research — Mechanism design for large language models — token auctions with
monotone aggregation
• AAMAS 2025 — decentralized LaMAS — Shapley-value credit attribution
• Bittensor TAO documentation — subnet structure and reward distribution
• Fetch.ai / ASI Alliance — ASI-1 Mini LLM and FET token
• W3C Decentralized Identifiers (DIDs) spec — identity foundation
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/16-multi-agent-and-swarms/21-agent-economies
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/16-multi-agent-and-swarms/21-agent-economies/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 645