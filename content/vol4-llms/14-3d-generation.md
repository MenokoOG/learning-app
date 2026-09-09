---
title: "3D Generation"
volume: "vol4-llms"
part: "Part I — Generative AI"
chapter_number: 14
source_pages: "68-72"
---

# 3D Generation

3D Generation
3D is the modality where 2D-to-3D leverage is strongest. The 2023 breakthrough
was 3D Gaussian Splatting. The 2024-2026 generative push layers multi-view diffu-
sion + 3D reconstruction on top to produce objects and scenes from a single prompt
or photo.
Type: Learn Languages: Python Prerequisites: Phase 4 (Vision), Phase 8 · 07 (Latent
Diffusion) Time: ~45 minutes
The Problem
3D content is painful:
• Representation. Meshes, point clouds, voxel grids, signed distance fields (SDFs), neu-
ral radiance fields (NeRFs), 3D Gaussians. Each has trade-offs.
• Data scarcity. ImageNet has 14M images. The largest clean 3D dataset (Objaverse-XL,
2023) has ~10M objects, most low quality.
• Memory. A 512³ voxel grid is 128M voxels; a useful scene NeRF needs 1M samples/ray.
Generation is harder than reconstruction.
• Supervision. For a 2D image you have the pixels. For 3D you usually have a handful of
2D views and have to lift to 3D.
The 2026 stack separates the two problems. First, generate 2D multi-view images with a
diffusion model. Second, fit a 3D representation (usually Gaussian splatting) to those images.
The Concept
Representation: 3D Gaussian Splatting (Kerbl et al., 2023)
Represent a scene as a cloud of ~1M 3D Gaussians. Each has 59 parameters: position (3),
covariance (6, or quaternion 4 + scale 3), opacity (1), spherical-harmonics color (48 at degree
3, 3 at degree 0).
Rendering = projection + alpha-compositing. Fast (~100 fps at 1080p on a 4090). Differen-
tiable. Fit by gradient descent against ground-truth photos. A scene fits in 5-30 minutes on
a consumer GPU.
Two 2023-2024 innovations on top: - Generative Gaussian splats. Models like LGM, LRM,
InstantMesh predict a Gaussian cloud directly from one or a few images. - 4D Gaussian
Splatting. Gaussians with per-frame offsets for dynamic scenes.
Multi-view diffusion
Fine-tune a pretrained image diffusion model to generate multiple consistent views of the
same object from a text prompt or single image. Zero123 (Liu et al., 2023), MVDream (Shi et
al., 2023), SV3D (Stability, 2024), CAT3D (Google, 2024). Usually output 4-16 views around
the object, lifted to 3D via Gaussian splatting or NeRF.
AIENGINEERINGFROMSCRATCH.COM 64

3D GENERATION
text / image -> 3D in 2026
prompt or image multi-view diffusion 3D fit
text, 1 photo, or 3-16 photos SV3D, CAT3D, MVDream, Zero123 Gaussian splat or mesh extract
8 consistent views
3D Gaussian Splatting (Kerbl 2023) direct text/image to mesh
Meshy 4, Rodin Gen-1.5, Hunyuan3D 2.0
output: PBR mesh (albedo, roughness,
metallic, normal)
→ direct import into Unity, Unreal, Blender
30s - 60s per asset on hosted endpoints
~1M Gaussians per scene, differentiable render, 100 fps
2022 → 2026 time per asset
DreamFusion 2022: 1 hour; LRM 2023: 5s; TripoSR 2024: 1s; Meshy 4 2025: 30s with PBR
NeRF → 3D-GS → direct generative mesh: quality up, time down 100x
Figure 12: 3D generation: multi-view diffusion + 3D reconstruction
Text-to-3D pipelines
Model Input Output Time
DreamFusion (2022) text NeRF via SDS ~1 hour per asset
Magic3D text mesh + texture ~40 min
Shap-E (OpenAI, text implicit 3D ~1 min
2023)
SJC / text NeRF / mesh ~30 min
ProlificDreamer
LRM (Meta, 2023) image triplane ~5 s
InstantMesh (2024) image mesh ~10 s
SV3D (Stability, image novel views ~2 min
2024)
CAT3D (Google, 1-64 images 3D NeRF ~1 min
2024)
TripoSR (2024) image mesh ~1 s
Meshy 4 (2025) text + image PBR mesh ~30 s
Rodin Gen-1.5 (2025) text + image PBR mesh ~60 s
Tencent Hunyuan3D image mesh ~30 s
2.0 (2025)
2025-2026 direction: direct text-to-mesh models with PBR materials suitable for game en-
gines. Multi-view diffusion intermediate step is still the best-performing recipe for general
objects.
AIENGINEERINGFROMSCRATCH.COM 65

3D GENERATION
NeRF (for context)
Neural Radiance Field (Mildenhall et al., 2020). A tiny MLP takes (x, y, z, view direction)
and outputs (color, density). Render by integrating along rays. Beats mesh-based novel-
view synthesis in quality but is 100-1000x slower to render. Superseded by Gaussian splatting
for most real-time use but still dominant in research.
Interactive figure: v4-3d-multiview. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/08-
generative-ai/12-3d-generation
Build It
code/main.py implements a toy 2D “Gaussian splatting” fit: represent a synthetic target im-
age (a smooth gradient) as a sum of 2D Gaussian splats. Optimize positions, colors, and co-
variances by gradient descent to match the target. You see the two core operations: forward
render (splat + alpha-composite) and fit by gradient descent.
Step 1: 2D Gaussian splat
def gaussian_at(x, y, gaussian):
px, py = gaussian["pos"]
sigma = gaussian["sigma"]
d2 = (x - px) ** 2 + (y - py) ** 2
return math.exp(-d2 / (2 * sigma * sigma))
Step 2: render by summing splats
def render(image_size, gaussians):
img = [[0.0] * image_size for _ in range(image_size)]
for g in gaussians:
for y in range(image_size):
for x in range(image_size):
img[y][x] += g["color"] * gaussian_at(x, y, g)
return img
Real 3D Gaussian splatting sorts Gaussians by depth and alpha-composites in order. Our 2D
toy just sums.
Step 3: fit by gradient descent
for step in range(steps):
pred = render(size, gaussians)
loss = mse(pred, target)
gradients = compute_grads(pred, target, gaussians)
update(gaussians, gradients, lr)
Pitfalls
• View inconsistency. If you generate 4 views independently and they disagree about
object structure, the 3D fit is blurry. Fix: multi-view diffusion with shared attention.
AIENGINEERINGFROMSCRATCH.COM 66

3D GENERATION
• Back-side hallucination. Single-image → 3D has to invent the unseen side. Quality
varies wildly.
• Gaussian splat explosion. Unconstrained training grows to 10M splats and overfits.
Densification + pruning heuristics (from 3D-GS original paper) are essential.
• Topology issues. Meshes from implicit fields (SDFs) often have holes or self-
intersections. Run a remesher (e.g. blender’s voxel remesh) before shipping.
• License of training data. Objaverse has mixed licenses; commercial use varies per
model.
Use It
Task 2026 pick
Scene reconstruction from Gaussian splatting (3DGS, Gsplat, Scaniverse)
photos
Text-to-3D object for games Meshy 4 or Rodin Gen-1.5 (PBR output)
Image-to-3D Hunyuan3D 2.0, TripoSR, InstantMesh
Novel-view synthesis from few CAT3D, SV3D
images
Dynamic scene reconstruction 4D Gaussian Splatting
Avatar / clothed human Gaussian Avatar, HUGS
Research / SOTA Whatever dropped last week
For shipping production 3D in a game or e-commerce pipeline: Meshy 4 or Rodin Gen-1.5
output PBR meshes that go straight into Unity / Unreal.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/08-generative-ai/12-3d-generation
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/08-generative-ai/12-3d-generation/code
1. Easy. Run code/main.py with 4, 16, 64 Gaussians. Report final MSE vs target.
2. Medium. Extend to color Gaussians (RGB). Confirm reconstruction matches the target
color pattern.
3. Hard. Using gsplat or Nerfstudio, reconstruct a real object from a 50-photo capture.
Report fit time and final SSIM on held-out views.
Key Terms
Term What people say What it actually means
3D “3DGS” Scene as a cloud of 3D Gaussians;
Gaussian differentiable alpha-composite render.
Splatting
NeRF “Neural radiance field” MLP that outputs color + density at a 3D
point; render by ray integration.
AIENGINEERINGFROMSCRATCH.COM 67

3D GENERATION
Term What people say What it actually means
Triplane “Three 2-D planes” Factor 3D into three 2-D axis-aligned
feature grids; cheaper than volumetric.
SDS “Score distillation sampling” Train 3D model by using 2D-diffusion score
as pseudo-gradient.
Multi-view “Many views at once” Diffusion model that outputs a batch of
diffusion consistent camera views.
PBR “Physically-based rendering” Material with albedo, roughness, metallic,
normal channels.
Densification “Grow splats” 3DGS training heuristic: split / clone splats
in high-gradient regions.
Production note: 3D has no shared substrate yet
Unlike image (latent diffusion + DiT) and video (spatiotemporal DiT), 3D has no single domi-
nant runtime in 2026. The production decision tree forks on the representation:
• NeRF / triplane. Inference is ray-marching + an MLP forward per sample. A
512² render requires millions of MLP forwards. Batch the ray samples aggressively;
SDPA/xformers applies.
• Multi-view diffusion + LRM reconstruction. Two-stage pipeline. Stage 1 (multi-view
DiT) is a diffusion server just like Lesson 07. Stage 2 (LRM transformer) is a one-shot
forward pass over the views. The overall latency profile is “diffusion + one-shot” — pick
per-stage serving primitives accordingly.
• SDS / DreamFusion. Per-asset optimization, not inference. Build jobs, not request
handlers.
For most 2026 products, the right answer is “run a multi-view diffusion model on request,
reconstruct to 3DGS asynchronously, serve the 3DGS for real-time viewing”. This splits the
workload cleanly between a GPU-inference server (fast) and an offline optimizer (slow).
Further Reading
• Mildenhall et al. (2020). NeRF: Representing Scenes as Neural Radiance Fields — NeRF.
• Kerbl et al. (2023). 3D Gaussian Splatting for Real-Time Radiance Field Rendering —
3DGS.
• Poole et al. (2022). DreamFusion: Text-to-3D using 2D Diffusion — SDS.
• Liu et al. (2023). Zero-1-to-3: Zero-shot One Image to 3D Object — Zero123.
• Shi et al. (2023). MVDream — multi-view diffusion.
• Hong et al. (2023). LRM: Large Reconstruction Model for Single Image to 3D — LRM.
• Gao et al. (2024). CAT3D: Create Anything in 3D with Multi-View Diffusion Models —
CAT3D.
• Stability AI (2024). Stable Video 3D (SV3D) — SV3D.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/08-generative-ai/12-3d-generation
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/08-generative-ai/12-3d-generation/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 68