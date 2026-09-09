---
title: "Monocular Depth & Geometry Estimation"
volume: "vol2-deep-learning"
part: "Part II — Computer Vision"
chapter_number: 41
source_pages: "326-331"
---

# Monocular Depth & Geometry Estimation

Monocular Depth & Geometry Estima-
tion
A depth map is a single-channel image where each pixel is a distance from the
camera. Predicting it from one RGB frame used to be impossible without stereo
or LiDAR. In 2026 a frozen ViT encoder plus a lightweight head gets within a few
percent of ground truth.
Type: Build + Use Languages: Python Prerequisites: Phase 4 Lesson 14 (ViT), Phase 4
Lesson 17 (Self-Supervised Vision), Phase 4 Lesson 07 (U-Net) Time: ~60 minutes
Learning Objectives
• Distinguish relative and metric depth and state which one each production model (Mi-
DaS, Marigold, Depth Anything V3, ZoeDepth) solves
• Use Depth Anything V3 (DINOv2 backbone) to predict depth for arbitrary single images
with no calibration
• Explain why monocular depth works at all from a single image (perspective cues, texture
gradients, learned priors) and what it cannot recover (absolute scale, occluded geome-
try)
• Lift 2D detections to 3D points using a depth map and pinhole camera intrinsics
The Problem
Depth is the missing axis in 2D computer vision. Given RGB, you know where things appear
in the image plane; you do not know how far they are. Depth sensors (stereo rigs, LiDAR,
time-of-flight) solve this directly but are expensive, fragile, and limited in range.
Monocular depth estimation — predicting depth from a single RGB frame — used to produce
blurry, unreliable output. By 2026 large pretrained encoders changed that: Depth Anything
V3 uses a frozen DINOv2 backbone and produces depth maps that generalise across indoor,
outdoor, medical, and satellite domains. Marigold reframes depth as a conditional diffusion
problem. ZoeDepth regresses true metric distances.
Depth is also the bridge between 2D detection and 3D understanding: multiply a detected
box’s pixels by depth and you lift the 2D object into a 3D point cloud. That is the core of every
AR occlusion system, every obstacle-avoidance pipeline, and every “pick up the cup” robot.
The Concept
Relative vs metric depth
• Relative depth — ordered z values without a real-world unit. “Pixel A is closer than
pixel B, but the ratio of distances is not anchored to metres.”
AIENGINEERINGFROMSCRATCH.COM 322

MONOCULAR DEPTH & GEOMETRY ESTIMATION
• Metric depth — absolute distance in metres from the camera. Requires the model to
have learnt the statistical relationship between image cues and real distance.
MiDaS and Depth Anything V3 produce relative depth. Marigold produces relative depth.
ZoeDepth, UniDepth, and Metric3D produce metric depth. Metric models are sensitive to
camera intrinsics; relative models are not.
The encoder-decoder pattern
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/04-computer-vision/26-monocular-depth
Depth Anything V3 freezes the encoder and trains only the DPT-style decoder. The encoder
provides rich features; the decoder interpolates them back to image resolution and regresses
depth.
Why a single image produces depth at all
A 2D image contains many monocular cues that correlate with depth:
• Perspective — parallel lines in 3D converge in 2D.
• Texture gradient — surfaces far away have smaller, denser texture.
• Occlusion order — nearer objects occlude farther ones.
• Size constancy — known objects (cars, humans) give approximate scale.
• Atmospheric perspective — distant objects appear hazier and bluer in outdoor scenes.
A ViT trained on billions of images internalises these cues. With enough data and a strong
backbone, monocular depth hits reasonable accuracy without any explicit 3D supervision.
What monocular depth cannot do
• Absolute metric scale without intrinsics or a known object in the scene. The network
can predict “the cup is twice as far as the spoon” without knowing whether the cup is 1
m or 10 m away.
• Occluded geometry — the back of a chair is unseen and cannot be inferred reliably.
• Truly untextured / reflective surfaces — mirrors, glass, uniform walls. The network
reports plausible but wrong depth.
Depth Anything V3 in 2026
• Vanilla DINOv2 ViT-L/14 as encoder (frozen).
• DPT decoder.
• Trained on posed image pairs from diverse sources (no explicit depth supervision needed
beyond photometric consistency).
• Predicts spatially consistent geometry from an arbitrary number of visual inputs,
with or without known camera poses.
• SOTA across monocular depth, any-view geometry, visual rendering, camera pose esti-
mation.
This is the drop-in model to call when you need depth in 2026.
Marigold — diffusion for depth
Marigold (Ke et al., CVPR 2024) reframes depth estimation as conditional image-to-image
diffusion. Conditioning: RGB. Target: depth map. Uses a pretrained Stable Diffusion 2 U-Net
AIENGINEERINGFROMSCRATCH.COM 323

MONOCULAR DEPTH & GEOMETRY ESTIMATION
as backbone. Output depth maps are exceptionally sharp at object boundaries. Trade-off:
slower inference than feed-forward models (10-50 denoising steps).
Intrinsics and the pinhole camera
To lift a pixel (u, v) with depth d to a 3D point (X, Y, Z) in camera coordinates:
fx, fy, cx, cy = camera intrinsics
X = (u - cx) * d / fx
Y = (v - cy) * d / fy
Z = d
Intrinsics come from EXIF metadata, a calibration pattern, or a monocular intrinsics estima-
tor (Perspective Fields, UniDepth). Without intrinsics, you can still render a point cloud by
assuming a 60-70° FOV and moderate-resolution principals — usable for visualisation, not for
measurement.
Evaluation
Two standard metrics:
• AbsRel (absolute relative error): mean(|d_pred - d_gt| / d_gt). Lower is better. 0.05-
0.1 for production models.
• delta < 1.25 (threshold accuracy): fraction of pixels where max(d_pred/d_gt,
d_gt/d_pred) < 1.25. Higher is better. 0.9+ for SOTA.
For relative depth (Depth Anything V3, MiDaS), evaluation uses scale-and-shift invariant ver-
sions of both metrics.
Interactive figure: depth-sweep. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/04-
computer-vision/26-monocular-depth
Build It
Step 1: Depth metrics
import torch
def abs_rel_error(pred, target, mask=None):
if mask is not None:
pred = pred[mask]
target = target[mask]
return (torch.abs(pred - target) / target.clamp(min=1e-6)).mean().item()
def delta_accuracy(pred, target, threshold=1.25, mask=None):
if mask is not None:
pred = pred[mask]
target = target[mask]
ratio = torch.maximum(pred / target.clamp(min=1e-6), target / pred.clamp(min=1e-6))
return (ratio < threshold).float().mean().item()
Always mask invalid depth pixels (zero, NaN, saturated) before evaluation.
AIENGINEERINGFROMSCRATCH.COM 324

MONOCULAR DEPTH & GEOMETRY ESTIMATION
Step 2: Scale-and-shift alignment
For relative-depth models, align prediction to ground truth before computing metrics. Least-
squares fit of a * pred + b = target:
def align_scale_shift(pred, target, mask=None):
if mask is not None:
p = pred[mask]
t = target[mask]
else:
p = pred.flatten()
t = target.flatten()
A = torch.stack([p, torch.ones_like(p)], dim=1)
coeffs, *_ = torch.linalg.lstsq(A, t.unsqueeze(-1))
a, b = coeffs[:2, 0]
return a * pred + b
Run align_scale_shift before abs_rel_error when evaluating MiDaS / Depth Anything.
Step 3: Lift depth to a point cloud
import numpy as np
def depth_to_point_cloud(depth, intrinsics):
H, W = depth.shape
fx, fy, cx, cy = intrinsics
v, u = np.meshgrid(np.arange(H), np.arange(W), indexing="ij")
z = depth
x = (u - cx) * z / fx
y = (v - cy) * z / fy
return np.stack([x, y, z], axis=-1)
depth = np.random.uniform(0.5, 4.0, (240, 320))
intr = (320.0, 320.0, 160.0, 120.0)
pc = depth_to_point_cloud(depth, intr)
print(f"point cloud shape: {pc.shape} (H, W, 3)")
One function, every 3D-lifted application. Export the point cloud to .ply and open in MeshLab
or CloudCompare.
Step 4: Smoke test with a synthetic depth scene
def synthetic_depth(size=96):
yy, xx = np.meshgrid(np.arange(size), np.arange(size), indexing="ij")
# Floor: linear gradient from near (top) to far (bottom)
depth = 1.0 + (yy / size) * 4.0
# Box in the middle: closer
mask = (np.abs(xx - size / 2) < size / 6) & (np.abs(yy - size * 0.6) < size / 6)
depth[mask] = 2.0
return depth.astype(np.float32)
gt = torch.from_numpy(synthetic_depth(96))
pred = gt + 0.3 * torch.randn_like(gt) # simulated prediction
AIENGINEERINGFROMSCRATCH.COM 325

MONOCULAR DEPTH & GEOMETRY ESTIMATION
aligned = align_scale_shift(pred, gt)
print(f"before align absRel = {abs_rel_error(pred, gt):.3f}")
print(f"after align absRel = {abs_rel_error(aligned, gt):.3f}")
Step 5: Depth Anything V3 usage (reference)
import torch
from transformers import pipeline
from PIL import Image
pipe = pipeline(task="depth-estimation", model="LiheYoung/depth-anything-v2-large")
image = Image.open("street.jpg").convert("RGB")
out = pipe(image)
depth_np = np.array(out["depth"])
Three lines. out["depth"] is a PIL grayscale; convert to numpy for math. For Depth Anything
V3 specifically, swap the model id once released; the API is unchanged.
Use It
• Depth Anything V3 (Meta AI / ByteDance, 2024-2026) — the default for relative depth.
Fastest ViT-large-backbone model in production.
• Marigold (ETH, 2024) — highest visual quality, slow inference.
• UniDepth (ETH, 2024) — metric depth with camera intrinsics estimation.
• ZoeDepth (Intel, 2023) — metric depth; older, still reliable.
• MiDaS v3.1 — legacy but stable; good baseline for comparison.
Typical integration pattern:
1. RGB frame arrives.
2. Depth model produces depth map.
3. Detector produces boxes.
4. Lift box centroids through depth to 3D; merge with point cloud if available.
5. Downstream: AR occlusion, path planning, object-size estimation, stereo replacement.
For real-time use, Depth Anything V2 Small (INT8 quantised) hits ~30 fps on a consumer GPU
at 518x518.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/04-computer-vision/26-monocular-depth
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/04-computer-vision/26-monocular-depth/code
1. (Easy) Run Depth Anything V2 on any 10 images of your desk. Save depth as grayscale
PNGs and inspect. Identify one object whose predicted depth looks wrong and explain
why the monocular cues failed.
2. (Medium) Given RGB + depth from Depth Anything V2, lift to a point cloud and ren-
der with open3d. Compare two scenes (indoor / outdoor) and note which looks more
believable.
AIENGINEERINGFROMSCRATCH.COM 326

MONOCULAR DEPTH & GEOMETRY ESTIMATION
3. (Hard) Take five pairs of images that differ only by a known object’s position (e.g. bot-
tle moved 30 cm closer). Use UniDepth to predict metric depth on both. Report the
predicted distance delta vs the true 30 cm.
Key Terms
Term What people say What it actually means
Monocular “Single-image depth” Depth estimation from one RGB frame, no
depth stereo or LiDAR
Relative “Ordered depth” Ordered z-values without real-world units
depth
Metric “Absolute distance” Depth in metres; requires calibration or a
depth model trained with metric supervision
AbsRel “Absolute relative error” Mean of
Delta “delta < 1.25” Fraction of pixels with prediction within
accuracy 25% of ground truth
Pinhole “fx, fy, cx, cy” The camera model used to lift (u, v, d) to (X,
camera Y, Z)
DPT “Dense Prediction The conv-based decoder used on top of
Transformer” frozen ViT encoders for depth
DINOv2 “The reason it works” Self-supervised features that generalise
backbone across domains without depth labels
Further Reading
• Depth Anything V3 paper page — SOTA monocular depth with DINOv2 encoder
• Marigold (Ke et al., CVPR 2024) — diffusion-based depth estimation
• UniDepth (Piccinelli et al., 2024) — metric depth with intrinsics
• MiDaS v3.1 (Intel ISL) — the canonical relative-depth baseline
• DINOv3 blog post (Meta) — the encoder family that lifts depth accuracy
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/04-computer-vision/26-monocular-depth
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/04-computer-vision/26-monocular-depth/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/04-computer-vision/26-monocular-depth
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 327