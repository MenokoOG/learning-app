---
title: "Fairness Criteria — Group, Individual, Counterfactual"
volume: "vol6-production"
part: "Part II — Ethics, Safety & Alignment"
chapter_number: 51
source_pages: "221-224"
---

# Fairness Criteria — Group, Individual, Counterfactual

Fairness Criteria — Group, Individual,
Counterfactual
Three families structure the fairness literature. Group fairness: demographic par-
ity, equalized odds, conditional use accuracy equality — equal rates across pro-
tected groups on average. Individual fairness (Dwork et al. 2012): similar indi-
viduals receive similar decisions; Lipschitz condition on the decision map. Coun-
terfactual fairness (Kusner et al. 2017): a decision is fair to an individual if it
is unchanged when sensitive attributes are counterfactually altered. 2024 the-
oretical result (NeurIPS 2024): there is an inherent CF-vs-accuracy trade-off; a
model-agnostic method converts an optimal-but-unfair predictor into a CF one with
bounded accuracy loss. Backtracking counterfactuals (arXiv:2401.13935, January
2024): new paradigm that avoids requiring interventions on legally protected at-
tributes. Philosophical reconciliation (ICLR Blogposts 2024): with causal graphs,
satisfying certain group fairness measures entails counterfactual fairness.
Type: Learn Languages: Python (stdlib, three-criteria comparison) Prerequisites: Phase
18 · 20 (bias), Phase 02 (classical ML) Time: ~60 minutes
Learning Objectives
• State the three group-fairness criteria (demographic parity, equalized odds, conditional
use accuracy equality) and one impossibility result.
• Describe individual fairness via the Dwork et al. 2012 Lipschitz formulation.
• Describe counterfactual fairness and its causal-graph dependency.
• Explain backtracking counterfactuals and why they sidestep the intervention-on-
protected-attribute problem.
The Problem
Lesson 20 was about measuring bias. Lesson 21 is about defining the fairness standard the
measurement should serve. The three families give structurally different standards — a model
can be group-fair and individual-unfair, counterfactually fair and group-unfair. Choosing a
standard is a policy decision; no standard is universally optimal.
The Concept
Group fairness
• Demographic parity. P(Y=1 | A=a) = P(Y=1 | A=a’) for all groups. Equal acceptance
rates.
• Equalized odds. P(Y=1 | Y=y, A=a) = P(Y=1 | Y=y, A=a’). Equal TPR and FPR across
groups.
AIENGINEERINGFROMSCRATCH.COM 214

FAIRNESS CRITERIA — GROUP, INDIVIDUAL, COUNTERFACTUAL
• Conditional use accuracy equality. P(Y=y | Y=y, A=a) = P(Y=y | Y=y, A=a’). Equal
predictive value across groups.
Impossibility (Chouldechova, Kleinberg-Mullainathan-Raghavan 2017): these three cannot
be satisfied simultaneously under unequal base rates.
Individual fairness
Dwork et al. 2012. A decision map f is individually fair with respect to a task-specific similarity
metric d if |f(x) - f(x’)| <= L * d(x, x’) for some Lipschitz constant L. Similar individuals get
similar decisions.
Requires defining d. Policy question, not statistical.
Counterfactual fairness
Kusner et al. 2017. A decision is counterfactually fair to individual i if, under a causal model
of the population, the decision is unchanged when i’s sensitive attributes are counterfactually
altered.
Requires a causal DAG. The DAG is a modeling choice. Counterfactual fairness is only as
justified as the DAG.
The CF-vs-accuracy trade-off
NeurIPS 2024 theoretical: there is an inherent trade-off between counterfactual fairness and
predictive accuracy. A model-agnostic method can convert an optimal-but-unfair predictor
into a CF one, at a bounded accuracy cost. The accuracy cost depends on the magnitude of
the sensitive-attribute coefficient in the optimal unfair predictor.
Backtracking counterfactuals
arXiv:2401.13935 (January 2024). Traditional counterfactuals require interventions on the
sensitive attribute — “would the decision change if this person had been a different gender.”
Legally, this is problematic: protected attributes cannot be intervened on in classification law.
Backtracking counterfactuals flip the direction: instead of intervening on the attribute, ask
what combination of the individual’s actual features would have produced the counterfactual
outcome. This sidesteps the legal objection.
Philosophical reconciliation
ICLR Blogposts 2024. With a causal graph in hand, satisfying certain group-fairness measures
entails counterfactual fairness. The three families are not orthogonal; they are different facets
of the same underlying causal structure.
This does not resolve the impossibility theorems (unequal base rates still prevent simultane-
ous group fairness). But it shows the apparent opposition between “group” and “individual /
counterfactual” is partially an artifact of not being explicit about the causal model.
Where this fits in Phase 18
Lesson 20 is bias measurement. Lesson 21 is fairness definition. Lesson 22 is privacy (dif-
ferential privacy). Lesson 23 is watermarking. These are the allocation-adjacent lessons
complementing the deception-adjacent Lessons 7-11.
AIENGINEERINGFROMSCRATCH.COM 215

FAIRNESS CRITERIA — GROUP, INDIVIDUAL, COUNTERFACTUAL
Interactive figure: an-fairness-trilemma. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/18-ethics-safety-alignment/21-fairness-criteria-group-individual-counterfactual
Use It
code/main.py builds a toy binary-classification dataset with a sensitive attribute and unequal
base rates. Compute demographic parity, equalized odds, and conditional use accuracy equal-
ity on a simple classifier. Observe the three metrics disagreeing. Apply a re-weighting for
demographic parity and observe its cost on the other two.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/18-ethics-safety-alignment/21-fairness-criteria-
group-individual-counterfactual
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/18-ethics-safety-alignment/21-fairness-criteria-
group-individual-counterfactual/code
1. Run code/main.py. Report the three group metrics on the default data. Apply the
demographic-parity-targeted re-weighting and re-report.
2. Implement the Dwork et al. 2012 individual-fairness metric using L2 on non-sensitive
features. Report how many pairs violate Lipschitz with constant L=1.
3. Read Kusner et al. 2017. Construct a simple two-feature causal DAG for resume scoring
and identify the counterfactual-fairness condition it implies.
4. The 2024 backtracking-counterfactuals paper avoids intervention on protected at-
tributes. Describe a scenario where this matters for legal compliance.
5. The ICLR 2024 reconciliation argues group and counterfactual fairness are facets of
the same structure. Pick two of the three criteria in code/main.py and state the causal
assumption that would make them equivalent.
Key Terms
Term What people say What it actually means
Demographic“equal rates” P(Y=1
parity
Equalized “equal TPR/FPR” Equal true-positive and false-positive rates
odds across groups
Conditional “equal PPV/NPV” Equal predictive values across groups
use
accuracy
Individual “Lipschitz condition” Similar individuals get similar decisions
fairness
Counterfactua“lcausal alteration invariance” Decision unchanged under counterfactual
fairness attribute alteration
AIENGINEERINGFROMSCRATCH.COM 216

FAIRNESS CRITERIA — GROUP, INDIVIDUAL, COUNTERFACTUAL
Term What people say What it actually means
Backtracking“explain via actuals” Counterfactual reasoned backward from
counterfac- outcome, not forward from attribute
tual
Impossibility “the three conflict” Chouldechova / KMR 2017: group criteria
theorem mutually exclusive under unequal base rates
Further Reading
• Dwork et al. — Fairness through Awareness (arXiv:1104.3913) — individual fairness
• Kusner, Loftus, Russell, Silva — Counterfactual Fairness (arXiv:1703.06856) — counter-
factual fairness
• Chouldechova — Fair prediction with disparate impact (arXiv:1703.00056) — impossibil-
ity
• Backtracking Counterfactuals (arXiv:2401.13935) — new paradigm for protected-
attribute interventions
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.c
om/lesson.html?path=phases/18-ethics-safety-alignment/21-fairness-criteria-group-
individual-counterfactual
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/18-ethics-safety-alignment/21-fairness-criteria-group-individual-
counterfactual/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesso
n.html?path=phases/18-ethics-safety-alignment/21-fairness-criteria-group-individual-
counterfactual
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 217