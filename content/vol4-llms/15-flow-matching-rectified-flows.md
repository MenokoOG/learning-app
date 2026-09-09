---
title: "Flow Matching & Rectified Flows"
volume: "vol4-llms"
part: "Part I — Generative AI"
chapter_number: 15
source_pages: "73-78"
---

# Flow Matching & Rectified Flows

Flow Matching & Rectified Flows
Diffusion models take 20-50 sampling steps because they walk a curved path from
noise to data. Flow matching (Lipman et al., 2023) and rectified flow (Liu et al.,
2022) trained straight paths. Straighter paths mean fewer steps mean faster infer-
ence. Stable Diffusion 3, Flux.1, and AudioCraft 2 all switched to flow matching in
2024.
Type: Build Languages: Python Prerequisites: Phase 8 · 06 (DDPM), Phase 1 · Calculus
Time: ~45 minutes
The Problem
DDPM’s reverse process is a 1000-step stochastic walk from N(0, I) back to the data distri-
bution. DDIM collapsed it to 20-50 deterministic steps. You want fewer steps — ideally one.
The blocker is that the ODE solving the reverse process is stiff; the path is curved.
If you could train the model such that the path from noise to data was a straight line, a single
Euler step from t=1 to t=0 would work. Flow matching builds this directly: define a straight-
line interpolation from x_1 ∼ N(0, I) to x_0 ∼ data, train a vector field v_θ(x, t) to match
its time derivative, integrate at inference.
Rectified flow (Liu 2022) goes further: iteratively straighten the paths with a reflow proce-
dure that produces a progressively closer-to-linear ODE. After two reflow iterations, a 2-step
sampler matches 50-step DDPM quality.
The Concept
Straight-line flow
Define:
x_t = t · x_1 + (1 - t) · x_0, t ∈ [0, 1]
where x_0 ~ data and x_1 ~ N(0, I). The time derivative along this straight line is constant:
dx_t / dt = x_1 - x_0
Define a neural vector field v_θ(x_t, t) and train it to match this derivative:
L = E_{x_0, x_1, t} || v_θ(x_t, t) - (x_1 - x_0) ||²
This is the conditional flow matching loss (Lipman 2023). Training is simulation-free: you
never unroll the ODE. Just sample (x_0, x_1, t) and regress.
Sampling
At inference, integrate the learned vector field backwards in time:
x_{t-Δt} = x_t - Δt · v_θ(x_t, t)
AIENGINEERINGFROMSCRATCH.COM 69

FLOW MATCHING & RECTIFIED FLOWS
flow matching: train on a straight line
DDPM: curved path flow matching: straight line
x_T ~ N(0, I) x_1 ~ N(0, I)
1000-step SDE x_t = t · x_1 + (1-t) · x_0
x_0 (data) x_0
DDIM collapses to ~50 steps 2-8 Euler steps at inference
loss = || v_θ(x_t, t) - (x_1 - x_0) ||²
simulation-free training; target is a constant vector along the straight line
rectified flow: iteratively straighten
1. train v_1 with random (x_0, x_1) pairs
2. sample paired (x_0, x_1) by integrating v_1 -> pairs are ODE-matched
3. retrain v_2 on those pairs -> genuinely straighter flow
2 reflow iterations enable 1-step inference (SDXL-Turbo, SD3-Turbo, Flux-schnell)
Figure 13: Flow matching: straight-line interpolation between noise and data
Start at x_1 ~ N(0, I), Euler-step down to t=0.
Rectified flow (Liu 2022)
Straight-line flow works but the learned paths are not actually straight — they curve because
many x_0s can map to the same x_1. Rectified flow’s reflow step:
1. Train flow model v_1 with random pairings.
2. Sample N pairs (x_1, x_0) by integrating v_1 from x_1 to its landing x_0.
3. Train v_2 on those paired examples. Because the pairs are now “ODE-matched”, the
straight-line interpolant between them is genuinely flatter.
4. Repeat.
In practice 2 reflow iterations get you to near-linear, enabling 2-4 step inference. SDXL-Turbo,
SD3-Turbo, LCM are all distilled-from-flow-matching models.
Why this won for images in 2024
Three reasons:
1. Simulation-free training — no ODE unrolling during training, trivial to implement.
2. Better loss geometry — straight paths have consistent signal-to-noise, whereas DDPM
ε-loss has bad SNR at edges of the schedule.
3. Faster inference — 4-8 steps at SDXL-Turbo quality; 1 step with consistency distillation.
Flow matching vs DDPM — the exact connection
Flow matching with a Gaussian-conditional path is diffusion with a specific noise schedule.
Pick the x_t = α(t) x_0 + σ(t) x_1 schedule and flow matching recovers Stratonovich-
AIENGINEERINGFROMSCRATCH.COM 70

FLOW MATCHING & RECTIFIED FLOWS
reformulated diffusion with v = α'·x_0 - σ'·x_1. The two are algebraically equivalent for
Gaussian paths.
What flow matching added: the clarity of the target (a plain velocity), a cleaner loss, and the
license to experiment with non-Gaussian interpolants.
Interactive figure: normalizing-flow. This one moves. Watch it animate and drag its con-
trols in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/08-
generative-ai/13-flow-matching-rectified-flows
Build It
code/main.py implements 1-D flow matching on a two-mode Gaussian mixture. The vector
field v_θ(x, t) is a tiny MLP trained with the straight-line target. At inference, integrate 1,
2, 4, and 20 Euler steps and compare sample quality.
Step 1: training loss
def train_step(x0, net, rng, lr):
x1 = rng.gauss(0, 1)
t = rng.random()
x_t = t * x1 + (1 - t) * x0
target = x1 - x0
pred = net_forward(x_t, t)
loss = (pred - target) ** 2
# backprop + update
Step 2: multi-step inference
def sample(net, num_steps):
x = rng.gauss(0, 1)
for i in range(num_steps):
t = 1.0 - i / num_steps
dt = 1.0 / num_steps
x -= dt * net_forward(x, t)
return x
Step 3: compare step counts
Expect the 4-step sampler to already match the 20-step quality — a big deal for latency.
Pitfalls
• Time parameterization. Flow matching uses t ∈ [0, 1] with t=0 at data, t=1 at noise.
DDPM uses t ∈ [0, T] with t=0 at data, t=T at noise. Same direction, different scale.
Papers get this wrong constantly.
• Schedule choice. Rectified flow’s straight line is “the” flow-matching schedule, but you
can use cosine or logit-normal t-sampling (SD3 does this) for better scale coverage.
• Reflow cost. Generating the paired dataset for reflow is a full inference pass per sample.
Only do reflow when you really need 1-2 step inference.
• Classifier-free guidance still applies. Just swap ε for v in the linear combination:
v_cfg = (1+w) v_cond - w v_uncond.
AIENGINEERINGFROMSCRATCH.COM 71

FLOW MATCHING & RECTIFIED FLOWS
Use It
Use case 2026 stack
Text-to-image, best quality Flow matching: SD3, Flux.1-dev
Text-to-image, 1-4 steps Distilled flow matching: Flux.1-schnell,
SD3-Turbo, SDXL-Turbo
Real-time inference Consistency distillation from a flow-matched
base (LCM, PCM)
Audio generation Flow matching: Stable Audio 2.5, AudioCraft 2
Video generation Flow matching mixed with diffusion (Sora, Veo,
Stable Video)
Science / physics (particle trajectories, Flow matching + equivariant vector field
molecules)
Whenever a paper says “faster than diffusion” in 2025-2026, it is almost always flow matching
+ distillation.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/08-generative-ai/13-flow-matching-rectified-
flows
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/08-generative-ai/13-flow-matching-rectified-
flows/code
1. Easy. Run code/main.py and compare 1-step vs 20-step MSE vs the true data distribu-
tion.
2. Medium. Switch from uniform t sampling to logit-normal (concentrates sampling at
mid-t). Does the model quality improve?
3. Hard. Implement one reflow iteration: generate paired (x_0, x_1) by integrating the
first model, train a second model on the pairs, and compare 1-step sample quality.
Key Terms
Term What people say What it actually means
Flow “Straight-line diffusion” Train v_θ(x, t) to match x_1 - x_0 along
matching an interpolant.
Rectified “Reflow” Iterative procedure that straightens
flow learned flows.
Velocity “v_θ” Output of the model — the direction to
field move x_t.
Straight- “The path” x_t = (1-t)·x_0 + t·x_1; trivial target
line derivative.
interpolant
Euler “1st order ODE solver” Simplest integrator; works well when paths
sampler are straight.
AIENGINEERINGFROMSCRATCH.COM 72

FLOW MATCHING & RECTIFIED FLOWS
Term What people say What it actually means
Logit- “SD3 sampling” Concentrate t sampling toward mid-values
normal t where gradients are strongest.
Consistency “1-step sampler” Train a student to map any x_t directly to
distillation x_0.
CFG with “v-CFG” v_cfg = (1+w) v_cond - w v_uncond; same
velocity trick, new variable.
Production note: Flux.1-schnell is flow matching at its
fastest
Flow matching’s production win is Flux.1-schnell — a flow-matched DiT distilled to 1-4 in-
ference steps while keeping Flux-dev-grade quality. Niels’ “Run Flux on an 8GB machine”
notebook is the reference deployment recipe: T5 + CLIP encode, quantized MMDiT denoise
(in 4 steps for schnell vs 50 for dev), VAE decode. The cost accounting:
Variant Steps Latency at 1024² on L4 Total FLOPs (relative)
Flux.1-dev 50 ~15 s 1.0×
(raw)
Flux.1- 4 ~1.2 s 0.08× (12× faster)
schnell
SDXL-base 30 ~4 s 0.25×
SDXL- 2 ~0.3 s 0.03×
Lightning
2-step
The production rule: flow-matched base + distillation = the 2026 default for fast text-
to-image. Every major vendor ships this combo: SD3-Turbo (SD3 + flow + distillation),
Flux-schnell (Flux-dev + rectified-flow straightening), CogView-4-Flash. Pure diffusion bases
exist only for legacy checkpoints.
Further Reading
• Liu, Gong, Liu (2022). Flow Straight and Fast: Learning to Generate and Transfer Data
with Rectified Flow — rectified flow.
• Lipman et al. (2023). Flow Matching for Generative Modeling — flow matching.
• Esser et al. (2024). Scaling Rectified Flow Transformers for High-Resolution Image Syn-
thesis — SD3, rectified flow at scale.
• Albergo, Vanden-Eijnden (2023). Stochastic Interpolants — general framework that cov-
ers FM + diffusion.
• Song et al. (2023). Consistency Models — 1-step distillation of diffusion / flow.
• Sauer et al. (2023). Adversarial Diffusion Distillation (SDXL-Turbo) — turbo variant.
• Black Forest Labs (2024). Flux.1 models — flow matching in production.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/08-generative-ai/13-flow-matching-rectified-flows
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/08-generative-ai/13-flow-matching-rectified-flows/code
AIENGINEERINGFROMSCRATCH.COM 73

FLOW MATCHING & RECTIFIED FLOWS
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 74