---
title: "Frontier Safety Frameworks — RSP, PF, FSF"
volume: "vol6-production"
part: "Part II — Ethics, Safety & Alignment"
chapter_number: 48
source_pages: "209-212"
---

# Frontier Safety Frameworks — RSP, PF, FSF

Frontier Safety Frameworks — RSP, PF,
FSF
Three major-lab frameworks define the 2026 industry governance of frontier capa-
bility. Anthropic Responsible Scaling Policy v3.0 (February 2026) introduces tiered
AI Safety Levels (ASL-1 through ASL-5+), modeled on biosafety levels, with ASL-3
activated May 2025 for CBRN-relevant models. OpenAI Preparedness Framework
v2 (April 2025) defines five criteria for tracked capabilities and separates Capa-
bilities Reports from Safeguards Reports. DeepMind Frontier Safety Framework
v3.0 (September 2025) introduces Critical Capability Levels including a new Harm-
ful Manipulation CCL. All three now include competitor-adjustment clauses allow-
ing deferral if peer labs ship without comparable safeguards. Cross-lab alignment
remains structural, not terminological: “Capability Thresholds,” “High Capability
thresholds,” and “Critical Capability Levels” denote analogous constructs.
Type: Learn Languages: none Prerequisites: Phase 18 · 17 (WMDP), Phase 18 · 07-09
(deception failures) Time: ~75 minutes
Learning Objectives
• Describe Anthropic’s ASL tier structure and what activated ASL-3.
• Name the five OpenAI Preparedness Framework v2 criteria for tracked capabilities.
• Describe DeepMind’s Critical Capability Level structure and the Harmful Manipulation
CCL.
• Explain the competitor-adjustment clauses and why they matter for race dynamics.
• Define a safety case and describe the three-pillar structure (monitoring, illegibility, in-
capability).
The Problem
Lessons 7-17 establish that deception is possible, dual-use capability exists, and evaluation
has limits. A lab with a frontier-capable model needs an internal governance structure that:
- Defines thresholds for when new safeguards are required. - Defines required evaluations
before scaling. - Describes what a safety case looks like. - Handles the race-dynamic problem
(if competitors ship without safeguards, what do you do?).
The three 2025-2026 frameworks are the state of the art — imperfect, evolving, and aligned
enough across labs that the governance question is now whether the frameworks are ade-
quate, not whether they exist.
AIENGINEERINGFROMSCRATCH.COM 202

FRONTIER SAFETY FRAMEWORKS — RSP, PF, FSF
The Concept
Anthropic Responsible Scaling Policy v3.0 (February 2026)
ASL structure: - ASL-1: not a frontier model (subsumed by weaker-than-frontier baseline).
- ASL-2: current frontier baseline; deployed with usual safeguards. - ASL-3: substantially
higher risk of catastrophic misuse; CBRN-relevant capabilities. Activated May 2025. - ASL-4:
AI R&D-2 crossing threshold; models that can automate entry-level AI research. - ASL-5+:
advanced AI R&D; models that dramatically accelerate effective scaling.
New in v3.0: - Frontier Safety Roadmaps (public in redacted form). - Risk Reports (quarterly,
some externally reviewed). - AI R&D is disaggregated into AI R&D-2 and AI R&D-4. - Once AI
R&D-4 is crossed, an affirmative safety case is required, identifying misalignment risks from
models pursuing misaligned goals.
OpenAI Preparedness Framework v2 (April 15, 2025)
Five criteria for tracked capabilities: - Plausible. Reasonable threat model exists. - Measur-
able. Empirical evaluation possible. - Severe. Harm is large. - Net-new. Not a pre-existing
risk scaled up. - Instantaneous-or-irremediable. Harm occurs fast or cannot be undone.
Capabilities that meet all five are tracked. Others are not.
Other PF v2 structure: - Separate Capabilities Reports (what the model can do) from Safe-
guards Reports (what controls exist). - Safety Advisory Group reviews. - Leadership approves;
Board’s Safety & Security Committee oversees. - “Adjustment clause”: OpenAI may reduce
requirements if another lab ships without comparable safeguards.
DeepMind Frontier Safety Framework v3.0 (September 2025)
Critical Capability Levels (CCLs) by domain: - Bioweapon Uplift - Cyber Uplift - ML R&D
Acceleration - Harmful Manipulation (new in v3.0): models that could substantially change
beliefs/behavior in high-stakes contexts.
v2.0 (February 2025) added a Deceptive Alignment section and higher security levels for ML
R&D CCLs.
Cross-lab alignment
• Anthropic “Capability Thresholds.”
• DeepMind “Critical Capability Levels.”
• OpenAI “High Capability thresholds.”
No industry-standard terminology. Structurally aligned: three tiers of frontier capability with
published evaluation criteria. All three include competitor-adjustment clauses (2025 onward).
Safety cases
A safety case is a written argument that a deployment is acceptably safe under worst-case
assumptions. The standard structure targets three pillars:
• Monitoring. Can we detect bad behaviour if it occurs?
• Illegibility. Does the model lack the ability to execute a coherent plan to cause harm?
• Incapability. Does the model lack the capability to cause the harm in question?
AIENGINEERINGFROMSCRATCH.COM 203

FRONTIER SAFETY FRAMEWORKS — RSP, PF, FSF
Different safety cases target different pillars. For a ASL-3 CBRN case, incapability (via un-
learning) is the primary target. For deceptive alignment, monitoring and illegibility are tar-
gets. For cyber uplift, all three are relevant.
The race-dynamic problem
Competitor-adjustment clauses are controversial. Critics argue they create a race to the
bottom: if all three labs will reduce requirements when a competitor defects, the equilibrium
shifts toward defection. Defenders argue the alternative (unilateral safeguards) produces
worse outcomes if the defecting lab is less safety-conscious.
UK AISI, US CAISI, and EU AI Office (Lesson 24) are the external governance counterparts.
The lab frameworks are voluntary; the regulatory frameworks are emerging.
Where this fits in Phase 18
Lessons 17-18 are the measurement-and-governance layer on top of the deception and red-
team analyses. Lessons 19-24 cover welfare, bias, privacy, watermarking, and regulatory
structure. Lesson 28 maps the research ecosystem (MATS, Redwood, Apollo, METR) that
operationalizes the evaluations.
Interactive figure: al-asl-ladder. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/18-
ethics-safety-alignment/18-frontier-safety-frameworks-rsp-pf-fsf
Use It
No code for this lesson. Read the three primary sources: RSP v3.0, PF v2, FSF v3.0. Map
each lab’s tier structure to the others and identify one threshold each lab defines that the
others do not.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/18-ethics-safety-alignment/18-frontier-safety-
frameworks-rsp-pf-fsf
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/18-ethics-safety-alignment/18-frontier-safety-
frameworks-rsp-pf-fsf/code
1. Read RSP v3.0, PF v2, and FSF v3.0. Compile a table of each lab’s CBRN threshold,
each’s AI R&D threshold, and each’s required pre-deployment evaluation.
2. The competitor-adjustment clause is in all three frameworks (2025+). Write one para-
graph arguing for it; write one paragraph arguing against. Identify the assumption each
position depends on.
3. Design a safety case for a model crossing Anthropic’s AI R&D-4 threshold. Name the
evidence each of the three pillars (monitoring, illegibility, incapability) requires.
4. DeepMind’s FSF v3.0 introduces a Harmful Manipulation CCL. Propose three empirical
measurements that would indicate a model has crossed this threshold.
AIENGINEERINGFROMSCRATCH.COM 204

FRONTIER SAFETY FRAMEWORKS — RSP, PF, FSF
5. Read METR’s “Common Elements of Frontier AI Safety Policies” (2025). Name the three
strongest cross-lab convergences and the two largest divergences.
Key Terms
Term What people say What it actually means
RSP “Anthropic’s framework” Responsible Scaling Policy; ASL tiers; v3.0
February 2026
PF “OpenAI’s framework” Preparedness Framework; five criteria; v2
April 2025
FSF “DeepMind’s framework” Frontier Safety Framework; CCLs; v3.0
September 2025
ASL-3 “biosafety level 3-analog” Anthropic tier for CBRN-relevant
capabilities; activated May 2025
CCL “critical capability level” DeepMind’s threshold construct; per-domain
Safety “the formal argument” Written argument that deployment is
case acceptably safe under worst-case U
Adjustment “competitor defection Framework provision for reducing
clause allowance” requirements if competitors ship without
comparable safeguards
Further Reading
• Anthropic — Responsible Scaling Policy v3.0 (February 2026) — ASL tiers, roadmaps, AI
R&D disaggregation
• OpenAI — Updating the Preparedness Framework (April 15, 2025) — five criteria, ad-
justment clause
• DeepMind — Strengthening our Frontier Safety Framework (September 2025) — CCL
v3.0, Harmful Manipulation
• METR — Common Elements of Frontier AI Safety Policies (2025) — cross-lab comparison
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com
/lesson.html?path=phases/18-ethics-safety-alignment/18-frontier-safety-frameworks-
rsp-pf-fsf
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/18-ethics-safety-alignment/18-frontier-safety-frameworks-rsp-pf-
fsf/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/18-ethics-safety-alignment/18-frontier-safety-frameworks-rsp-pf-fsf
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 205