---
title: "Open-Vocabulary Vision — CLIP"
volume: "vol2-deep-learning"
part: "Part II — Computer Vision"
chapter_number: 33
source_pages: "274-278"
---

# Open-Vocabulary Vision — CLIP

Open-Vocabulary Vision — CLIP
Train an image encoder and a text encoder together so that matching (image, cap-
tion) pairs land at the same point in a shared space. That is the whole trick.
Type: Build + Use Languages: Python Prerequisites: Phase 4 Lesson 14 (ViT), Phase 4
Lesson 17 (Self-Supervised) Time: ~45 minutes
Learning Objectives
• Explain CLIP’s two-tower architecture and contrastive training objective
• Use a pretrained CLIP (or SigLIP) for zero-shot classification without any task-specific
training
• Implement zero-shot classification from scratch: encode class prompts, compute cosine
similarity, take argmax
• Distinguish CLIP, SigLIP, OpenCLIP, and LLaVA/LLaMA-vision models — what each is for
in 2026
The Problem
Traditional classifiers are closed-vocabulary: a 1000-class ImageNet model can only predict
1000 labels. Every new category requires labelled data and a retrained head.
CLIP (Radford et al., OpenAI 2021) showed that training on 400M (image, caption) pairs
scraped from the web produces a model that can classify into any set of categories at infer-
ence, described purely in natural language. You give it a new class by writing a sentence.
That capability — zero-shot transfer — is why every modern vision system starts with a CLIP-
family checkpoint. Detection (Grounding DINO, OWL-ViT), segmentation (CLIPSeg, SAM),
retrieval, content moderation, VLMs, and text-to-image generation all build on CLIP-style
joint embeddings.
The Concept
Two towers
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/04-computer-vision/18-open-vocab-clip
Both encoders end with a linear projection to the same embedding dimension (512 for CLIP-
B/32, 1024 for CLIP-L/14). L2-normalise and compute cosine similarity.
The objective
Given a batch of N (image, caption) pairs, build an NxN similarity matrix. Train both encoders
so the diagonal (matching pairs) has high similarity and off-diagonals (non-matching) have low
similarity.
AIENGINEERINGFROMSCRATCH.COM 270

OPEN-VOCABULARY VISION — CLIP
sim_matrix = image_embeddings @ text_embeddings.T / tau
loss_i2t = cross_entropy(sim_matrix, targets=arange(N))
loss_t2i = cross_entropy(sim_matrix.T, targets=arange(N))
loss = (loss_i2t + loss_t2i) / 2
Symmetric because both image-to-text and text-to-image retrieval should work. tau (temper-
ature) is typically learned as a scalar parameter, initialised to 0.07.
SigLIP: a better loss
SigLIP (Zhai et al., 2023) replaced the softmax with per-pair sigmoid:
loss = mean over pairs of log(1 + exp(-y_ij * sim_ij))
y_ij = +1 if matching, -1 otherwise
Per-pair loss removes the batch-level normalisation that CLIP requires. SigLIP trains better
at small batch sizes and matches or exceeds CLIP at equal data.
Zero-shot classification
Given a trained CLIP:
1. For each class, compose a prompt: “a photo of a {class}”.
2. Encode all class prompts with the text encoder -> T shape (C, d).
3. Encode the test image -> I shape (1, d).
4. Similarity = I @ T.T shape (1, C).
5. Argmax -> predicted class.
Prompt engineering matters. OpenAI published 80 prompt templates for ImageNet (“a photo
of a {}”, “a blurry photo of a {}”, “a sketch of a {}”, …). Average the embeddings of all
templates per class for an extra 1-3% top-1 accuracy.
Where CLIP-style models are used in 2026
• Zero-shot classification — direct use.
• Image retrieval — encode all images once, embed query at inference.
• Text-conditioned detection — Grounding DINO, OWL-ViT wrap a CLIP text tower
around a detector.
• Text-conditioned segmentation — CLIPSeg; SAM uses text-prompt inputs via CLIP.
• VLMs — LLaVA, Qwen-VL, InternVL wire a CLIP-family vision encoder into an LLM.
• Text-to-image gen — Stable Diffusion, DALL-E 3 condition on CLIP text embeddings.
Once you have a shared embedding space, every vision+language task becomes a distance
computation.
Interactive figure: clip-contrastive. This one moves. Watch it animate and drag its con-
trols in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/04-
computer-vision/18-open-vocab-clip
Build It
Step 1: A tiny two-tower model
Real CLIP is ViT + transformer. For this lesson the towers are small MLPs over pre-extracted
features so the training signal is visible on CPU.
AIENGINEERINGFROMSCRATCH.COM 271

OPEN-VOCABULARY VISION — CLIP
import torch
import torch.nn as nn
import torch.nn.functional as F
class TwoTower(nn.Module):
def __init__(self, img_in=128, txt_in=64, emb=64):
super().__init__()
self.image_proj = nn.Sequential(nn.Linear(img_in, 128), nn.ReLU(), nn.Linear(128, emb))
self.text_proj = nn.Sequential(nn.Linear(txt_in, 128), nn.ReLU(), nn.Linear(128, emb))
self.logit_scale = nn.Parameter(torch.ones([]) * 2.6592) # ln(1/0.07)
def forward(self, img_feats, txt_feats):
i = F.normalize(self.image_proj(img_feats), dim=-1)
t = F.normalize(self.text_proj(txt_feats), dim=-1)
return i, t, self.logit_scale.exp()
Two projections, shared-dim output, learned temperature. Same shape as the real CLIP API.
Step 2: Contrastive loss
def clip_loss(image_emb, text_emb, logit_scale):
N = image_emb.size(0)
sim = logit_scale * image_emb @ text_emb.T
targets = torch.arange(N, device=sim.device)
l_i = F.cross_entropy(sim, targets)
l_t = F.cross_entropy(sim.T, targets)
return (l_i + l_t) / 2
Symmetric. Higher logit_scale = sharper softmax = more confident but risk of instability.
Step 3: Zero-shot classifier
@torch.no_grad()
def zero_shot_classify(model, image_feats, class_text_feats, class_names):
"""
image_feats: (N, img_in)
class_text_feats: (C, txt_in) one averaged embedding per class
"""
i = F.normalize(model.image_proj(image_feats), dim=-1)
t = F.normalize(model.text_proj(class_text_feats), dim=-1)
sim = i @ t.T
pred = sim.argmax(dim=-1)
return [class_names[p] for p in pred.tolist()]
One line per step. This is the exact zero-shot procedure used with a production CLIP check-
point.
Step 4: Sanity check
torch.manual_seed(0)
model = TwoTower()
img = torch.randn(8, 128)
txt = torch.randn(8, 64)
AIENGINEERINGFROMSCRATCH.COM 272

OPEN-VOCABULARY VISION — CLIP
i, t, scale = model(img, txt)
loss = clip_loss(i, t, scale)
print(f"batch size: {i.size(0)} loss: {loss.item():.3f}")
Loss should be close to log(N) = log(8) = 2.08 for a randomly initialised model — the
symmetric cross-entropy target when no structure is learned yet.
Use It
OpenCLIP is the community default in 2026:
import open_clip
import torch
from PIL import Image
model, _, preprocess = open_clip.create_model_and_transforms("ViT-B-32", pretrained="laion2b_s34b_b79k")
tokenizer = open_clip.get_tokenizer("ViT-B-32")
image = preprocess(Image.open("dog.jpg")).unsqueeze(0)
text = tokenizer(["a photo of a dog", "a photo of a cat", "a photo of a car"])
with torch.no_grad():
image_features = model.encode_image(image)
text_features = model.encode_text(text)
image_features = image_features / image_features.norm(dim=-1, keepdim=True)
text_features = text_features / text_features.norm(dim=-1, keepdim=True)
probs = (100.0 * image_features @ text_features.T).softmax(dim=-1)
print(probs)
SigLIP is newer, trains better at small scales, and is preferred for new work: google/siglip-
base-patch16-224. Hugging Face ships both.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/04-computer-vision/18-open-vocab-clip
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/04-computer-vision/18-open-vocab-clip/code
1. (Easy) Use a pretrained OpenCLIP ViT-B/32 and do zero-shot classification on CIFAR-10
with the 80-template prompt set. Report top-1 accuracy; it should be around 85-90%.
2. (Medium) Compare single-template (“a photo of a {}”) vs 80-template averaged embed-
dings on the same CIFAR-10 task. Quantify the gap and explain why templates help.
3. (Hard) Build a zero-shot image retrieval index: embed 1,000 images with CLIP, build a
FAISS index, query with a natural language description. Report retrieval recall@5 for
20 held-out queries you write by hand.
Key Terms
AIENGINEERINGFROMSCRATCH.COM 273

OPEN-VOCABULARY VISION — CLIP
Term What people say What it actually means
Two-tower “Dual encoder” Separate image and text encoders ending
in a shared-dim projection head
Zero-shot “No task-specific training” Classify into classes described only by text
at inference; no labels touched
Temperature “tau” Learned scalar that scales the similarity
/ logit_scale matrix before softmax
Prompt “A photo of a {}” Natural-language wrapper around class
template names; averaging many templates boosts
zero-shot accuracy
CLIP “Image+text model” The 2021 OpenAI model; vocabulary of the
field in 2026
SigLIP “Sigmoid CLIP” Swaps softmax for per-pair sigmoid; trains
better at small batches
OpenCLIP “Open reproduction” Community-trained CLIP variants on
LAION; production default for open-source
pipelines
VLM “Vision-language model” A CLIP-family encoder plus an LLM, trained
to answer questions about images
Further Reading
• CLIP: Learning Transferable Visual Models from Natural Language Supervision (Radford
et al., 2021)
• SigLIP: Sigmoid Loss for Language-Image Pre-Training (Zhai et al., 2023)
• OpenCLIP — the community codebase
• DINOv2 vs CLIP vs MAE: a features comparison — HF guide with side-by-side use cases
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/04-computer-vision/18-open-vocab-clip
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/04-computer-vision/18-open-vocab-clip/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/04-computer-vision/18-open-vocab-clip
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 274