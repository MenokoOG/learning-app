---
title: "Visual Autoregressive Modeling (VAR): Next-Scale Prediction"
volume: "vol4-llms"
part: "Part I — Generative AI"
chapter_number: 17
source_pages: "85-89"
---

# Visual Autoregressive Modeling (VAR): Next-Scale Prediction

Visual Autoregressive Modeling (VAR):
Next-Scale Prediction
Diffusion models sample iteratively in time (denoising steps). VAR samples itera-
tively in scale — it predicts a 1x1 token, then 2x2, then 4x4, up to the final resolution,
each scale conditioning on the previous. The 2024 paper showed VAR matches GPT-
style scaling laws for image generation and beats DiT at the same compute budget.
This lesson builds the core mechanism.
Type: Build Languages: Python (with PyTorch) Prerequisites: Phase 7 Lesson 03 (Multi-
Head Attention), Phase 8 Lesson 06 (DDPM) Time: ~90 minutes
The Problem
Autoregressive generation dominated language modeling because it scales predictably: more
compute, more parameters, lower perplexity, better outputs. Image generation had two
main AR attempts before 2024: PixelRNN/PixelCNN (pixel-by-pixel) and DALL-E 1 / Parti /
MuseGAN (token-by-token on VQ-VAE codes).
Both suffered from a generation-order problem. Pixels and tokens are arranged in a 2D grid,
but the AR model has to visit them in a 1D raster order. An early corner pixel has no idea
what the image eventually becomes. Generation quality scaled worse than GPT-on-text and
never reached diffusion-model quality at matched compute.
VAR fixes the generation-order problem by changing what is being generated. Instead of
predicting image tokens one by one in space, VAR predicts a whole image at increasing reso-
lutions. Step 1: predict a 1x1 token (the overall image “summary”). Step 2: predict a 2x2 grid
of tokens (coarser features). Step 3: predict a 4x4 grid. Step K: predict the final (H/8)x(W/8)
grid.
Each scale attends to all previous scales (causally in “scale order”) and parallel within its
own scale. The order problem disappears: the whole image at scale k is produced in one
transformer pass.
The Concept
VQ-VAE Multi-Scale Tokenizer
VAR needs a multi-scale discrete tokenizer. For an image x, it produces a sequence of
progressively higher-resolution token grids:
x -> encoder -> latent f
f -> tokenize at 1x1: token grid z_1 of shape (1, 1)
f -> tokenize at 2x2: token grid z_2 of shape (2, 2)
...
f -> tokenize at (H/p)x(W/p): token grid z_K of shape (H/p, W/p)
AIENGINEERINGFROMSCRATCH.COM 81

VISUAL AUTOREGRESSIVE MODELING (VAR): NEXT-SCALE PREDICTION
Each z_k uses the same codebook (typical size 4096-16384). The tokenization at each scale
is not independent — it is trained so that summing the residuals at each scale reconstructs f:
f ≈ upsample(embed(z_1), target_size) + ... + upsample(embed(z_K), target_size)
This is a residual VQ variant. Scale k captures what scales 1..k-1 missed. Decoder takes the
sum of all scale embeddings and produces the image.
The multi-scale VQ tokenizer is trained once (like VQGAN) and then frozen. All the generative
work is done by the autoregressive model on top.
Next-Scale Prediction
The generative model is a transformer that sees tokens from all previous scales and predicts
the tokens at the next scale.
Input sequence structure:
[START, z_1 tokens, z_2 tokens, z_3 tokens, ..., z_K tokens]
Position embeddings encode both scale index and spatial position within the scale. Attention
is causal in scale order: token at scale k, position (i, j) can attend to all tokens at scales 1..k
and to tokens at scale k itself that come earlier in whatever intra-scale order is used (VAR
uses fixed positional attention with no intra-scale causality — all positions within a scale are
predicted in parallel).
Training loss: at each scale k, predict the tokens z_k given all prior-scale tokens. Cross-
entropy loss on the discrete VQ codes. Same structure as GPT except the “sequence” is now
scale-structured.
Generation
At inference:
generate z_1 = sample from p(z_1) # 1 token
generate z_2 = sample from p(z_2 | z_1) # 4 tokens in parallel
generate z_3 = sample from p(z_3 | z_1, z_2) # 16 tokens in parallel
...
decode: f = sum of embed-and-upsample scales 1..K
image = VAE_decoder(f)
For K = 10 scales, generation is 10 transformer forward passes. Each pass produces its entire
scale in parallel — no per-token autoregression within a scale. For a 256x256 image this is
roughly 10 passes vs DiT’s 28-50.
Why Next-Scale Wins Over Next-Token
Three structural wins: 1. Coarse-to-fine aligns with natural image statistics. Human vi-
sual perception and image datasets both exhibit scale-dependent regularities: low-frequency
structure is stable and predictable; high-frequency detail is conditional on low-frequency con-
tent. Next-scale prediction exploits this. 2. Parallel generation within scale. Unlike GPT-
style token AR, VAR produces all tokens at a scale in one step. Effective generation length is
log-scale instead of linear. 3. No generation order bias. Tokens at scale k see all of scale
k-1; there is no “left-of” or “above” bias that forces early tokens to commit before late context
is available.
AIENGINEERINGFROMSCRATCH.COM 82

VISUAL AUTOREGRESSIVE MODELING (VAR): NEXT-SCALE PREDICTION
Scaling Law
Tian et al. demonstrated that VAR follows a power-law scaling curve for FID on ImageNet —
just like GPT does for perplexity. Doubling parameters or compute reliably halves error. This
was the first image-generative model to exhibit this kind of scaling behavior as cleanly as
language models. The result is that VAR-scale predictions become predictable from compute,
not empirical guesses per architecture.
Relationship to Diffusion
VAR and diffusion share the same data-compression story: both break the generation problem
into a sequence of easier subproblems.
• Diffusion: gradually add noise, learn to undo one step.
• VAR: gradually add resolution, learn to predict the next scale.
They are different axes through the problem. Both yield tractable conditional distributions.
Empirically VAR is faster at inference (fewer passes, all parallel within a scale) and matches or
beats DiT on class-conditional ImageNet. Text-conditional VAR (VARclip, HART) is an active
research direction.
Interactive figure: gx-var-next-scale. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/08-generative-ai/19-visual-autoregressive-var
Build It
In code/main.py you will: 1. Build a tiny multi-scale VQ tokenizer on synthetic “image”
data (2D Gaussian rings). 2. Train a VAR-style transformer to next-scale-predict the tokens.
3. Sample by calling the transformer 4 times (4 scales) and decoding. 4. Verify that scale-
ordered training makes generation parallel within a scale.
This is a toy implementation. The point is to see the scale-structured attention mask and the
parallel-within-scale generation actually working.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/08-generative-ai/19-visual-autoregressive-var
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/08-generative-ai/19-visual-autoregressive-var/code
1. Scale count ablation. Train VAR with 4, 6, 8, 10 scales. Measure reconstruction quality
vs number of autoregressive passes. More scales = finer residuals = better quality but
more passes.
2. Codebook size. Train tokenizers with codebook sizes 512, 4096, 16384. Larger code-
books give better reconstruction but harder prediction. Find the knee.
3. Parallel-within-scale check. For a trained VAR, measure the attention pattern explic-
itly. Within scale k, does the model attend to cross-scale positions but not intra-scale?
Verify the mask implementation.
AIENGINEERINGFROMSCRATCH.COM 83

VISUAL AUTOREGRESSIVE MODELING (VAR): NEXT-SCALE PREDICTION
4. VAR vs DiT scaling. For the same ImageNet class-conditional task, train VAR and DiT
at matched param budgets (e.g., 33M, 130M, 458M). Plot FID vs compute. VAR should
pull ahead of DiT at each size — reproduce the paper’s result at small scale.
5. Text conditioning. Extend VAR to take a text embedding (CLIP pooled) as an extra
conditioning input via adaLN. This is the HART recipe. How much does FID improve on
text-aligned sampling?
Key Terms
Term What people say What it actually means
VAR “Visual AutoRegressive” Image generation by next-scale prediction
over a pyramid of VQ token grids
Next-scale “Predict coarser, then finer” The model predicts tokens at increasing
prediction resolution scales, conditioning on all
previous scales
Multi-scale “Residual VQ” VQ-VAE that produces K token grids of
VQ increasing resolution, with decoder
tokenizer summing all scales
Scale k “Pyramid level k” One of K resolution levels, from 1x1 at k=1
up to (H/p)x(W/p) at k=K
Parallel- “One forward per scale” All tokens at scale k are predicted in one
within-scale transformer pass, not autoregressively
Causal- “Scale-ordered attention” Token at scale k can attend to all of scales
across- 1..k but not scales k+1..K
scales
Residual “Additive tokenization” Each scale’s tokens encode the residual left
VQ by lower scales; decoder sums all scale
embeddings
VAR scaling “Image GPT scaling” FID follows a predictable power law in
law compute, like language models’ perplexity
HART “Hybrid VAR + text” Text-conditional VAR variant combining
MaskGIT-style iterative decoding with
VAR’s scale structure
Scale “(scale, row, col) triple” Positional encoding carries both the scale
position index and spatial coordinates within the
embedding scale
Further Reading
• Tian et al., 2024 — “Visual Autoregressive Modeling: Scalable Image Generation via
Next-Scale Prediction” — the VAR paper, canonical reference
• Peebles and Xie, 2022 — “Scalable Diffusion Models with Transformers” — DiT, the dif-
fusion comparison baseline
• Esser et al., 2021 — “Taming Transformers for High-Resolution Image Synthesis” — VQ-
GAN, the tokenizer family VAR’s multi-scale tokenizer extends
• van den Oord et al., 2017 — “Neural Discrete Representation Learning” — VQ-VAE, the
foundation of discrete image tokenization
• Tang et al., 2024 — “HART: Efficient Visual Generation with Hybrid Autoregressive
Transformer” — text-conditional VAR
AIENGINEERINGFROMSCRATCH.COM 84

VISUAL AUTOREGRESSIVE MODELING (VAR): NEXT-SCALE PREDICTION
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/08-generative-ai/19-visual-autoregressive-var
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/08-generative-ai/19-visual-autoregressive-var/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 85