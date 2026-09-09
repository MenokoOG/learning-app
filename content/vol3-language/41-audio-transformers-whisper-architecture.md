---
title: "Audio Transformers — Whisper Architecture"
volume: "vol3-language"
part: "Part II — Transformers Deep Dive"
chapter_number: 41
source_pages: "228-233"
---

# Audio Transformers — Whisper Architecture

Audio Transformers — Whisper Architec-
ture
Audio is an image of frequency over time. Whisper is a ViT that eats mel spectro-
grams and speaks back.
Type: Learn Languages: Python Prerequisites: Phase 7 · 05 (Full Transformer), Phase 7 ·
08 (Encoder-Decoder), Phase 7 · 09 (ViT) Time: ~45 minutes
The Problem
Before Whisper (OpenAI, Radford et al. 2022), state-of-the-art automatic speech recognition
(ASR) meant wav2vec 2.0 and HuBERT — self-supervised feature extractors plus a fine-tuned
head. High quality, expensive data pipelines, domain-brittle. Multilingual speech recognition
needed separate models per language family.
Whisper made three bets:
1. Train on everything. 680,000 hours of weakly-labeled audio scraped from the internet
across 97 languages. No clean academic corpus. No phoneme labels.
2. Multi-task single model. One decoder trained jointly on transcription, translation,
voice activity detection, language ID, and timestamping via task tokens.
3. Standard encoder-decoder transformer. Encoder consumes log-mel spectrograms.
Decoder produces text tokens autoregressively. No vocoder, no CTC, no HMM.
The result: Whisper large-v3 is robust across accents, noise, and languages that have zero
clean labeled data. It is the default speech front-end for every open-source voice assistant
and most commercial ones in 2026.
The Concept
Step 1 — resample + window
Audio at 16 kHz. Clip/pad to 30 seconds. Compute log-mel spectrogram: 80 mel bins, 10 ms
stride → ~3,000 frames × 80 features. This is the “input image” that Whisper sees.
Step 2 — convolutional stem
Two Conv1D layers with kernel 3 and stride 2 reduce the 3,000 frames to 1,500. Halves
sequence length without adding a lot of parameters.
Step 3 — encoder
A 24-layer (for large) transformer encoder over 1,500 timesteps. Sinusoidal positional encod-
ing, self-attention, GELU FFN. Produces 1,500 × 1,280 hidden states.
AIENGINEERINGFROMSCRATCH.COM 225

AUDIO TRANSFORMERS — WHISPER ARCHITECTURE
whisper — encoder-decoder for speech recognition
conv1d × 2
stride 2 → 1500
audio @ 16 kHz, 30 s window log-mel: 80 bins × 3000 frames
encoder transformer (24 layers for large)
self-attention + GELU FFN + sinusoidal positional encoding
output: 1500 × 1280 hidden states
cross-attn
<|startoftranscript|> <|en|> <|transcribe|> decoder transformer
task tokens — 4-token prefix controls behavior masked self-attn + cross-attn to encoder + FFN
32 layers (large) or 4 layers (turbo)
BPE vocabulary: GPT-2 + audio specials
beam search width 5 at inference
"attention is all you need"
encoder runs once. decoder runs autoregressively. task token decides transcribe vs translate.
Figure 29: Whisper pipeline: audio → mel → encoder → decoder → text
Step 4 — decoder
A 24-layer transformer decoder. It autoregressively produces tokens from a BPE vocabulary
that is a superset of GPT-2’s with a few audio-specific special tokens.
Step 5 — task tokens
The decoder prompt starts with control tokens that tell the model what to do:
<|startoftranscript|> <|en|> <|transcribe|> <|0.00|>
or
<|startoftranscript|> <|fr|> <|translate|> <|0.00|>
The model was trained on this convention. You control task by prefix. The 2026 equivalent of
instruction-tuning, but applied to speech.
Step 6 — output
Beam search (width 5) with a log-prob threshold. Timestamps are predicted every 0.02 sec-
onds of audio when the <|notimestamps|> token is absent.
Whisper sizes
Model Params Layers d_model Heads VRAM (fp16)
Tiny 39M 4 384 6 ~1 GB
Base 74M 6 512 8 ~1 GB
AIENGINEERINGFROMSCRATCH.COM 226

AUDIO TRANSFORMERS — WHISPER ARCHITECTURE
Model Params Layers d_model Heads VRAM (fp16)
Small 244M 12 768 12 ~2 GB
Medium 769M 24 1024 16 ~5 GB
Large 1550M 32 1280 20 ~10 GB
Large-v3 1550M 32 1280 20 ~10 GB
Large-v3- 809M 32 1280 20 ~6 GB (4-layer
turbo decoder)
Large-v3-turbo (2024) cut the decoder from 32 layers to 4. 8× faster decoding with <1 WER
point regression. That decode speed unlock is why Whisper-turbo is the default for real-time
voice agents in 2026.
What Whisper does not do
• No diarization (who is speaking). Pair with pyannote for that.
• No real-time streaming natively — the 30-second window is fixed. Modern wrappers
(faster-whisper, WhisperX) bolt on streaming via VAD + overlap.
• No long-form context beyond 30 s without external chunking. Works well in practice
because human speech rarely needs long-range context for transcription.
2026 landscape
Task Model Notes
English ASR Whisper-turbo, Moonshine Moonshine is 4× faster on
edge
Multilingual ASR Whisper-large-v3 97 languages
Streaming ASR faster-whisper + VAD 150 ms latency targets
achievable
TTS Piper, XTTS-v2, Kokoro Encoder-decoder pattern, but
Whisper-shaped
Audio + language AudioLM, SeamlessM4T Text tokens + audio tokens in
one transformer
Interactive figure: n5-mel-decode. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/07-
transformers-deep-dive/10-audio-transformers-whisper
Build It
See code/main.py. We don’t train Whisper — we build the log-mel spectrogram pipeline +
task-token prompt formatter. Those are the parts you actually touch in production.
Step 1: synthesize audio
Generate a 1-second sine wave at 440 Hz sampled at 16 kHz. 16,000 samples.
AIENGINEERINGFROMSCRATCH.COM 227

AUDIO TRANSFORMERS — WHISPER ARCHITECTURE
Step 2: log-mel spectrogram (simplified)
Full mel spectrogram needs FFT. We do a simplified framing + per-frame energy version that
shows the pipeline without requiring librosa:
def frame_signal(x, frame_size=400, hop=160):
frames = []
for start in range(0, len(x) - frame_size + 1, hop):
frames.append(x[start:start + frame_size])
return frames
Frame = 25 ms, hop = 10 ms. Matches Whisper’s windowing. Per-frame energy stands in for
mel bins for pedagogy.
Step 3: pad to 30 s
Whisper always processes 30-second chunks. Pad (or clip) the spectrogram to 3,000 frames.
Step 4: build the prompt tokens
def whisper_prompt(lang="en", task="transcribe", timestamps=True):
tokens = ["<|startoftranscript|>", f"<|{lang}|>", f"<|{task}|>"]
if not timestamps:
tokens.append("<|notimestamps|>")
return tokens
That is the whole task-control surface. A 4-token prefix.
Use It
import whisper
model = whisper.load_model("large-v3-turbo")
result = model.transcribe("meeting.wav", language="en", task="transcribe")
print(result["text"])
print(result["segments"][0]["start"], result["segments"][0]["end"])
Faster, OpenAI-compatible:
from faster_whisper import WhisperModel
model = WhisperModel("large-v3-turbo", compute_type="int8_float16")
segments, info = model.transcribe("meeting.wav", vad_filter=True)
for s in segments:
print(f"{s.start:.2f} - {s.end:.2f}: {s.text}")
When to pick Whisper in 2026:
• Multilingual ASR with one model.
• Robust transcription of noisy, diverse audio.
• Research / prototype ASR — fastest starting point.
When to pick something else:
• Ultra-low latency streaming on edge — Moonshine beats Whisper at matched quality.
• Real-time conversational AI needing <200 ms — dedicated streaming ASR.
• Speaker diarization — Whisper does not do this; bolt on pyannote.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohit
AIENGINEERINGFROMSCRATCH.COM 228

AUDIO TRANSFORMERS — WHISPER ARCHITECTURE
g00/ai-engineering-from-scratch/tree/main/phases/07-transformers-deep-dive/10-audio-
transformers-whisper
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/07-transformers-deep-dive/10-audio-transformers-
whisper/code
1. Easy. Run code/main.py. Confirm the frame count for a 1-second signal at 16 kHz with
10 ms hop is ~100 frames. For 30 seconds: ~3,000 frames.
2. Medium. Build the full log-mel spectrogram using numpy.fft. Verify 80 mel bins match
librosa.feature.melspectrogram(n_mels=80) within numerical error.
3. Hard. Implement streaming inference: chunk audio into 10 s windows with 2 s overlap,
run Whisper on each chunk, merge transcripts. Measure word-error rate vs single-pass
on a 5-minute podcast sample.
Key Terms
Term What people say What it actually means
Mel spec- “Audio image” 2D representation: frequency bins on one
trogram axis, time frames on the other; log-scaled
energy per cell.
Log-mel “What Whisper sees” Mel spectrogram passed through log;
approximates human perception of
loudness.
Frame “One time slice” A 25 ms window of samples; overlapping at
10 ms stride.
Task token “Prompt prefix for speech” Special tokens like <\|transcribe\|> /
<\|translate\|> in the decoder prompt.
Voice “Find the speech” Gate that removes silence before ASR; cuts
activity cost massively.
detection
(VAD)
CTC “Connectionist Temporal Classic ASR loss for alignment-free
Classification” training; Whisper does NOT use it.
Whisper- “Small decoder, full encoder” large-v3 encoder + 4-layer decoder; 8×
turbo faster decoding.
Faster- “The production wrapper” CTranslate2 reimplementation; int8
whisper quantization; 4× faster than OpenAI’s
reference.
Further Reading
• Radford et al. (2022). Robust Speech Recognition via Large-Scale Weak Supervision —
Whisper paper.
• OpenAI Whisper repo — reference code + model weights. Read whisper/model.py to see
the Conv1D stem + encoder + decoder top-to-bottom in ~400 lines.
AIENGINEERINGFROMSCRATCH.COM 229

AUDIO TRANSFORMERS — WHISPER ARCHITECTURE
• OpenAI Whisper — whisper/decoding.py — the beam-search + task-token logic
described in Steps 5–6 is here; 500 lines, fully readable.
• Baevski et al. (2020). wav2vec 2.0: A Framework for Self-Supervised Learning of Speech
Representations — precursor; still SOTA features in some settings.
• SYSTRAN/faster-whisper — production wrapper, 4× faster than reference.
• Jia et al. (2024). Moonshine: Speech Recognition for Live Transcription and Voice Com-
mands — 2024 edge-friendly ASR, Whisper-shaped but smaller.
• HuggingFace blog — “Fine-Tune Whisper For Multilingual ASR with (cid:0) Transform-
ers” — canonical fine-tuning recipe including mel spectrogram preprocessor and
token-timestamp handling.
• HuggingFace modeling_whisper.py — full implementation (encoder, decoder, cross-
attention, generation) that mirrors the lesson’s architecture diagram.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/07-transformers-deep-dive/10-audio-transformers-whisper
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/07-transformers-deep-dive/10-audio-transformers-whisper/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 230