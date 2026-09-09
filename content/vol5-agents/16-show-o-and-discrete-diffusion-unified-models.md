---
title: "Show-o and Discrete-Diffusion Unified Models"
volume: "vol5-agents"
part: "Part I — Multimodal AI"
chapter_number: 16
source_pages: "75-78"
---

# Show-o and Discrete-Diffusion Unified Models

Show-o and Discrete-Diffusion Unified
Models
Transfusion mixes continuous and discrete representations. Show-o (Xie et al., Au-
gust 2024) goes the other way: text tokens use causal next-token prediction, image
tokens use masked discrete diffusion in the spirit of MaskGIT. Both sit inside one
transformer with a hybrid attention mask. The result unifies VQA, text-to-image, in-
painting, and mixed-modality generation on one backbone, one tokenizer per modal-
ity, one loss formulation (next-token extended to masked prediction). This lesson
walks the Show-o design — why masked discrete diffusion is a parallel, few-step
image generator — and contrasts with Transfusion and Emu3.
Type: Learn Languages: Python (stdlib, masked-discrete-diffusion sampler) Prerequisites:
Phase 12 · 13 (Transfusion) Time: ~120 minutes
Learning Objectives
• Explain masked discrete diffusion: the schedule that masks tokens uniformly then asks
the transformer to recover them.
• Compare parallel image decoding (Show-o, MaskGIT) to autoregressive image decoding
(Chameleon, Emu3) on speed and quality.
• Name the three tasks Show-o handles in one checkpoint: T2I, VQA, image inpainting.
• Pick a masking schedule (cosine, linear, truncated) and reason about its effect on sample
quality.
The Problem
Transfusion’s two-loss training works but has trickier dynamics — the continuous diffusion
loss lives on a different numerical scale from the discrete NTP loss. Balancing loss weights
is a hyperparameter search. The architecture is effective but complex.
Show-o’s answer: keep both modalities discrete (like Chameleon), but generate images in
parallel via masked discrete diffusion instead of sequentially. The training objective becomes
a single masked-token-prediction that generalizes next-token-prediction naturally.
The Concept
Masked discrete diffusion (MaskGIT)
The original Chang et al. (2022) MaskGIT trick is elegant. Start from a fully-masked image
(every token is the special <MASK> id). At each step, predict all masked tokens in parallel, then
keep the top-K most confident predictions and re-mask the rest. After ~8-16 iterations, all
tokens are filled in. The schedule of how many tokens to unmask per step is tuned — cosine
schedules work well.
AIENGINEERINGFROMSCRATCH.COM 69

SHOW-O AND DISCRETE-DIFFUSION UNIFIED MODELS
Training is simple: sample a masking ratio uniformly from [0, 1], apply it to the image’s VQ
tokens, train the transformer to recover the masked ones. Exactly what BERT did for text,
scaled to image generation.
Show-o: one transformer, hybrid mask
Show-o puts MaskGIT inside a causal-language-model transformer. The attention mask is:
• Text tokens: causal (standard LLM).
• Image tokens: full bidirectional within the image block (so the masked tokens can see
every other image token during prediction).
• Text-to-image: text attends to prior images, image attends to prior text.
Training alternates between: 1. Standard NTP on text sequences. 2. T2I samples: text →
image with masked image tokens, masked-token-prediction loss. 3. VQA samples: image →
text with masked text tokens (really just NTP).
The unified loss is cross-entropy on <MASK> tokens, which covers both text NTP (only the last
token is “masked”) and image masked-diffusion (random subset is masked).
Parallel sampling
Show-o generates an image in ~16 steps instead of ~1000 (autoregressive per token) or ~20
(diffusion). At each step, predict all masked tokens in parallel; commit the top-K confident;
repeat.
Compare: - Chameleon / Emu3 (autoregressive over tokens): N_tokens forward passes, typi-
cally 1024-4096 per image. - Transfusion (continuous diffusion): ~20 steps, each a full trans-
former pass. - Show-o (masked discrete diffusion): ~16 steps, each a full transformer pass.
Show-o is faster than Chameleon at similar-scale models, roughly matches Transfusion step
count with lower per-step cost (discrete vocab logits vs continuous MSE loss).
Tasks in one checkpoint
Show-o supports four tasks at inference, selected by prompt format:
• Text generation: standard autoregressive text output.
• VQA: image in, text out.
• T2I: text in, image out via masked discrete diffusion.
• Inpainting: image with some tokens masked, fill in.
The inpainting capability comes for free from the masked-prediction training. Mask a region
of the VQ-token grid, feed the rest plus a text prompt, predict the masked tokens.
Masking schedule
The schedule of how many tokens to unmask per step shapes quality. Show-o recommends
cosine:
mask_ratio(t) = cos(pi * t / (2 * T)) # t = 0..T
At step 0, all tokens masked (ratio 1.0). At step T, none masked. Cosine concentrates mass
on mid-range ratios where prediction is most informative. Linear schedules also work but
plateau faster.
AIENGINEERINGFROMSCRATCH.COM 70

SHOW-O AND DISCRETE-DIFFUSION UNIFIED MODELS
Show-o2
Show-o2 (2025 follow-up, arXiv 2506.15564) scales Show-o: larger LLM base, better tok-
enizer, improved mask schedule. Same architectural pattern.
Where Show-o sits
In the 2026 taxonomy:
• Discrete tokens + NTP: Chameleon, Emu3. Simple but slow inference.
• Discrete tokens + masked diffusion: Show-o, MaskGIT, LlamaGen, Muse. Parallel sam-
pling, still lossy by tokenizer.
• Continuous + diffusion: Transfusion, MMDiT, DiT. Highest quality, more complex train-
ing.
• Continuous + flow matching in a VLM: JanusFlow, InternVL-U. Newest.
Pick by task: Show-o when you want T2I + inpainting + VQA in one open model with reason-
able speed; Transfusion when quality is paramount and you can afford the two-loss plumbing.
Interactive figure: masked-diffusion-unmask. This one moves. Watch it animate and drag
its controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=ph
ases/12-multimodal-ai/14-show-o-discrete-diffusion-unified
Use It
code/main.py simulates Show-o sampling:
• A toy grid of 16 VQ tokens.
• A mock “transformer” that predicts logits based on a prompt and the currently-unmasked
tokens.
• Parallel masked sampling over 8 steps with cosine schedule.
• Prints the intermediate states (mask pattern evolution) and the final tokens.
Run it, watch the mask dissolve step by step.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/12-multimodal-ai/14-show-o-discrete-diffusion-
unified
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/12-multimodal-ai/14-show-o-discrete-diffusion-
unified/code
1. Masked discrete diffusion samples in ~16 steps. Why not 1? What breaks if you unmask
everything at step 0?
2. Inpainting is free with masked diffusion. Propose a product use case (real or hypotheti-
cal) where Show-o’s inpainting beats a specialist model.
3. Cosine schedule vs linear schedule: trace the number of unmasked tokens per step for
T=8. Which is more balanced?
4. A 512x512 Show-o image is 1024 tokens. At vocab K=16384, the model emits 1024 *
log2(16384) = 14,336 bits (~1.75 KiB) of data. Stable Diffusion outputs 51251224 bits
AIENGINEERINGFROMSCRATCH.COM 71

SHOW-O AND DISCRETE-DIFFUSION UNIFIED MODELS
= 6,291,456 bits (~768 KiB) of raw pixels. What is the compression ratio and what
quality does it buy?
5. Read LlamaGen (arXiv:2406.06525). How is LlamaGen’s class-conditional autoregres-
sive image model different from Show-o’s masked approach?
Key Terms
Term What people say What it actually means
Masked “MaskGIT-style” Training to predict masked tokens; at
discrete inference, iteratively unmask the
diffusion most-confident predictions
Cosine “Unmask schedule” Decay of mask ratio over inference steps;
schedule concentrates confidence growth at
mid-range
Parallel “All tokens at once” Every step predicts the full sequence of
decoding masked tokens in one forward pass, then
commits top-K
Hybrid “Causal + bidirectional” Mask that is causal over text tokens and
attention bidirectional within image blocks
Inpainting “Fill-in generation” Condition on an image with some tokens
masked, predict the missing ones; free from
the training objective
Commitment “Top-K per step” How many tokens are declared “done” per
rate iteration; controls inference vs quality
trade-off
Further Reading
• Xie et al. — Show-o (arXiv:2408.12528)
• Show-o2 (arXiv:2506.15564)
• Chang et al. — MaskGIT (arXiv:2202.04200)
• Sun et al. — LlamaGen (arXiv:2406.06525)
• Chang et al. — Muse (arXiv:2301.00704)
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 72