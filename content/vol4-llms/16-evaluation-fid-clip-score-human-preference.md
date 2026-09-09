---
title: "Evaluation — FID, CLIP Score, Human Preference"
volume: "vol4-llms"
part: "Part I — Generative AI"
chapter_number: 16
source_pages: "79-84"
---

# Evaluation — FID, CLIP Score, Human Preference

Evaluation — FID, CLIP Score, Human
Preference
Every generative model leaderboard cites FID, CLIP score, and a win rate from a
human-preference arena. Each number has a failure mode a determined researcher
can game. If you do not know the failure modes, you cannot tell a real improvement
from a gaming run.
Type: Build Languages: Python Prerequisites: Phase 8 · 01 (Taxonomy), Phase 2 · 04
(Evaluation Metrics) Time: ~45 minutes
The Problem
A generative model is judged on sample quality and conditioning adherence. Neither has a
closed-form measure. Your model has to render 10,000 images; something has to assign them
numbers; you have to trust the numbers across model families, across resolutions, across
architectures. Three metrics survived the 2014-2026 gauntlet:
• FID (Fréchet Inception Distance). A distance between two distributions — real and
generated — in an Inception network’s feature space. Lower is better.
• CLIP score. Cosine similarity between a generated image’s CLIP-image embedding and
a prompt’s CLIP-text embedding. Higher is better. Measures prompt adherence.
• Human preference. Pit two models head-to-head on the same prompt, have humans
(or a GPT-4-class model) pick the better one, aggregate to an Elo score.
You will also see: IS (inception score, largely retired), KID, CMMD, ImageReward, PickScore,
HPSv2, MJHQ-30k. Each corrects for one failure of the previous.
The Concept
FID — sample quality
Heusel et al. (2017). Steps:
1. Extract Inception-v3 features (2048-D) for N real images and N generated.
2. Fit a Gaussian to each pool: compute mean μ_r, μ_g and covariance Σ_r, Σ_g.
3. FID = ||μ_r - μ_g||² + Tr(Σ_r + Σ_g - 2 · (Σ_r · Σ_g)^0.5).
Interpretation: Fréchet distance between two multivariate Gaussians in feature space. Lower
= more similar distributions.
Failure modes: - Biased on small N. FID is mean-squared over the feature distribution
— small N under-estimates covariance, gives falsely low FID. Always use N ≥ 10,000. -
Inception-dependent. Inception-v3 was trained on ImageNet. Domains far from ImageNet
(faces, art, text images) produce meaningless FID. Use a domain-specific feature extractor. -
Gaming. Overfitting to the Inception prior gives low FID without visual quality improvement.
Beat it with CMMD (below).
AIENGINEERINGFROMSCRATCH.COM 75

EVALUATION — FID, CLIP SCORE, HUMAN PREFERENCE
three-pillar evaluation of generative models
FID (sample quality) CLIP score (adherence) human preference (truth)
||μ_r - μ_g||² + Tr(Σ_r + Σ_g - 2√Σ_rΣ_g) cos( CLIP_image(x), CLIP_text(p) ) Elo from pairwise wins
Fréchet distance between how well does output match prompt? A vs B on same prompt
Gaussian fits in Inception-v3 space HPSv2 / ImageReward / PickScore
compositional failures slip through
use N ≥ 10k or numbers lie short prompts score higher mechanically as automated proxies
ImageNet-biased; use FD-DINO or CMMD + VQA tests cover CLIP blind spots Chatbot-Arena-style image arenas
CMMD out of domain
lower = better higher = better higher win rate = better
each metric has a known game
FID: overfit Inception prior → low FID, same quality
CLIP: saturate with 'masterpiece, 4k' → inflated score
preference: prompt set overlap with training → rigged
production eval report
1. FID on 10-30k + 2. CLIP / CMMD on the same pool +
3. 200+ blind human-pair Elo + 4. qualitative failure audit on 50 outputs
one metric = marketing; four = evidence
Figure 14: FID, CLIP, and preference: three axes, different failure modes
CLIP score — prompt adherence
Radford et al. (2021). For a generated image + prompt:
clip_score = cos_sim( CLIP_image(x_gen), CLIP_text(prompt) )
Average across 30k generated images → a scalar comparable between models.
Failure modes: - CLIP’s own blind spots. CLIP has weak compositional reasoning (“a red
cube on a blue sphere” often fails). Models can rank well on CLIP score without really follow-
ing complex prompts. - Short prompt bias. Short prompts have more CLIP-image matches
in the wild. Longer prompts have lower CLIP scores mechanically. - Prompt gaming. In-
cluding “high quality, 4k, masterpiece” in the prompt inflates CLIP score without improving
image-text binding.
CMMD (Jayasumana et al., 2024) fixes some of these: uses CLIP features instead of Incep-
tion, maximum-mean discrepancy instead of Fréchet. Better at detecting subtle quality dif-
ferences.
Human preference — the ground truth
Pick a pool of prompts. Generate with model A and model B. Show pairs to humans (or a
strong LLM judge). Aggregate wins into an Elo or Bradley-Terry score. Benchmarks:
• PartiPrompts (Google): 1,600 diverse prompts, 12 categories.
• HPSv2: 107k human annotations, widely used as automated proxy.
• ImageReward: 137k prompt-image preference pairs, MIT-licensed.
• PickScore: trained on Pick-a-Pic 2.6M preferences.
• Chatbot-Arena-style image arenas: https://imagearena.ai/ and others.
Failure modes: - Judge variance. Non-experts have different preferences than experts. Use
AIENGINEERINGFROMSCRATCH.COM 76

EVALUATION — FID, CLIP SCORE, HUMAN PREFERENCE
both. - Prompt distribution. Cherry-picked prompts favor one family. Always document. -
LLM-judge reward hacking. GPT-4-judge gets fooled by pretty-but-wrong outputs. Trian-
gulate with human.
Use together
A production eval report should include:
1. FID on 10-30k samples against a held-out real distribution (sample quality).
2. CLIP score / CMMD on the same samples vs their prompts (adherence).
3. Win rate in a blinded arena vs the previous model (overall preference).
4. Failure mode analysis: 50 randomly sampled outputs, flagged for known issues (hand
anatomy, text rendering, consistent object count).
Any single metric is a lie. Three corroborating metrics + qualitative review are a claim.
Interactive figure: gx-fid-distributions. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/08-generative-ai/14-evaluation-fid-clip-score
Build It
code/main.py implements FID, CLIP-score-like, and Elo aggregation on synthetic “feature
vectors” (we use 4-D vectors as stand-ins for Inception features). You see:
• FID computation on a small N and on a large N — the bias.
• “CLIP score” as cosine similarity between feature pools.
• Elo update rule from a synthetic preference stream.
Step 1: FID in four lines
def fid(real_features, gen_features):
mu_r, cov_r = mean_and_cov(real_features)
mu_g, cov_g = mean_and_cov(gen_features)
mean_diff = sum((a - b) ** 2 for a, b in zip(mu_r, mu_g))
trace_term = trace(cov_r) + trace(cov_g) - 2 * sqrt_cov_product(cov_r, cov_g)
return mean_diff + trace_term
Step 2: CLIP-style cosine-similarity
def clip_like(image_feat, text_feat):
dot = sum(a * b for a, b in zip(image_feat, text_feat))
norm = math.sqrt(dot_self(image_feat) * dot_self(text_feat))
return dot / max(norm, 1e-8)
Step 3: Elo aggregation
def elo_update(r_a, r_b, winner, k=32):
expected_a = 1 / (1 + 10 ** ((r_b - r_a) / 400))
actual_a = 1.0 if winner == "a" else 0.0
r_a_new = r_a + k * (actual_a - expected_a)
r_b_new = r_b - k * (actual_a - expected_a)
return r_a_new, r_b_new
AIENGINEERINGFROMSCRATCH.COM 77

EVALUATION — FID, CLIP SCORE, HUMAN PREFERENCE
Pitfalls
• FID at N=1000. Heuristic is unreliable under N=10k. Papers reporting low-N FID are
gaming.
• Comparing FID across resolutions. Inception’s 299×299 resize changes the feature
distribution. Compare at matched resolution only.
• Reporting one seed. Run 3 seeds minimum. Report std.
• CLIP score inflation via negative prompts. Some pipelines boost CLIP by over-fitting
the prompt. Check for visual saturation.
• Elo bias from prompt overlap. If both models saw a benchmark prompt during train-
ing, Elo is meaningless. Use held-out prompt sets.
• Human eval paid-crowd skew. Prolific, MTurk annotators skew younger / tech-friendly.
Mix with recruited art/design experts.
Use It
Production eval protocol in 2026:
Pillar Minimum Recommended
Sample quality FID on 10k vs held-out + CMMD on 5k + FID on subset per
real category
Prompt adherence CLIP score on 30k + HPSv2 + ImageReward +
VQA-style question answering
Preference 200 blinded pairs vs + 2000 paired human + LLM-judge +
baseline Chatbot Arena
Failure analysis 50 hand-flagged 500 hand-flagged + automated safety
classifier
All four pillars in one report = claim. Any one alone = marketing.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/08-generative-ai/14-evaluation-fid-clip-score
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/08-generative-ai/14-evaluation-fid-clip-score/code
1. Easy. Run code/main.py. Compare FID at N=100 vs N=1000 on the same synthetic
distributions. Report bias magnitude.
2. Medium. Implement CMMD from synthetic CLIP-style features (see Jayasumana et al.,
2024 for the formula). Compare sensitivity to quality differences vs FID.
3. Hard. Replicate the HPSv2 setup: take 1000 image-prompt pairs from a subset of Pick-a-
Pic, fine-tune a small CLIP-based scorer on the preferences, and measure its agreement
with a held-out set.
Key Terms
AIENGINEERINGFROMSCRATCH.COM 78

EVALUATION — FID, CLIP SCORE, HUMAN PREFERENCE
Term What people say What it actually means
FID “Fréchet Inception Distance” Fréchet distance of Gaussian fits to real vs
gen Inception features.
CLIP score “Text-image similarity” Cosine similarity between CLIP image and
text embeddings.
CMMD “FID’s replacement” CLIP-feature MMD; less biased, no
Gaussian assumption.
IS “Inception score” Exp KL(p(y
HPSv2 / “Learned preference proxies” Small models trained on human
ImageRe- preferences; used as automatic judges.
ward /
PickScore
Elo “Chess rating” Bradley-Terry aggregation of pairwise wins.
PartiPrompts “The benchmark prompt set” 1,600 Google-curated prompts across 12
categories.
FD-DINO “Self-sup replacement” FD using DINOv2 features; better for
out-of-ImageNet domains.
Production note: evaluation is an inference workload too
Running FID on 10k samples means generating 10k images. For a 50-step SDXL base at
1024² on a single L4, that is ~11 hours of single-request inference. Evaluation budgets are
real, and the framing is exactly the offline-inference scenario (maximize throughput, ignore
TTFT):
• Batch hard, forget latency. Offline eval = static batching at the largest size that fits in
memory. pipe(...).images with num_images_per_prompt=8 on an 80GB H100 runs 4-6×
faster wall-clock than single-request.
• Cache the real features. The Inception (FID) or CLIP (CLIP-score, CMMD) feature
extraction over the real reference set is run once, stored as a .npz. Do not recompute
per eval.
For CI / regression gates: run FID + CLIP score on a 500-sample subset per PR (~30 min);
run full 10k FID + HPSv2 + Elo nightly.
Further Reading
• Heusel et al. (2017). GANs Trained by a Two Time-Scale Update Rule Converge to a
Local Nash Equilibrium (FID) — FID paper.
• Jayasumana et al. (2024). Rethinking FID: Towards a Better Evaluation Metric for Image
Generation (CMMD) — CMMD.
• Radford et al. (2021). Learning Transferable Visual Models from Natural Language Su-
pervision (CLIP) — CLIP.
• Wu et al. (2023). HPSv2: A Comprehensive Human Preference Score — HPSv2.
• Xu et al. (2023). ImageReward: Learning and Evaluating Human Preferences for Text-
to-Image Generation — ImageReward.
• Yu et al. (2023). Scaling Autoregressive Models for Content-Rich Text-to-Image Genera-
tion (Parti + PartiPrompts) — PartiPrompts.
• Stein et al. (2023). Exposing flaws of generative model evaluation metrics — failure-
mode survey.
Continue online. The living edition of this chapter has more than the page can hold:
AIENGINEERINGFROMSCRATCH.COM 79

EVALUATION — FID, CLIP SCORE, HUMAN PREFERENCE
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/08-generative-ai/14-evaluation-fid-clip-score
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/08-generative-ai/14-evaluation-fid-clip-score/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 80