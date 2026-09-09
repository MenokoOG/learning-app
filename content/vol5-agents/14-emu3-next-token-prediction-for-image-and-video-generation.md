---
title: "Emu3: Next-Token Prediction for Image and Video Generation"
volume: "vol5-agents"
part: "Part I — Multimodal AI"
chapter_number: 14
source_pages: "65-69"
---

# Emu3: Next-Token Prediction for Image and Video Generation

Emu3: Next-Token Prediction for Image
and Video Generation
BAAI’s Emu3 (Wang et al., September 2024) is the 2024 result that should have
ended the diffusion-versus-autoregressive debate. A single Llama-style decoder-
only transformer, trained only on the next-token-prediction objective, across a uni-
fied vocabulary of text + VQ image tokens + 3D VQ video tokens, beats SDXL on
image generation and LLaVA-1.6 on perception. No CLIP loss. No diffusion sched-
ule. Classifier-free guidance is used at inference for quality, but the core training
objective is next-token prediction with teacher forcing. Published in Nature. This
lesson reads the Emu3 thesis — why a better tokenizer plus scale is all you need —
and contrasts with diffusion approaches.
Type: Learn Languages: Python (stdlib, 3D video tokenizer math + autoregressive sampler
skeleton) Prerequisites: Phase 12 · 11 (Chameleon) Time: ~120 minutes
Learning Objectives
• Explain why Emu3’s single-loss next-token objective works despite the long-held assump-
tion that diffusion is required for image quality.
• Describe the 3D video tokenizer: what a spatiotemporal VQ codebook looks like, why
patches span time.
• Compare Emu3 vs Stable Diffusion XL on (training compute, inference cost, quality ceil-
ing).
• Name the three roles the same Emu3 model plays: Emu3-Gen (image gen), Emu3-Chat
(perception), Emu3-Stage2 (video gen).
The Problem
The conventional wisdom through 2024: image generation needs diffusion. The argument:
discrete image tokens lose too much information to reconstruct detail, and autoregressive
sampling accumulates error across thousands of tokens. Stable Diffusion, DALL-E 3, Imagen,
Midjourney all use some form of diffusion. Chameleon (Lesson 12.11) partially disproved this
at small scale but did not match SDXL on quality.
Emu3 attacked the argument head-on. The claim: better visual tokenizer + enough scale +
next-token loss = diffusion-beating image generation in the same model that also does per-
ception.
The bet was controversial when it published. Two years on, the open-source unified-
generation family (Emu3, Show-o, Janus-Pro, Transfusion) is the default path for research;
production frontier models appear to use some variant.
AIENGINEERINGFROMSCRATCH.COM 59

EMU3: NEXT-TOKEN PREDICTION FOR IMAGE AND VIDEO GENERATION
The Concept
The Emu3 tokenizer
The key ingredient is the visual tokenizer. Emu3 trains a custom IBQ-class tokenizer (In-
verse Bottleneck Quantizer, SBER-MoVQGAN family) at 8x8 resolution-reduction per token.
A 512x512 image becomes 64x64 = 4096 tokens at codebook size 32768.
This is larger than Chameleon’s 1024 tokens per 512x512 at K=8192 but cheaper per token
(smaller codebook lookups, simpler codec). The key metric: reconstruction PSNR at 30.5 dB,
competitive with Stable Diffusion’s continuous latent space at 32 dB.
For video: a 3D VQ tokenizer encodes a spatiotemporal patch (4x4x4 pixels) to one integer.
A 4s clip at 8 FPS has 32 frames; at 256x256 with 4x spatial and 4x temporal reduction, the
token count is (256/4) * (256/4) * (32/4) = 64 * 64 * 8 = 32,768 tokens.
Tokenizer quality is the ceiling. Emu3’s contribution is partly “we trained a very good tok-
enizer.”
Single-loss training
Emu3 uses one objective: next-token prediction on a shared vocabulary across text tokens,
2D image tokens, and 3D video tokens. Weights are multiplied by modality-specific factors
during training to balance contribution, but the loss function is identical.
Train on a mix of: - Image gen: <text caption> <image> image_tokens </image> - Image
perception: <image> image_tokens </image> <question> text_tokens - Video gen: <text
caption> <video> video_tokens </video> - Video perception: analogous. - Text only: stan-
dard NTP.
The model learns when to emit image tokens vs text tokens from the data distribution. Gen-
eration emerges from the model predicting image tokens after the <image> tag.
Classifier-free guidance and temperature
Autoregressive image generation gets much better with classifier-free guidance (CFG) at in-
ference. Emu3 uses it: generate twice, once with the full caption, once with an empty caption,
mix the logits with a guidance weight (typical 3.0-7.0). This is the same CFG trick diffusion
uses, borrowed to the autoregressive setting.
Temperature matters: too high, artifacts; too low, mode collapse. Emu3’s recommended
temperature is 1.0 for perception, 0.8 for image generation.
Three roles, one model
Emu3 ships as three functionally distinct APIs but one underlying weight set:
• Emu3-Gen. Image generation. Input text, output image tokens.
• Emu3-Chat. VQA and captioning. Input image (tokens), output text.
• Emu3-Stage2. Video generation and video VQA. Input text or video, output text or video.
No task-specific heads. Just different prompt templates. Same checkpoint.
Benchmarks
From Emu3 paper (September 2024):
AIENGINEERINGFROMSCRATCH.COM 60

EMU3: NEXT-TOKEN PREDICTION FOR IMAGE AND VIDEO GENERATION
• Image generation: beats SDXL on MJHQ-30K FID (5.4 vs 5.6), GenEval overall (0.54 vs
0.55 — statistical tie), and Deep-Eval’s composite on-par.
• Image perception: beats LLaVA-1.6 on VQAv2 (75.1 vs 72.4) and roughly matches on
MMMU.
• Video generation: 4-second-clip quality at competitive FVD with Sora-era publicly bench-
marked models.
The numbers are not always winning — Emu3 trades a point here for a point there — but the
claim “next-token prediction is all you need” is defensible across modalities.
Compute cost
Emu3 was trained on ~300 billion multimodal tokens with a 7B-parameter model. GPU-hours
roughly comparable to Llama-2-7B pretraining (2k-4k GPU-years on A100-class silicon). Dif-
fusion models like Stable Diffusion 3 train in similar budgets but need separate text encoders
and more complex pipelines.
At inference, Emu3 is slower than SDXL per image: 4096 image tokens at 30 tok/s is ~2
minutes per 512x512 image, vs 2-5 seconds for SDXL. Speculative decoding and KV-cache
optimization narrow the gap but do not close it. Autoregressive image gen is compute-heavy;
this is the standing trade-off.
Why it matters
Emu3’s deep contribution is conceptual. If next-token prediction scales to match diffusion
on image generation, the unified-model path (one loss, one backbone, any modality) is viable.
Future models do not need separate text encoders, separate diffusion schedulers, separate
VAEs. One transformer, one tokenizer per modality, scale.
Show-o, Janus-Pro, and InternVL-U all build on or challenge this thesis. Chinese labs (BAAI,
DeepSeek) publish more aggressively in this direction than US labs through 2025.
Interactive figure: l5-emu3-next-token. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/12-multimodal-ai/12-emu3-next-token-for-generation
Use It
code/main.py builds two toy pieces:
• A 2D vs 3D VQ tokenizer count calculator: given (resolution, patch, clip_length, FPS),
compute token counts for image vs video.
• An autoregressive image-token sampler with classifier-free guidance at temperature.
The CFG implementation matches Emu3’s recipe — mix conditional and unconditional logits
with a guidance weight.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/12-multimodal-ai/12-emu3-next-token-for-
generation
AIENGINEERINGFROMSCRATCH.COM 61

EMU3: NEXT-TOKEN PREDICTION FOR IMAGE AND VIDEO GENERATION
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/12-multimodal-ai/12-emu3-next-token-for-
generation/code
1. Emu3 produces 4096 tokens per 512x512 image at 8x8 reduction. Compute the equiva-
lent for 1024x1024 and 2048x2048. What happens to inference latency?
2. Read Emu3 Section 3.3 on the video tokenizer. Describe the 3D VQ patch shape and why
it is 4x4x4 not 8x8x1.
3. Classifier-free guidance weight 5.0 vs 3.0: what visual effect? Trace the math in
code/main.py.
4. Compute training FLOPs for Emu3-7B at 300B tokens and compare to Stable Diffusion
3. Which was more expensive to train?
5. Emu3 beats SDXL on FID but not on VQAv2 vs specialized VLMs. Explain why the unified-
loss approach shows different strengths vs specialists on different benchmarks.
Key Terms
Term What people say What it actually means
Next-token “NTP” Standard autoregressive loss: predict
prediction token[i+1] given token[0..i]; works for every
modality when tokenized
IBQ “Inverse bottleneck quantizer” A class of VQ-VAE with larger codebooks
tokenizer (32768+) and better reconstruction than
Chameleon’s
3D VQ “Spatiotemporal quantizer” Codebook indexed by (time, row, col); one
token covers a 4x4x4 pixel cube
Classifier- “CFG” Mix conditional and unconditional logits
free with weight gamma; boosts image quality at
guidance inference
Unified “Shared tokens” Text + image + video all draw from the
vocabulary same integer space; model predicts
whichever modality comes next
MJHQ-30K “Image gen benchmark” Midjourney-quality benchmark with 30k
prompts; Emu3 reports FID here
Further Reading
• Wang et al. — Emu3: Next-Token Prediction is All You Need (arXiv:2409.18869)
• Sun et al. — Emu: Generative Pretraining in Multimodality (arXiv:2307.05222)
• Liu et al. — LWM (arXiv:2402.08268)
• Yu et al. — MAGVIT-v2 (arXiv:2310.05737)
• Tian et al. — VAR (arXiv:2404.02905)
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/12-multimodal-ai/12-emu3-next-token-for-generation
AIENGINEERINGFROMSCRATCH.COM 62

EMU3: NEXT-TOKEN PREDICTION FOR IMAGE AND VIDEO GENERATION
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/12-multimodal-ai/12-emu3-next-token-for-generation/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 63