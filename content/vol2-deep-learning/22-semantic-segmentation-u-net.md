---
title: "Semantic Segmentation — U-Net"
volume: "vol2-deep-learning"
part: "Part II — Computer Vision"
chapter_number: 22
source_pages: "197-205"
---

# Semantic Segmentation — U-Net

Semantic Segmentation — U-Net
Segmentation is classification at every pixel. U-Net makes it work by pairing a
downsampling encoder with an upsampling decoder and wiring skip connections
between them.
Type: Build Languages: Python Prerequisites: Phase 4 Lesson 03 (CNNs), Phase 4 Lesson
04 (Image Classification) Time: ~75 minutes
Learning Objectives
• Distinguish semantic, instance, and panoptic segmentation and pick the right task for a
given problem
• Build a U-Net from scratch in PyTorch with encoder blocks, a bottleneck, a decoder with
transposed convolutions, and skip connections
• Implement pixel-wise cross-entropy, Dice loss, and the combined loss that is the current
default for medical and industrial segmentation
• Read IoU and Dice metrics per class and diagnose whether a bad score comes from
small-object recall, boundary accuracy, or class imbalance
The Problem
Classification outputs one label per image. Detection outputs a handful of boxes per image.
Segmentation outputs one label per pixel. For an input of size H x W, the output is a tensor
of shape H x W (semantic) or H x W x N_instances (instance). That is millions of predictions
per image, not one.
The structure of segmentation is why it powers almost every dense-prediction vision prod-
uct: medical imaging (tumour masks), autonomous driving (road, lane, obstacle), satellite
(building footprints, crop boundaries), document parsing (layout zones), robotics (graspable
regions). None of those tasks can be solved by putting a box around the object; they need the
exact silhouette.
The architectural problem is simple to state and not simple to solve: you need the network to
see the global context of an image (what kind of scene is this) and the local pixel detail (exactly
which pixel is road vs pavement) simultaneously. A standard CNN compresses spatially to gain
context, which throws away the detail. U-Net was the design that got both.
The Concept
Semantic vs instance vs panoptic
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/04-computer-vision/07-semantic-segmentation-unet
• Semantic says “this pixel is road, that pixel is car.” Two cars next to each other collapse
into a single blob.
AIENGINEERINGFROMSCRATCH.COM 193

SEMANTIC SEGMENTATION — U-NET
• Instance says “this pixel is car #3, that pixel is car #5.” Ignores background stuff
(“stuff” = sky, road, grass).
• Panoptic unifies both: every pixel gets a class label, every instance gets a unique id,
stuff and things both segmented.
This lesson covers semantic. The next lesson (Mask R-CNN) covers instance.
The U-Net shape
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/04-computer-vision/07-semantic-segmentation-unet
The encoder halves spatial resolution four times and doubles channels. The decoder reverses:
doubles spatial resolution four times and halves channels. The skip connections concatenate
matching encoder features with decoder features at every resolution. The final 1x1 conv maps
64 -> num_classes at full resolution.
Why skip connections are necessary: the decoder has seen only small feature maps by the time
it tries to output pixel-level predictions. Without the skips it cannot localise edges accurately
because that information was compressed away in the encoder. Skip connections hand it the
high-resolution feature maps the encoder computed on the way down.
Transposed vs bilinear upsample
The decoder has to expand spatial dimensions. Two options:
• Transposed convolution (nn.ConvTranspose2d) — learnable upsample. Historical U-
Net default. Can produce checkerboard artifacts if stride and kernel size do not divide
evenly.
• Bilinear upsample + 3x3 conv — smooth upsample followed by a conv. Fewer artifacts,
fewer parameters, now the modern default.
Both appear in the wild. For a first U-Net, bilinear is safer.
Cross-entropy on a pixel grid
For semantic segmentation with C classes, the model output is (N, C, H, W). The target is
(N, H, W) with integer class IDs. Cross-entropy is identical to the classification case, just
applied at every spatial position:
Loss = mean over (n, h, w) of -log( softmax(logits[n, :, h, w])[target[n, h, w]] )
F.cross_entropy in PyTorch handles this shape natively. No reshape needed.
Dice loss and why you need it
Cross-entropy treats every pixel equally. That is wrong when one class dominates the frame
(medical imaging: 99% background, 1% tumour). The network can score 99% accuracy by
predicting background everywhere and still be useless.
Dice loss solves this by directly optimising the overlap between predicted and true mask:
Dice(p, y) = 2 * sum(p * y) / (sum(p) + sum(y) + epsilon)
Dice_loss = 1 - Dice
where p is the sigmoid/softmax probability map for a class and y is the binary ground-truth
mask. The loss is zero only when the overlap is perfect. Because it is ratio-based, class
imbalance is irrelevant.
AIENGINEERINGFROMSCRATCH.COM 194

SEMANTIC SEGMENTATION — U-NET
In practice, use the combined loss:
L = L_cross_entropy + lambda * L_dice (lambda ~ 1)
Cross-entropy gives stable gradients early in training; Dice focuses the tail of training on
actually matching the mask shape. This combination is the medical-imaging default and hard
to beat on any class-imbalanced dataset.
Evaluation metrics
• Pixel accuracy — percent of pixels predicted correctly. Cheap. Broken on imbalanced
data for the same reason as accuracy in classification.
• IoU per class — intersection over union for each class’s mask; average across classes
= mIoU.
• Dice (F1 on pixels) — similar to IoU; Dice = 2 * IoU / (1 + IoU). Medical imaging
prefers Dice, driving community prefers IoU; they are monotonically related.
• Boundary F1 — measures how close predicted boundaries are to ground-truth bound-
aries, penalising even small shifts. Important for high-precision tasks like semiconductor
inspection.
Report IoU per class, not just mIoU. Mean IoU hides a class at 15% when nine others are at
85%.
Input resolution trade-off
U-Net’s encoder halves resolution four times, so the input must be divisible by 16. Medical
images are often 512x512 or 1024x1024. Autonomous-driving crops are 2048x1024. The
memory cost of U-Net scales with H * W * C_max, and at 1024x1024 with 1024 bottleneck
channels the forward pass already uses gigabytes of VRAM.
Two standard workarounds: 1. Tile the input — process 256x256 tiles with overlap and stitch.
2. Replace the bottleneck with dilated convolutions that keep spatial resolution higher but
widen receptive field (the DeepLab family).
For a first model, a 256x256 input with a 64-channel-base U-Net trains comfortably on 8 GB
VRAM.
Interactive figure: segmentation-flood. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/04-computer-vision/07-semantic-segmentation-unet
Build It
Step 1: Encoder block
Two 3x3 convs with batch norm and ReLU. The first conv changes channel count; the second
keeps it.
import torch
import torch.nn as nn
import torch.nn.functional as F
class DoubleConv(nn.Module):
def __init__(self, in_c, out_c):
super().__init__()
self.net = nn.Sequential(
AIENGINEERINGFROMSCRATCH.COM 195

SEMANTIC SEGMENTATION — U-NET
nn.Conv2d(in_c, out_c, kernel_size=3, padding=1, bias=False),
nn.BatchNorm2d(out_c),
nn.ReLU(inplace=True),
nn.Conv2d(out_c, out_c, kernel_size=3, padding=1, bias=False),
nn.BatchNorm2d(out_c),
nn.ReLU(inplace=True),
)
def forward(self, x):
return self.net(x)
This block is reused throughout. bias=False because BN’s beta handles the bias.
Step 2: Down and up blocks
class Down(nn.Module):
def __init__(self, in_c, out_c):
super().__init__()
self.net = nn.Sequential(
nn.MaxPool2d(2),
DoubleConv(in_c, out_c),
)
def forward(self, x):
return self.net(x)
class Up(nn.Module):
def __init__(self, in_c, out_c):
super().__init__()
self.up = nn.Upsample(scale_factor=2, mode="bilinear", align_corners=False)
self.conv = DoubleConv(in_c, out_c)
def forward(self, x, skip):
x = self.up(x)
if x.shape[-2:] != skip.shape[-2:]:
x = F.interpolate(x, size=skip.shape[-2:], mode="bilinear", align_corners=False)
x = torch.cat([skip, x], dim=1)
return self.conv(x)
The spatial-only shape check (shape[-2:]) handles inputs whose dimensions are not divisible
by 16; a safe F.interpolate aligns the tensor before the concat. Comparing the full shape
would also trigger on channel-count differences, which should be a loud error, not a silent
interpolate.
Step 3: The U-Net
class UNet(nn.Module):
def __init__(self, in_channels=3, num_classes=2, base=64):
super().__init__()
self.inc = DoubleConv(in_channels, base)
self.d1 = Down(base, base * 2)
self.d2 = Down(base * 2, base * 4)
self.d3 = Down(base * 4, base * 8)
self.d4 = Down(base * 8, base * 16)
AIENGINEERINGFROMSCRATCH.COM 196

SEMANTIC SEGMENTATION — U-NET
self.u1 = Up(base * 16 + base * 8, base * 8)
self.u2 = Up(base * 8 + base * 4, base * 4)
self.u3 = Up(base * 4 + base * 2, base * 2)
self.u4 = Up(base * 2 + base, base)
self.outc = nn.Conv2d(base, num_classes, kernel_size=1)
def forward(self, x):
x1 = self.inc(x)
x2 = self.d1(x1)
x3 = self.d2(x2)
x4 = self.d3(x3)
x5 = self.d4(x4)
x = self.u1(x5, x4)
x = self.u2(x, x3)
x = self.u3(x, x2)
x = self.u4(x, x1)
return self.outc(x)
net = UNet(in_channels=3, num_classes=2, base=32)
x = torch.randn(1, 3, 256, 256)
print(f"output: {net(x).shape}")
print(f"params: {sum(p.numel() for p in net.parameters()):,}")
Output shape (1, 2, 256, 256) — same spatial size as the input, num_classes channels. About
7.7M parameters at base=32.
Step 4: Losses
def dice_loss(logits, targets, num_classes, eps=1e-6):
probs = F.softmax(logits, dim=1)
targets_one_hot = F.one_hot(targets, num_classes).permute(0, 3, 1, 2).float()
dims = (0, 2, 3)
intersection = (probs * targets_one_hot).sum(dim=dims)
denom = probs.sum(dim=dims) + targets_one_hot.sum(dim=dims)
dice = (2 * intersection + eps) / (denom + eps)
return 1 - dice.mean()
def combined_loss(logits, targets, num_classes, lam=1.0):
ce = F.cross_entropy(logits, targets)
dc = dice_loss(logits, targets, num_classes)
return ce + lam * dc, {"ce": ce.item(), "dice": dc.item()}
Dice is computed per class then averaged (macro Dice). The eps prevents division by zero on
classes absent from the batch.
Step 5: IoU metric
@torch.no_grad()
def iou_per_class(logits, targets, num_classes):
preds = logits.argmax(dim=1)
ious = torch.zeros(num_classes)
for c in range(num_classes):
pred_c = (preds == c)
true_c = (targets == c)
AIENGINEERINGFROMSCRATCH.COM 197

SEMANTIC SEGMENTATION — U-NET
inter = (pred_c & true_c).sum().float()
union = (pred_c | true_c).sum().float()
ious[c] = (inter / union) if union > 0 else torch.tensor(float("nan"))
return ious
Returns a vector of length C. nan marks classes absent from the batch — do not average over
those when computing mIoU.
Step 6: Synthetic dataset for end-to-end verification
Generate shapes on coloured backgrounds so the network has to learn shape, not pixel colour.
import numpy as np
from torch.utils.data import Dataset, DataLoader
def synthetic_segmentation(num_samples=200, size=64, seed=0):
rng = np.random.default_rng(seed)
images = np.zeros((num_samples, size, size, 3), dtype=np.float32)
masks = np.zeros((num_samples, size, size), dtype=np.int64)
for i in range(num_samples):
bg = rng.uniform(0, 1, (3,))
images[i] = bg
masks[i] = 0
num_shapes = rng.integers(1, 4)
for _ in range(num_shapes):
cls = int(rng.integers(1, 3))
color = rng.uniform(0, 1, (3,))
cx, cy = rng.integers(10, size - 10, size=2)
r = int(rng.integers(4, 12))
yy, xx = np.meshgrid(np.arange(size), np.arange(size), indexing="ij")
if cls == 1:
mask = (xx - cx) ** 2 + (yy - cy) ** 2 < r ** 2
else:
mask = (np.abs(xx - cx) < r) & (np.abs(yy - cy) < r)
images[i][mask] = color
masks[i][mask] = cls
images[i] += rng.normal(0, 0.02, images[i].shape)
images[i] = np.clip(images[i], 0, 1)
return images, masks
class SegDataset(Dataset):
def __init__(self, images, masks):
self.images = images
self.masks = masks
def __len__(self):
return len(self.images)
def __getitem__(self, i):
img = torch.from_numpy(self.images[i]).permute(2, 0, 1).float()
mask = torch.from_numpy(self.masks[i]).long()
return img, mask
Three classes: background (0), circles (1), squares (2). The network must learn to distinguish
AIENGINEERINGFROMSCRATCH.COM 198

SEMANTIC SEGMENTATION — U-NET
shape.
Step 7: Training loop
def train_one_epoch(model, loader, optimizer, device, num_classes):
model.train()
loss_sum, total = 0.0, 0
iou_sum = torch.zeros(num_classes)
for x, y in loader:
x, y = x.to(device), y.to(device)
logits = model(x)
loss, _ = combined_loss(logits, y, num_classes)
optimizer.zero_grad()
loss.backward()
optimizer.step()
loss_sum += loss.item() * x.size(0)
total += x.size(0)
iou_sum += iou_per_class(logits, y, num_classes).nan_to_num(0)
return loss_sum / total, iou_sum / len(loader)
Run this for 10-30 epochs on the synthetic dataset and watch mIoU climb past 0.9 for the
shape classes. Note the nan_to_num(0) treats classes absent from a batch as zero; for accurate
per-class IoU, mask by presence and use torch.nanmean across batches at evaluation time
rather than averaging here.
Use It
For production, segmentation_models_pytorch (“smp”) wraps every standard segmentation
architecture with any torchvision or timm backbone. Three lines:
import segmentation_models_pytorch as smp
model = smp.Unet(
encoder_name="resnet34",
encoder_weights="imagenet",
in_channels=3,
classes=3,
)
Also worth knowing for real work: - DeepLabV3+ replaces max-pool-based downsampling
with dilated convs so the bottleneck keeps resolution; faster boundaries on satellite and driv-
ing data. - SegFormer swaps the conv encoder for a hierarchical transformer; current SOTA
on many benchmarks. - Mask2Former / OneFormer unify semantic, instance, and panoptic
segmentation in a single architecture.
All three are drop-in replacements in smp or transformers with the same data loader.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/04-computer-vision/07-semantic-segmentation-
unet
AIENGINEERINGFROMSCRATCH.COM 199

SEMANTIC SEGMENTATION — U-NET
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/04-computer-vision/07-semantic-segmentation-
unet/code
1. (Easy) Implement bce_dice_loss for a binary segmentation task (foreground vs back-
ground). Verify on a synthetic two-class dataset that the combined loss converges faster
than BCE alone when the foreground is 5% of pixels.
2. (Medium) Replace the nn.Upsample + conv up-block with a nn.ConvTranspose2d up-
block. Train both on the synthetic dataset and compare mIoU. Observe where checker-
board artifacts appear in the transposed-conv version.
3. (Hard) Take a real segmentation dataset (Oxford-IIIT Pets, Cityscapes mini split, or a
medical subset) and train the U-Net to within 2 IoU points of the smp.Unet reference.
Report per-class IoU and identify which classes benefit most from adding Dice to the
loss.
Key Terms
Term What people say What it actually means
Semantic “Label every pixel” Per-pixel classification into C classes;
segmenta- instances of the same class merge
tion
Instance “Label every object” Separates distinct instances of the same
segmenta- class; foreground-only
tion
Panoptic “Semantic + instance” Every pixel gets a class; every thing
segmenta- instance also gets a unique id
tion
Skip “U-Net bridge” Concatenation of encoder features into
connection matching-resolution decoder features;
preserves high-frequency detail
Transposed “Deconvolution” Learnable upsampling; can produce
conv checkerboard artifacts
Dice loss “Overlap loss” 1 - 2
mIoU “Mean intersection over union” Average IoU across classes; the
community-standard metric for
segmentation
Boundary “Boundary accuracy” F1 score computed on boundary pixels only;
F1 matters for precision-critical tasks
Further Reading
• U-Net: Convolutional Networks for Biomedical Image Segmentation (Ronneberger et al.,
2015) — the original paper; the figure everyone copies is on page 2
• Fully Convolutional Networks (Long et al., 2015) — the paper that first made segmenta-
tion an end-to-end conv problem
• segmentation_models_pytorch — the reference for production segmentation; every stan-
dard architecture plus every standard loss
AIENGINEERINGFROMSCRATCH.COM 200

SEMANTIC SEGMENTATION — U-NET
• Lessons learned from training SOTA segmentation (kaggle.com competitions) — a walk-
through of why TTA, pseudo-labeling, and class weights matter on real data
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/04-computer-vision/07-semantic-segmentation-unet
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/04-computer-vision/07-semantic-segmentation-unet/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/04-computer-vision/07-semantic-segmentation-unet
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 201