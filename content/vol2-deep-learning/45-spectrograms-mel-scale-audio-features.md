---
title: "Spectrograms, Mel Scale & Audio Features"
volume: "vol2-deep-learning"
part: "Part III — Speech & Audio"
chapter_number: 45
source_pages: "353-357"
---

# Spectrograms, Mel Scale & Audio Features

Spectrograms, Mel Scale & Audio Fea-
tures
Neural nets do not consume raw waveforms well. They consume spectrograms.
They consume mel spectrograms even better. Every ASR, TTS, and audio classifier
in 2026 lives or dies by this single preprocessing choice.
Type: Build Languages: Python Prerequisites: Phase 6 · 01 (Audio Fundamentals) Time:
~45 minutes
The Problem
Take a 10-second 16 kHz clip. That is 160,000 floats, all in [-1, 1], almost perfectly uncorre-
lated with the label “dog barking” or “the word cat”. The raw waveform has the information
but in a form the model cannot easily extract. Two identical phonemes spoken 100 ms apart
have completely different raw samples.
A spectrogram fixes this. It collapses the temporal detail where human perception ignores it
(microsecond jitter) and preserves the structure where perception attends (which frequencies
are energetic, over time windows of ~10–25 ms).
Mel spectrograms push further. Humans perceive pitch logarithmically: 100 Hz vs 200 Hz
sounds “the same distance apart” as 1000 Hz vs 2000 Hz. The mel scale warps the frequency
axis to match. A mel-scaled spectrogram is the single most important feature in speech ML
from 2010 through 2026.
The Concept
STFT (Short-Time Fourier Transform). Slice the waveform into overlapping frames (typi-
cal: 25 ms window, 10 ms hop = 400 samples / 160 samples at 16 kHz). Multiply each frame
by a window function (Hann is the default; Hamming slightly different tradeoff). FFT each
frame. Stack the magnitude spectra into a matrix of shape (n_frames, n_freq_bins). That
is your spectrogram.
Log-magnitude. Raw magnitudes span 5-6 orders of magnitude. Take log(|X| + 1e-6) or
20 * log10(|X|) to compress dynamic range. Every production pipeline uses log-magnitude,
not raw magnitude.
Mel scale. Frequency f in Hz maps to mel m by m = 2595 * log10(1 + f / 700). The mapping
is roughly linear below 1 kHz and roughly logarithmic above. 80 mel bins covering 0–8 kHz
is the standard ASR input.
Mel filterbank. A set of triangular filters spaced equally on the mel scale. Each filter is a
weighted sum of adjacent FFT bins. Multiplying the STFT magnitude by the filterbank matrix
gives the mel spectrogram in one matmul.
Log-mel spectrogram. log(mel_spec + 1e-10). Whisper’s input. Parakeet’s input. Seam-
lessM4T’s input. The universal 2026 audio frontend.
AIENGINEERINGFROMSCRATCH.COM 349

SPECTROGRAMS, MEL SCALE & AUDIO FEATURES
the four-step ladder every audio model climbs
1. waveform 2. STFT 3. log-mel 4. model input
Whisper: log-mel
frame+FFT filterbank DCT (opt)
Parakeet: log-mel
ECAPA: log-mel
KWS tiny: MFCC-13
T samples in [-1, 1]
10 s at 16 kHz = 160,000 |FFT| per 25 ms frame, 10 ms hop 80 mels, log scale, [T, 80] tensor: [batch, T, 80]
mel scale is log-perception of pitch triangular mel filterbank
mel
m = 2595 · log10(1 + f / 700) each mel bin = weighted sum of FFT bins
0 1 kHz 4 kHz 8 kHz Hz Hz (linear) — triangles widen with frequency
Figure 2: Waveform to STFT to mel spectrogram to MFCC ladder
MFCCs. Take the log-mel spectrogram, apply a DCT (type II), keep the first 13 coefficients.
Decorrelates the features and compresses further. Dominant feature until about 2015 when
CNNs/Transformers on raw log-mels caught up. Still used in speaker recognition (x-vectors,
ECAPA).
Resolution trade. Larger FFT = better frequency resolution but worse time resolution. 25
ms / 10 ms is the audio-ML default; 50 ms / 12.5 ms for music; 5 ms / 2 ms for transient
detection (drum hits, plosives).
Interactive figure: spectrogram-window. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/06-speech-and-audio/02-spectrograms-mel-features
Build It
Step 1: frame the waveform
def frame(signal, frame_len, hop):
n = 1 + (len(signal) - frame_len) // hop
return [signal[i * hop : i * hop + frame_len] for i in range(n)]
A 10-second 16 kHz clip with frame_len=400, hop=160 yields 998 frames.
Step 2: Hann window
import math
def hann(N):
return [0.5 * (1 - math.cos(2 * math.pi * n / (N - 1))) for n in range(N)]
AIENGINEERINGFROMSCRATCH.COM 350

SPECTROGRAMS, MEL SCALE & AUDIO FEATURES
Multiply element-wise before the FFT. Removes spectral leakage caused by truncating at non-
zero endpoints.
Step 3: STFT magnitude
def stft_magnitude(signal, frame_len=400, hop=160):
win = hann(frame_len)
frames = frame(signal, frame_len, hop)
return [magnitudes(dft([w * s for w, s in zip(win, f)])) for f in frames]
Production uses torch.stft or librosa.stft (FFT-backed, vectorized). The loop here is ped-
agogical; it runs on short clips in code/main.py.
Step 4: mel filterbank
def hz_to_mel(f):
return 2595.0 * math.log10(1.0 + f / 700.0)
def mel_to_hz(m):
return 700.0 * (10 ** (m / 2595.0) - 1)
def mel_filterbank(n_mels, n_fft, sr, fmin=0, fmax=None):
fmax = fmax or sr / 2
mels = [hz_to_mel(fmin) + (hz_to_mel(fmax) - hz_to_mel(fmin)) * i / (n_mels + 1)
for i in range(n_mels + 2)]
hzs = [mel_to_hz(m) for m in mels]
bins = [int(h * n_fft / sr) for h in hzs]
fb = [[0.0] * (n_fft // 2 + 1) for _ in range(n_mels)]
for m in range(n_mels):
for k in range(bins[m], bins[m + 1]):
fb[m][k] = (k - bins[m]) / max(1, bins[m + 1] - bins[m])
for k in range(bins[m + 1], bins[m + 2]):
fb[m][k] = (bins[m + 2] - k) / max(1, bins[m + 2] - bins[m + 1])
return fb
80 mels covering 0–8 kHz with n_fft=400 gives an (80, 201) matrix. Multiply the (n_frames,
201) STFT magnitude by the transpose to get (n_frames, 80) mel spectrogram.
Step 5: log-mel
def log_mel(mel_spec, eps=1e-10):
return [[math.log(max(v, eps)) for v in frame] for frame in mel_spec]
Common alternatives: librosa.power_to_db (reference-normalized dB), 10 * log10(power +
eps). Whisper uses a more involved clip + normalize routine (see Whisper’s log_mel_spectrogram).
Step 6: MFCCs
def dct_ii(x, n_coeffs):
N = len(x)
return [
sum(x[n] * math.cos(math.pi * k * (2 * n + 1) / (2 * N)) for n in range(N))
for k in range(n_coeffs)
]
AIENGINEERINGFROMSCRATCH.COM 351

SPECTROGRAMS, MEL SCALE & AUDIO FEATURES
Apply DCT to each log-mel frame, keep the first 13 coefficients. That is your MFCC matrix.
The first coefficient is usually dropped (it encodes overall energy).
Use It
The 2026 stack:
Task Features
ASR (Whisper, Parakeet, 80 log-mels, 10 ms hop, 25 ms window
SeamlessM4T)
TTS acoustic model (VITS, 80 mels, 5–12 ms hop for fine temporal control
F5-TTS, Kokoro)
Audio classification (AST, PANNs, 128 log-mels, 10 ms hop
BEATs)
Speaker embedding 80 log-mels or raw-waveform SSL
(ECAPA-TDNN, WavLM)
Music (MusicGen, Stable Audio EnCodec discrete tokens (not mels)
2)
Keyword spotting 40 MFCCs for tiny devices
Rule of thumb: if you are not working on music, start with 80 log-mels. The burden of
proof is on any deviation.
Pitfalls that still ship in 2026
• Mel count mismatch. Training with 80 mels, inference with 128 mels. Silent failure.
Log the feature shape at both ends.
• Sample-rate mismatch upstream. Mels computed at 22.05 kHz look different from
16 kHz. Fix SR before featurization.
• dB vs log. Whisper expects log-mel, not dB-mel. Some HF pipelines autodetect; your
custom code will not.
• Normalization drift. Per-utterance normalization during training, global normalization
during inference. Production bug that doubles WER.
• Leakage from padding. Zero-padding the end of a clip produces a flat spectrum in the
trailing frames. Pad symmetrically or replicate.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/06-speech-and-audio/02-spectrograms-mel-
features
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/06-speech-and-audio/02-spectrograms-mel-
features/code
1. Easy. Run code/main.py. It synthesizes a chirp (frequency swept 200 → 4000 Hz) and
prints the argmax mel bin per frame. Plot (optional) and confirm it matches the sweep.
AIENGINEERINGFROMSCRATCH.COM 352

SPECTROGRAMS, MEL SCALE & AUDIO FEATURES
2. Medium. Re-run with n_mels in {40, 80, 128} and frame_len in {200, 400, 800}.
Measure sharp-peak bandwidth across the time axis. Which combo resolves the chirp
the best?
3. Hard. Implement power_to_db and compare ASR accuracy of a tiny CNN classifier on
AudioMNIST using (a) raw log-mel, (b) dB-mel with ref=max, (c) MFCC-13 + delta +
delta-delta. Report top-1 accuracy.
Key Terms
Term What people say What it actually means
Frame A slice 25 ms chunk of waveform fed to one FFT.
Hop Stride Samples between consecutive frames; 10
ms is ASR default.
Window Hann/Hamming thing Point-wise multiplier that tapers the frame
edges to zero.
STFT Spectrogram generator Framed + windowed FFT; yields time ×
frequency matrix.
Mel Warped frequency Log-perception scale; m = 2595·log10(1 +
f/700).
Filterbank The matrix Triangular filters that project STFT onto
mel bins.
Log-mel Whisper’s input log(mel_spec + eps); standardized in
2026.
MFCC Old-school feature DCT of log-mel; 13 coeffs, decorrelated.
Further Reading
• Davis, Mermelstein (1980). Comparison of parametric representations for monosyllabic
word recognition — the MFCC paper.
• Stevens, Volkmann, Newman (1937). A Scale for the Measurement of the Psychological
Magnitude Pitch — the original mel scale.
• OpenAI — Whisper source, log_mel_spectrogram — read the reference implementation.
• librosa feature extraction docs — reference for mfcc, melspectrogram, and hop/window.
• NVIDIA NeMo — audio preprocessing — production-scale pipeline for Parakeet + Canary
models.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/06-speech-and-audio/02-spectrograms-mel-features
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/06-speech-and-audio/02-spectrograms-mel-features/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 353