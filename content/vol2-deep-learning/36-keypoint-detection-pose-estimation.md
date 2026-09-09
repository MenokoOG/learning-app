---
title: "Keypoint Detection & Pose Estimation"
volume: "vol2-deep-learning"
part: "Part II — Computer Vision"
chapter_number: 36
source_pages: "291-295"
---

# Keypoint Detection & Pose Estimation

Keypoint Detection & Pose Estimation
A pose is a set of ordered keypoints. A keypoint detector is a heatmap regressor.
Everything else is bookkeeping.
Type: Build Languages: Python Prerequisites: Phase 4 Lesson 06 (Detection), Phase 4
Lesson 07 (U-Net) Time: ~45 minutes
Learning Objectives
• Distinguish top-down and bottom-up pose estimation and state when each is used
• Regress heatmaps for K keypoints with a Gaussian-per-keypoint target and extract key-
point coordinates at inference
• Explain Part Affinity Fields (PAFs) and how bottom-up pipelines associate keypoints into
instances
• Use MediaPipe Pose or MMPose for production keypoint estimation and understand their
output format
The Problem
Keypoint tasks hide under many names: human pose (17 body joints), face landmarks (68 or
478 points), hand (21 points), animal pose, robotic object pose, medical anatomy landmarks.
Every one of them shares the same structure: detect K discrete points on an object and output
their (x, y) coordinates.
Pose estimation is the foundation of motion capture, fitness apps, sports analytics, gesture
control, animation, AR try-on, and robotic grasping. The 2D case is mature; 3D pose (es-
timating joint positions in world coordinates from a single camera) is the current research
frontier.
The engineering question is scale. A single-image, single-person pose is a 20ms problem.
Multi-person pose in a crowd at 30 fps is a different problem with different architectures.
The Concept
Top-down vs bottom-up
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/04-computer-vision/21-keypoint-pose
• Top-down — detect people first, then run a per-person keypoint model on each crop.
Highest accuracy; scales linearly with number of people.
• Bottom-up — one forward pass predicts all keypoints plus an association field; group
them. Constant time regardless of crowd size.
Top-down (HRNet, ViTPose) is the accuracy leader; bottom-up (OpenPose, HigherHRNet) is
the throughput leader for crowded scenes.
AIENGINEERINGFROMSCRATCH.COM 287

KEYPOINT DETECTION & POSE ESTIMATION
Heatmap regression
Instead of regressing (x, y) directly, predict an H x W heatmap per keypoint with a Gaussian
blob centred at the true location.
target[k, y, x] = exp(-((x - cx_k)^2 + (y - cy_k)^2) / (2 sigma^2))
At inference, the argmax of each heatmap is the predicted keypoint location.
Why heatmaps work better than direct regression: the network’s spatial structure (conv fea-
ture map) aligns naturally with spatial output. Gaussian targets also regularise — a small
localisation error produces a small loss, not zero.
Sub-pixel localisation
Argmax gives integer coordinates. For sub-pixel precision, refine by fitting a parabola to the
argmax and its neighbours, or use the well-known offset (dx, dy) = 0.25 * (heatmap[y,
x+1] - heatmap[y, x-1], ...) direction.
Part Affinity Fields (PAFs)
OpenPose’s trick for bottom-up association. For each pair of connected keypoints (e.g. left
shoulder to left elbow), predict a 2-channel field that encodes the unit vector pointing from
one to the other. To associate a shoulder with its elbow, integrate the PAF along the line
connecting candidate pairs; the pair with the highest integral is matched.
For each connection (limb):
PAF channels: 2 (unit vector x, y)
Line integral: sum over sample points of (PAF . line_direction)
Higher integral = stronger match
Elegant and scales to arbitrary crowd sizes without per-person crops.
COCO keypoints
The standard body-pose dataset: 17 keypoints per person, PCK (Percentage of Correct Key-
points) and OKS (Object Keypoint Similarity) as metrics. OKS is the keypoint analogue of IoU
and is what COCO mAP@OKS reports.
2D vs 3D
• 2D pose — image coordinates; solved at production quality (MediaPipe, HRNet, ViT-
Pose).
• 3D pose — world / camera coordinates; still active research. Common approaches:
– Lift 2D predictions to 3D with a small MLP (VideoPose3D).
– Direct 3D regression from image (PyMAF, MHFormer).
– Multi-view setups (CMU Panoptic) for ground truth.
Interactive figure: cv3-pose-heatmap. This one moves. Watch it animate and drag its con-
trols in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/04-
computer-vision/21-keypoint-pose
AIENGINEERINGFROMSCRATCH.COM 288

KEYPOINT DETECTION & POSE ESTIMATION
Build It
Step 1: Gaussian heatmap target
import numpy as np
import torch
def gaussian_heatmap(size, cx, cy, sigma=2.0):
yy, xx = np.meshgrid(np.arange(size), np.arange(size), indexing="ij")
return np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * sigma ** 2)).astype(np.float32)
hm = gaussian_heatmap(64, 32, 32, sigma=2.0)
print(f"peak: {hm.max():.3f} at ({hm.argmax() % 64}, {hm.argmax() // 64})")
Per-keypoint heatmaps stacked along a channel axis give the full target tensor.
Step 2: Tiny keypoint head
A U-Net-style model that outputs K heatmap channels.
import torch.nn as nn
import torch.nn.functional as F
class TinyKeypointNet(nn.Module):
def __init__(self, num_keypoints=4, base=16):
super().__init__()
self.down1 = nn.Sequential(nn.Conv2d(3, base, 3, 2, 1), nn.ReLU(inplace=True))
self.down2 = nn.Sequential(nn.Conv2d(base, base * 2, 3, 2, 1), nn.ReLU(inplace=True))
self.mid = nn.Sequential(nn.Conv2d(base * 2, base * 2, 3, 1, 1), nn.ReLU(inplace=True))
self.up1 = nn.ConvTranspose2d(base * 2, base, 2, 2)
self.up2 = nn.ConvTranspose2d(base, num_keypoints, 2, 2)
def forward(self, x):
h1 = self.down1(x)
h2 = self.down2(h1)
h3 = self.mid(h2)
u1 = self.up1(h3)
return self.up2(u1)
Input (N, 3, H, W), output (N, K, H, W). Loss is per-pixel MSE against Gaussian targets.
Step 3: Inference — extract keypoint coordinates
def heatmap_to_coords(heatmaps):
"""
heatmaps: (N, K, H, W)
returns: (N, K, 2) float coordinates in image pixels
"""
N, K, H, W = heatmaps.shape
hm = heatmaps.reshape(N, K, -1)
idx = hm.argmax(dim=-1)
ys = (idx // W).float()
xs = (idx % W).float()
return torch.stack([xs, ys], dim=-1)
AIENGINEERINGFROMSCRATCH.COM 289

KEYPOINT DETECTION & POSE ESTIMATION
coords = heatmap_to_coords(torch.randn(2, 4, 32, 32))
print(f"coords: {coords.shape}") # (2, 4, 2)
One line at inference. For sub-pixel refinement, interpolate around the argmax.
Step 4: Synthetic keypoint dataset
Simple: draw four points on a white canvas and learn to predict them.
def make_synthetic_sample(size=64):
img = np.ones((3, size, size), dtype=np.float32)
rng = np.random.default_rng()
kps = rng.integers(8, size - 8, size=(4, 2))
for cx, cy in kps:
img[:, cy - 2:cy + 2, cx - 2:cx + 2] = 0.0
hms = np.stack([gaussian_heatmap(size, cx, cy) for cx, cy in kps])
return img, hms, kps
Easy enough for a tiny model to learn in a minute.
Step 5: Training
model = TinyKeypointNet(num_keypoints=4)
opt = torch.optim.Adam(model.parameters(), lr=3e-3)
for step in range(200):
batch = [make_synthetic_sample() for _ in range(16)]
imgs = torch.from_numpy(np.stack([b[0] for b in batch]))
hms = torch.from_numpy(np.stack([b[1] for b in batch]))
pred = model(imgs)
# Upsample pred to full resolution
pred = F.interpolate(pred, size=hms.shape[-2:], mode="bilinear", align_corners=False)
loss = F.mse_loss(pred, hms)
opt.zero_grad(); loss.backward(); opt.step()
Use It
• MediaPipe Pose — Google’s production pose estimator; ships WebGL + mobile runtimes
with sub-10ms latency.
• MMPose (OpenMMLab) — comprehensive research codebase; every SOTA architecture
with pretrained weights.
• YOLOv8-pose — fastest real-time multi-person pose with a single forward pass.
• transformers HumanDPT / PoseAnything — newer vision-language approaches for
open-vocabulary pose (any object, any keypoint set).
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/04-computer-vision/21-keypoint-pose
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/04-computer-vision/21-keypoint-pose/code
AIENGINEERINGFROMSCRATCH.COM 290

KEYPOINT DETECTION & POSE ESTIMATION
1. (Easy) Train the tiny keypoint model on the synthetic 4-point dataset. Report mean L2
error between predicted and true keypoints after 200 steps.
2. (Medium) Add sub-pixel refinement: given the argmax position, fit a 1D parabola along
x and y from the neighbouring pixels. Report the accuracy gain vs integer argmax.
3. (Hard) Build a 2-person synthetic dataset where each image shows two instances of the
4-keypoint pattern. Train a bottom-up pipeline with PAFs that predict which keypoint
belongs to which instance, and evaluate OKS.
Key Terms
Term What people say What it actually means
Keypoint “A landmark” A specific ordered point on an object (joint,
corner, feature)
Pose “The skeleton” An ordered set of keypoints belonging to
one instance
Top-down “Detect then pose” Two-stage pipeline: person detector +
per-crop keypoint model; highest accuracy
Bottom-up “Pose first, group later” Single-pass all-keypoint prediction +
grouping; constant time in crowd size
Heatmap “Gaussian target” H x W tensor per keypoint with peak at the
true location; the preferred regression
target
PAF “Part Affinity Field” 2-channel unit vector field encoding limb
directions; used to group keypoints into
instances
OKS “Keypoint IoU” Object Keypoint Similarity; the COCO
metric for pose
HRNet “High-Resolution Net” The dominant top-down keypoint
architecture; preserves high-res features
throughout
Further Reading
• OpenPose (Cao et al., 2017) — bottom-up with PAFs; still the best writeup of the approach
• HRNet (Sun et al., 2019) — the top-down reference architecture
• ViTPose (Xu et al., 2022) — plain ViT as a pose backbone; current SOTA on many bench-
marks
• MediaPipe Pose — production real-time pose; the fastest deployed stack in 2026
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/04-computer-vision/21-keypoint-pose
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/04-computer-vision/21-keypoint-pose/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/04-computer-vision/21-keypoint-pose
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 291