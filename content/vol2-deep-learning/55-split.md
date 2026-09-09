---
title: "Split"
volume: "vol2-deep-learning"
part: "Part III — Speech & Audio"
chapter_number: 55
source_pages: "411-416"
---

# Split

Neural Audio Codecs — EnCodec, SNAC,
Mimi, DAC and the Semantic-Acoustic
Split
2026 audio generation is almost all tokens. EnCodec, SNAC, Mimi, and DAC turn
continuous waveforms into discrete sequences that a transformer can predict. The
semantic-vs-acoustic token split — first-codebook as semantic, rest as acoustic — is
the most important architectural shift since the Transformer for audio.
Type: Learn Languages: Python Prerequisites: Phase 6 · 02 (Spectrograms), Phase 10 · 11
(Quantization), Phase 5 · 19 (Subword Tokenization) Time: ~60 minutes
The Problem
Language models work on discrete tokens. Audio is continuous. If you want an LLM-style
model for speech / music — MusicGen, Moshi, Sesame CSM, VibeVoice, Orpheus — you first
need a neural audio codec: a learned encoder that discretizes audio into a small vocabulary
of tokens, and a matching decoder that reconstructs the waveform.
Two families have emerged:
1. Reconstruction-first codecs — EnCodec, DAC. Optimize perceptual audio quality. To-
kens are “acoustic” — they capture everything including speaker identity, timbre, back-
ground noise.
2. Semantic-first codecs — Mimi (Kyutai), SpeechTokenizer. Force the first codebook
to encode linguistic / phonetic content (often by distilling from WavLM). Subsequent
codebooks are acoustic detail.
The 2024-2026 insight: a pure reconstruction codec gives you blurry speech when you
try to generate from text. The LLM over codec tokens has to learn both language struc-
ture AND acoustic structure in the same codebook, which doesn’t scale. Separating them
— semantic codebook 0, acoustic codebooks 1-N — is what makes Moshi and Sesame CSM
work.
The Concept
The core trick: Residual Vector Quantization (RVQ)
Rather than one big codebook (which would need millions of codes for good quality), all mod-
ern audio codecs use RVQ: a cascade of small codebooks. The first codebook quantizes the
encoder output; the second quantizes the residual; etc. Each codebook is 1024 codes. 8
codebooks = effective vocabulary of 1024^8 = 10^24.
At inference time, the decoder sums all chosen codes per frame to reconstruct.
AIENGINEERINGFROMSCRATCH.COM 407

NEURAL AUDIO CODECS — ENCODEC, SNAC, MIMI, DAC AND THE SEMANTIC-ACOUSTIC SPLIT
neural audio codecs — four variations on RVQ, one semantic/acoustic split
EnCodec (Meta, 2022) DAC (Descript, 2023) SNAC (Siuzdak 2024) Mimi (Kyutai 2024)
acoustic RVQ baseline reconstruction king multi-scale RVQ semantic + acoustic split
wav → conv+transformer+conv EnCodec + coarse codes @ 12 Hz codebook 0 — WavLM distilled
→ RVQ (4-32 codebooks) L2-norm codebooks medium @ 25 Hz (semantic)
→ decoder → wav periodic activations fine @ 50 Hz codebooks 1-7 — acoustic
75 Hz · 24 kHz · used by MusicGen improved losses hierarchical → AR-LM friendly 12.5 Hz · 4.4 kbps · powers Moshi
PESQ 3.2 @ 6 kbps 44.1 kHz full-band · PESQ 3.5 @ 6 kbps used by Orpheus-3B used by Sesame CSM
why this matters for language modeling over audio
10 s speech × 12.5 Hz × 8 codebooks = 1000 tokens → trivial transformer context
factorize: LM predicts semantic codebook 0 first (text-aligned), then acoustic codebooks 1-7
result: zero-shot voice cloning (semantic = content, acoustic conditioned on reference)
pick by the problem
music generation → EnCodec-24k · MusicGen, AudioLDM
highest fidelity → DAC-44.1k · audio restoration, editing
AR LM over speech → SNAC or Mimi · TTS, codec LM
full-duplex streaming → Mimi only · Moshi, Sesame CSM
Figure 13: Four codec landscape: EnCodec, DAC, SNAC (multi-scale), Mimi (seman-
tic+acoustic)
The four codecs that matter in 2026
EnCodec (Meta, 2022). The baseline. Encoder-decoder over waveform, RVQ bottleneck. 24
kHz, 32 codebooks possible, default 4 codebooks @ 1.5 kbps. Uses 1D conv + transformer
+ 1D conv architecture. Used by MusicGen.
DAC (Descript, 2023). RVQ with L2-normalized codebooks, periodic activation functions,
improved losses. Highest reconstruction fidelity of any open codec — sometimes indistin-
guishable from original speech with 12 codebooks. 44.1 kHz full-band.
SNAC (Hubert Siuzdak, 2024). Multi-scale RVQ — the coarse codebooks operate at a lower
frame rate than fine ones. Effectively models audio hierarchically: a coarse “sketch” at ~12
Hz plus detail at 50 Hz. Used by Orpheus-3B because the hierarchical structure maps well
onto LM-based generation.
Mimi (Kyutai, 2024). The 2026 game-changer. 12.5 Hz frame rate (extremely low), 8 code-
books @ 4.4 kbps. Codebook 0 is distilled from WavLM — trained to predict WavLM’s
speech-content features. Codebooks 1-7 are acoustic residuals. This split powers Moshi (Les-
son 15) and Sesame CSM.
Frame rates matter for language modeling
Lower frame rate = shorter sequence = faster LM.
Codec Frame rate 1 s = N frames Good for
EnCodec-24k 75 Hz 75 music, general
audio
DAC-44.1k 86 Hz 86 high-fidelity
music
AIENGINEERINGFROMSCRATCH.COM 408

NEURAL AUDIO CODECS — ENCODEC, SNAC, MIMI, DAC AND THE SEMANTIC-ACOUSTIC SPLIT
Codec Frame rate 1 s = N frames Good for
SNAC-24k ~12 Hz 12 AR-LM efficient
(coarse)
Mimi 12.5 Hz 12.5 streaming speech
At 12.5 Hz, a 10-second utterance is only 125 codec frames — a transformer can easily predict
them.
Semantic vs acoustic tokens
frame_t → [semantic_token_t, acoustic_token_0_t, acoustic_token_1_t, ..., acoustic_token_6_t]
• Semantic token (codebook 0 in Mimi). Encodes what was said — phonemes, words,
content. Distilled from WavLM via an auxiliary prediction loss.
• Acoustic tokens (codebooks 1-7). Encode timbre, speaker identity, prosody, back-
ground noise, fine detail.
An AR LM predicts the semantic token first (conditioned on text), then predicts acoustic to-
kens (conditioned on semantic + speaker reference). This factorization is why modern TTS
can zero-shot-clone voices: the semantic model handles content; the acoustic model handles
timbre.
2026 reconstruction quality (bits per sec, lower bitrate is better)
Codec Bitrate PESQ ViSQOL
Opus-20kbps 20 kbps 4.0 4.3
EnCodec-6kbps 6 kbps 3.2 3.8
DAC-6kbps 6 kbps 3.5 4.0
SNAC-3kbps 3 kbps 3.3 3.8
Mimi-4.4kbps 4.4 kbps 3.1 3.7
Traditional codecs like Opus still win per bit on perceptual quality. Neural codecs win on
discrete tokens (which Opus does not produce) and generative-model quality (what the
LM can do with those tokens).
Interactive figure: rvq-codec-cascade. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/06-speech-and-audio/13-neural-audio-codecs
Build It
Step 1: encode with EnCodec
from encodec import EncodecModel
import torch
model = EncodecModel.encodec_model_24khz()
model.set_target_bandwidth(6.0) # kbps
wav = torch.randn(1, 1, 24000)
AIENGINEERINGFROMSCRATCH.COM 409

NEURAL AUDIO CODECS — ENCODEC, SNAC, MIMI, DAC AND THE SEMANTIC-ACOUSTIC SPLIT
with torch.no_grad():
encoded = model.encode(wav)
codes, scale = encoded[0]
# codes: (1, n_codebooks, n_frames), dtype=int64
n_codebooks=8 at 6 kbps. Each code is 0-1023 (10-bit).
Step 2: decode and measure reconstruction
with torch.no_grad():
wav_recon = model.decode([(codes, scale)])
from torchaudio.functional import compute_deltas
import torch.nn.functional as F
mse = F.mse_loss(wav_recon[:, :, :wav.shape[-1]], wav).item()
Step 3: the semantic-acoustic split (Mimi-style)
from moshi.models import loaders
mimi = loaders.get_mimi()
with torch.no_grad():
codes = mimi.encode(wav) # shape (1, 8, frames@12.5Hz)
semantic = codes[:, 0]
acoustic = codes[:, 1:]
Semantic codebook 0 is WavLM-aligned. You can train a text-to-semantic transformer — much
smaller vocabulary than going direct-to-audio. Then a separate acoustic-to-waveform decoder
conditions on a speaker reference.
Step 4: why AR LM over codec tokens works
For a 10 s speech clip at Mimi’s 12.5 Hz × 8 codebooks:
N_tokens = 10 * 12.5 * 8 = 1000 tokens
1000 tokens is a trivial context for a transformer. A 256M-parameter transformer can gener-
ate 10 seconds of speech in milliseconds on a modern GPU.
Use It
Map problem → codec:
Task Codec
General music generation EnCodec-24k
Highest-fidelity reconstruction DAC-44.1k
AR LM over speech (TTS) SNAC or Mimi
Streaming full-duplex speech Mimi (12.5 Hz)
Sound-effect library with text EnCodec + T5 condition
Fine-grained audio editing DAC + inpainting
AIENGINEERINGFROMSCRATCH.COM 410

NEURAL AUDIO CODECS — ENCODEC, SNAC, MIMI, DAC AND THE SEMANTIC-ACOUSTIC SPLIT
Rule of thumb: if you’re building a generative model, start with Mimi or SNAC. If
you’re building a compression pipeline, use Opus.
Pitfalls
• Too many codebooks. Adding codebooks increases fidelity linearly but LM sequence
length linearly too. Stop at 8-12.
• Frame-rate mismatch. Training LM on 12.5 Hz Mimi then fine-tuning on 50 Hz En-
Codec fails silently.
• Assuming all codebooks equal. In Mimi, codebook 0 carries content; losing it destroys
intelligibility. Losing codebook 7 is barely noticeable.
• Using reconstruction quality as the only metric. A codec can have great reconstruc-
tion but be useless for LM-based generation if the semantic structure is bad.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/06-speech-and-audio/13-neural-audio-codecs
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/06-speech-and-audio/13-neural-audio-codecs/code
1. Easy. Run code/main.py. It implements a toy scalar + residual quantizer and measures
reconstruction error as you add codebooks.
2. Medium. Install encodec and compare 1, 4, 8, 32 codebooks on a held-out speech clip.
Plot PESQ or MSE vs bitrate.
3. Hard. Load Mimi. Encode a clip. Replace codebook 0 with random integers; decode.
Then replace codebook 7 similarly. Compare the two corruptions — codebook 0 corrup-
tion should destroy intelligibility; codebook 7 corruption should barely change anything.
Key Terms
Term What people say What it actually means
RVQ Residual quantization Cascade of small codebooks; each
quantizes the previous residual.
Frame rate Codec speed How many token-frames per second. Lower
= faster LM.
Semantic Codebook 0 (Mimi) Codebook distilled from SSL features;
codebook encodes content.
Acoustic Everything else Timbre, prosody, noise, fine detail.
codebooks
PESQ / Perceptual quality Objective metrics correlating with MOS.
ViSQOL
EnCodec Meta codec The RVQ baseline; used by MusicGen.
Mimi Kyutai codec 12.5 Hz frame rate; semantic-acoustic split;
powers Moshi.
AIENGINEERINGFROMSCRATCH.COM 411

NEURAL AUDIO CODECS — ENCODEC, SNAC, MIMI, DAC AND THE SEMANTIC-ACOUSTIC SPLIT
Further Reading
• Défossez et al. (2023). EnCodec — the RVQ baseline.
• Kumar et al. (2023). Descript Audio Codec (DAC) — highest-fidelity open.
• Siuzdak (2024). SNAC — multi-scale RVQ.
• Kyutai (2024). Mimi codec — semantic-acoustic split, WavLM distillation.
• Borsos et al. (2023). AudioLM — the two-stage semantic/acoustic paradigm.
• Zeghidour et al. (2021). SoundStream — the original streamable RVQ codec.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/06-speech-and-audio/13-neural-audio-codecs
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/06-speech-and-audio/13-neural-audio-codecs/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 412