---
title: "Image Generation — Diffusion Models"
volume: "vol2-deep-learning"
part: "Part II — Computer Vision"
chapter_number: 25
source_pages: "220-226"
---

# Image Generation — Diffusion Models

Image Generation — Diffusion Models
A diffusion model learns to denoise. Train it to remove a tiny bit of noise from a noisy
image, repeat that backwards a thousand times, and you have an image generator.
Type: Build Languages: Python Prerequisites: Phase 4 Lesson 07 (U-Net), Phase 1 Lesson
06 (Probability), Phase 3 Lesson 06 (Optimizers) Time: ~75 minutes
Learning Objectives
• Derive the forward noising process x_0 -> x_1 -> ... -> x_T and explain why the
closed-form q(x_t | x_0) holds for any t
• Implement a DDPM-style training objective that regresses the noise added at each step,
and a sampler that walks back from pure noise to an image
• Build a time-conditioned U-Net (small enough to train on CPU) that predicts the noise
for any timestep
• Explain the difference between DDPM and DDIM sampling, and when each is appropriate
(Lesson 23 covers flow matching and rectified flow in depth)
The Problem
GANs generate one-shot: noise in, image out, one forward pass. They are fast and hard to
train. Diffusion models generate iteratively: start from pure noise, denoise in small steps,
image emerges. They are slow and easy to train. For the last five years the latter property
has dominated: any small team can train a diffusion model and get reasonable samples; GAN
training is a craft you learn over years of failed runs.
Beyond training stability, diffusion’s iterative structure is what unlocks everything modern
image generation does: text conditioning, inpainting, image editing, super-resolution, con-
trollable style. Each step of the sampling loop is a place to inject a new constraint. That hook
is why Stable Diffusion, Imagen, DALL-E 3, Midjourney, and every controllable image model
you will use are all diffusion-based.
This lesson builds the minimal DDPM: forward noising, backward denoising, training loop.
The next lesson (Stable Diffusion) wires it into a production system with a VAE, a text encoder,
and classifier-free guidance.
The Concept
The forward process
Take an image x_0. Add a tiny amount of Gaussian noise to get x_1. Add a tiny amount more
to get x_2. Keep going for T steps until x_T is nearly indistinguishable from pure Gaussian
noise.
q(x_t | x_{t-1}) = N(x_t; sqrt(1 - beta_t) * x_{t-1}, beta_t * I)
AIENGINEERINGFROMSCRATCH.COM 216

IMAGE GENERATION — DIFFUSION MODELS
beta_t is a small variance schedule, typically linear from 0.0001 to 0.02 over T=1000 steps.
Each step slightly shrinks the signal and injects fresh noise.
The closed-form jump
Adding noise one step at a time is a Markov chain, but the math folds: you can sample x_t
directly from x_0 in one step.
Define alpha_t = 1 - beta_t
Define alpha_bar_t = prod_{s=1..t} alpha_s
Then:
q(x_t | x_0) = N(x_t; sqrt(alpha_bar_t) * x_0, (1 - alpha_bar_t) * I)
Equivalently:
x_t = sqrt(alpha_bar_t) * x_0 + sqrt(1 - alpha_bar_t) * epsilon
where epsilon ~ N(0, I)
This single equation is the whole reason diffusion is practical. During training you pick a
random t, sample x_t directly from x_0, and train in one step — no simulation of the full
Markov chain needed.
The reverse process
The forward process is fixed. The reverse process p(x_{t-1} | x_t) is what the neural net-
work learns. Diffusion models do not predict x_{t-1} directly; they predict the noise epsilon
added at step t, and the math derives x_{t-1} from it.
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/04-computer-vision/10-image-generation-diffusion
The training loss
For every training step:
1. Sample a real image x_0.
2. Sample a timestep t uniformly from [1, T].
3. Sample noise epsilon ~ N(0, I).
4. Compute x_t = sqrt(alpha_bar_t) * x_0 + sqrt(1 - alpha_bar_t) * epsilon.
5. Predict epsilon_theta(x_t, t) with the network.
6. Minimise || epsilon - epsilon_theta(x_t, t) ||^2.
That is it. The neural network learns to predict the noise at any timestep. The loss is MSE.
There is no adversarial game, no collapse, no oscillation.
The sampler (DDPM)
To generate: start from x_T ~ N(0, I) and walk backwards one step at a time.
for t = T, T-1, ..., 1:
eps = model(x_t, t)
x_{t-1} = (1 / sqrt(alpha_t)) * (x_t - (beta_t / sqrt(1 - alpha_bar_t)) * eps) + sqrt(beta_t) * z
where z ~ N(0, I) if t > 1, else 0
return x_0
AIENGINEERINGFROMSCRATCH.COM 217

IMAGE GENERATION — DIFFUSION MODELS
The key is that even though the reverse conditional is not known in closed form in general,
for this specific Gaussian forward process it is. The ugly-looking coefficients are what Bayes’
rule gives you.
Why 1000 steps
The forward noise schedule is chosen so each step adds just enough noise that the reverse
step is nearly Gaussian. Too few steps and the reverse step is far from Gaussian, the network
cannot model it well. Too many steps and sampling becomes expensive with diminishing gain.
T=1000 with a linear schedule is the DDPM default.
DDIM: 20x faster sampling
Training is the same. Sampling changes. DDIM (Song et al., 2020) defines a deterministic
reverse process that skips timesteps without retraining. Sampling in 50 steps with DDIM
gives near-1000-step DDPM quality. Every production system uses DDIM or an even faster
variant (DPM-Solver, Euler ancestral).
Time conditioning
The network epsilon_theta(x_t, t) needs to know which timestep it is denoising. Modern
diffusion models inject t via sinusoidal time embeddings (same idea as positional encoding in
transformers) that get added to feature maps at every U-Net level.
t_embedding = sinusoidal(t)
feature_map += MLP(t_embedding)
Without time conditioning the network has to guess the noise level from the image itself,
which works but is much less sample-efficient.
Interactive figure: cv-diffusion-image. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/04-computer-vision/10-image-generation-diffusion
Build It
Step 1: Noise schedule
import torch
def linear_beta_schedule(T=1000, beta_start=1e-4, beta_end=2e-2):
return torch.linspace(beta_start, beta_end, T)
def precompute_schedule(betas):
alphas = 1.0 - betas
alphas_cumprod = torch.cumprod(alphas, dim=0)
return {
"betas": betas,
"alphas": alphas,
"alphas_cumprod": alphas_cumprod,
"sqrt_alphas_cumprod": torch.sqrt(alphas_cumprod),
"sqrt_one_minus_alphas_cumprod": torch.sqrt(1.0 - alphas_cumprod),
"sqrt_recip_alphas": torch.sqrt(1.0 / alphas),
AIENGINEERINGFROMSCRATCH.COM 218

IMAGE GENERATION — DIFFUSION MODELS
}
schedule = precompute_schedule(linear_beta_schedule(T=1000))
Precompute once, gather by index during training and sampling.
Step 2: Forward diffusion (q_sample)
def q_sample(x0, t, noise, schedule):
sqrt_a = schedule["sqrt_alphas_cumprod"][t].view(-1, 1, 1, 1)
sqrt_one_minus_a = schedule["sqrt_one_minus_alphas_cumprod"][t].view(-1, 1, 1, 1)
return sqrt_a * x0 + sqrt_one_minus_a * noise
One-line closed form. t is a batch of timesteps, one per image in the batch.
Step 3: A tiny time-conditioned U-Net
import torch.nn as nn
import torch.nn.functional as F
import math
def timestep_embedding(t, dim=64):
half = dim // 2
freqs = torch.exp(-math.log(10000) * torch.arange(half, device=t.device) / half)
args = t[:, None].float() * freqs[None]
emb = torch.cat([args.sin(), args.cos()], dim=-1)
return emb
class TinyUNet(nn.Module):
def __init__(self, img_channels=3, base=32, t_dim=64):
super().__init__()
self.t_mlp = nn.Sequential(
nn.Linear(t_dim, base * 4),
nn.SiLU(),
nn.Linear(base * 4, base * 4),
)
self.t_dim = t_dim
self.enc1 = nn.Conv2d(img_channels, base, 3, padding=1)
self.enc2 = nn.Conv2d(base, base * 2, 4, stride=2, padding=1)
self.mid = nn.Conv2d(base * 2, base * 2, 3, padding=1)
self.dec1 = nn.ConvTranspose2d(base * 2, base, 4, stride=2, padding=1)
self.dec2 = nn.Conv2d(base * 2, img_channels, 3, padding=1)
self.time_proj = nn.Linear(base * 4, base * 2)
def forward(self, x, t):
t_emb = timestep_embedding(t, self.t_dim)
t_emb = self.t_mlp(t_emb)
t_proj = self.time_proj(t_emb)[:, :, None, None]
h1 = F.silu(self.enc1(x))
h2 = F.silu(self.enc2(h1)) + t_proj
h3 = F.silu(self.mid(h2))
d1 = F.silu(self.dec1(h3))
AIENGINEERINGFROMSCRATCH.COM 219

IMAGE GENERATION — DIFFUSION MODELS
d2 = torch.cat([d1, h1], dim=1)
return self.dec2(d2)
Two-level U-Net with time conditioning injected at the bottleneck. Scale up the depth and
width for real images.
Step 4: Training loop
def train_step(model, x0, schedule, optimizer, device, T=1000):
model.train()
x0 = x0.to(device)
bs = x0.size(0)
t = torch.randint(0, T, (bs,), device=device)
noise = torch.randn_like(x0)
x_t = q_sample(x0, t, noise, schedule)
pred = model(x_t, t)
loss = F.mse_loss(pred, noise)
optimizer.zero_grad()
loss.backward()
optimizer.step()
return loss.item()
That is the entire training loop. No GAN game, no specialised loss, one MSE call.
Step 5: Sampler (DDPM)
@torch.no_grad()
def sample(model, schedule, shape, T=1000, device="cpu"):
model.eval()
x = torch.randn(shape, device=device)
betas = schedule["betas"].to(device)
sqrt_one_minus_a = schedule["sqrt_one_minus_alphas_cumprod"].to(device)
sqrt_recip_alphas = schedule["sqrt_recip_alphas"].to(device)
for t in reversed(range(T)):
t_batch = torch.full((shape[0],), t, dtype=torch.long, device=device)
eps = model(x, t_batch)
coef = betas[t] / sqrt_one_minus_a[t]
mean = sqrt_recip_alphas[t] * (x - coef * eps)
if t > 0:
x = mean + torch.sqrt(betas[t]) * torch.randn_like(x)
else:
x = mean
return x
1000 forward passes to produce one batch of samples. In real code you would swap this for
a DDIM 50-step sampler.
Step 6: DDIM sampler (deterministic, ~20x faster)
@torch.no_grad()
def sample_ddim(model, schedule, shape, steps=50, T=1000, device="cpu", eta=0.0):
model.eval()
x = torch.randn(shape, device=device)
alphas_cumprod = schedule["alphas_cumprod"].to(device)
AIENGINEERINGFROMSCRATCH.COM 220

IMAGE GENERATION — DIFFUSION MODELS
ts = torch.linspace(T - 1, 0, steps + 1).long()
for i in range(steps):
t = ts[i]
t_prev = ts[i + 1]
t_batch = torch.full((shape[0],), t, dtype=torch.long, device=device)
eps = model(x, t_batch)
a_t = alphas_cumprod[t]
a_prev = alphas_cumprod[t_prev] if t_prev >= 0 else torch.tensor(1.0, device=device)
x0_pred = (x - torch.sqrt(1 - a_t) * eps) / torch.sqrt(a_t)
sigma = eta * torch.sqrt((1 - a_prev) / (1 - a_t) * (1 - a_t / a_prev))
dir_xt = torch.sqrt(1 - a_prev - sigma ** 2) * eps
noise = sigma * torch.randn_like(x) if eta > 0 else 0
x = torch.sqrt(a_prev) * x0_pred + dir_xt + noise
return x
eta=0 is fully deterministic (same noise input always produces the same output). eta=1 recov-
ers DDPM.
Use It
For production work, use diffusers:
from diffusers import DDPMScheduler, UNet2DModel
unet = UNet2DModel(sample_size=32, in_channels=3, out_channels=3, layers_per_block=2)
scheduler = DDPMScheduler(num_train_timesteps=1000)
The library ships ready-made schedulers (DDPM, DDIM, DPM-Solver, Euler, Heun), config-
urable U-Nets, pipelines for text-to-image and image-to-image, and LoRA fine-tuning helpers.
For research, k-diffusion (Katherine Crowson) has the most faithful reference implementa-
tions and the best sampling variants.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/04-computer-vision/10-image-generation-
diffusion
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/04-computer-vision/10-image-generation-
diffusion/code
1. (Easy) Visualise the forward process: take one image and plot x_t at t in [0, 100,
250, 500, 750, 1000]. Verify that x_1000 looks like pure Gaussian noise.
2. (Medium) Train the TinyUNet on the synthetic-circles dataset for 20 epochs and sam-
ple 16 circles. Compare DDPM (1000 steps) and DDIM (50 steps) sampling — do they
produce similar images from the same noise seed?
3. (Hard) Implement a cosine noise schedule (Nichol & Dhariwal, 2021): alpha_bar_t =
cos^2((t/T + s) / (1 + s) * pi / 2). Train the same model with linear and cosine
schedules and show that cosine gives better samples at low step counts.
AIENGINEERINGFROMSCRATCH.COM 221

IMAGE GENERATION — DIFFUSION MODELS
Key Terms
Term What people say What it actually means
Forward “Add noise over time” Fixed Markov chain that corrupts an image
process into Gaussian noise over T steps
Reverse “Denoise step by step” Learned distribution that walks back from
process noise to image
Epsilon “Predict the noise” The training target: epsilon_theta(x_t,
prediction t) predicts the noise added at step t
Beta “Noise amounts” Sequence of T small variances that define
schedule how much noise enters per step
alpha_bar_t “Cumulative retain factor” Product of (1 - beta_s) up to time t; bigger t
means less signal left
DDPM “Ancestral, stochastic” Samples each x_{t-1} from its conditional
sampler Gaussian; 1000 steps
DDIM “Deterministic, fast” Rewrites sampling as a deterministic ODE;
sampler 20-100 steps with similar quality
Time condi- “Tell the model which t” Sinusoidal embedding of t injected into the
tioning U-Net so it knows the noise level
Further Reading
• Denoising Diffusion Probabilistic Models (Ho et al., 2020) — the paper that made diffu-
sion practical and beat GANs on FID
• Improved DDPM (Nichol & Dhariwal, 2021) — cosine schedule and v-parameterisation
• DDIM (Song, Meng, Ermon, 2020) — the deterministic sampler that made real-time in-
ference possible
• Elucidating the Design Space of Diffusion (Karras et al., 2022) — a unified view of every
diffusion design choice; current best reference
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/04-computer-vision/10-image-generation-diffusion
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/04-computer-vision/10-image-generation-diffusion/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/04-computer-vision/10-image-generation-diffusion
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 222