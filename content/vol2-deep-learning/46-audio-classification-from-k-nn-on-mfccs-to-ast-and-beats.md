---
title: "Audio Classification — From k-NN on MFCCs to AST and BEATs"
volume: "vol2-deep-learning"
part: "Part III — Speech & Audio"
chapter_number: 46
source_pages: "358-362"
---

# Audio Classification — From k-NN on MFCCs to AST and BEATs

Audio Classification — From k-NN on
MFCCs to AST and BEATs
Everything from “dog barking vs siren” to “which language is this” is audio classifi-
cation. The features are mels. The architecture moves each decade. The evaluation
stays AUC, F1, and per-class recall.
Type: Build Languages: Python Prerequisites: Phase 6 · 02 (Spectrograms & Mel), Phase
3 · 06 (CNNs), Phase 5 · 08 (CNNs & RNNs for Text) Time: ~75 minutes
The Problem
You get a 10-second clip. You want to know: “what is it?” Urban sound (siren, drill, dog),
speech command (yes/no/stop), language ID (en/es/ar), speaker emotion (angry/neutral), or
environmental sound (indoor/outdoor, babble). All of these are audio classification, and in
2026 the baseline architecture is mature: log-mel → CNN or Transformer → softmax.
The core difficulty is not the network. It is data. Audio datasets have brutal class imbal-
ance, strong domain shift (clean vs noisy), and label noise (who decided “urban babble” vs
“restaurant noise”?). The 80% of the problem is curation, augmentation, and evaluation, not
swapping CNN for Transformer.
The Concept
k-NN on MFCCs (the 1990s baseline). Flatten MFCCs per clip, compute cosine similar-
ity to a labeled bank, return majority vote of the top K. Surprisingly strong on clean, small
datasets (Speech Commands, ESC-50). Runs with no GPU.
2D CNN on log-mels (2015-2019). Treat the (T, n_mels) log-mel as an image. Apply
ResNet-18 or VGG-style. Global mean pool the time axis. Softmax over classes. Still the
baseline in most 2026 kaggle competitions.
Audio Spectrogram Transformer, AST (2021-2024). Patchify the log-mel (e.g. 16×16
patches), add position embeddings, feed to a ViT. State of the art on AudioSet (mAP 0.485)
for supervised learning.
BEATs and WavLM-base (2024-2026). Self-supervised pretraining on millions of hours.
Fine-tune on your task with 1-10% of the supervised data you would have needed. In 2026
this is the default starting point for non-speech audio. BEATs-iter3 beats AST by 1-2 mAP on
AudioSet while using 1/4 the compute.
Whisper-encoder as a frozen backbone (2024). Take Whisper’s encoder, drop the decoder,
attach a linear classifier. Near-SOTA on language ID and simple event classification with zero
audio augmentation. The “free lunch” baseline.
AIENGINEERINGFROMSCRATCH.COM 354

AUDIO CLASSIFICATION — FROM K-NN ON MFCCS TO AST AND BEATS
three decades of audio classifiers, same log-mel input
input: 10-sec log-mel spectrogram — shape [T=998, n_mels=80]
same frontend, three generations of backends
1990s — k-NN on MFCCs 2015–2021 — 2D CNN 2024–2026 — BEATs / AST
MFCC-13 + mean/var pool log-mel as image patchify log-mel (16×16)
cosine → top-K vote Conv + Pool × 3, softmax SSL-pretrained transformer
zero training, no GPU 3M params, 10-min train fine-tune on 1-10% labels
strong on ESC-50 SpecAugment + mixup BEATs-iter3 leads AudioSet
fails on AudioSet still the baseline in KWS default for non-speech 2026
ESC-50 acc: ~65% ESC-50 acc: ~82% ESC-50 acc: 97.0%
your first baseline edge + speech commands AudioSet mAP: 0.548
the features stayed the same for 30 years; the backend is the lever
Figure 3: Audio classification ladder: k-NN on MFCCs to AST to BEATs
Class imbalance is the real challenge
ESC-50: 50 classes, 40 clips each — balanced, easy. UrbanSound8K: 10 classes, imbalanced
10:1. AudioSet: 632 classes with a 100,000:1 long tail. Techniques that work:
• Balanced sampling during training (not in evaluation).
• Mixup: linearly interpolate two clips (and their labels) as augmentation.
• SpecAugment: mask random time and frequency bands. Simple; critical.
Evaluation
• Multiclass exclusive (Speech Commands): top-1 accuracy, top-5 accuracy.
• Multiclass multi-label (AudioSet, UrbanSound-style): mean average precision (mAP).
• Heavily imbalanced: per-class recall + macro F1.
2026 numbers you should know:
Benchmark Baseline SOTA 2026 Source
ESC-50 82% (AST) 97.0% (BEATs-iter3) BEATs paper
(2024)
AudioSet mAP 0.485 (AST) 0.548 (BEATs-iter3) HEAR
leaderboard
2026
Speech Commands v2 98% (CNN) 99.0% (Audio-MAE) HEAR v2 results
Interactive figure: mfcc-pipeline. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/06-
speech-and-audio/03-audio-classification
AIENGINEERINGFROMSCRATCH.COM 355

AUDIO CLASSIFICATION — FROM K-NN ON MFCCS TO AST AND BEATS
Build It
Step 1: featurize
def featurize_mfcc(signal, sr, n_mfcc=13, n_mels=40, frame_len=400, hop=160):
mag = stft_magnitude(signal, frame_len, hop)
fb = mel_filterbank(n_mels, frame_len, sr)
mels = apply_filterbank(mag, fb)
log = log_transform(mels)
return [dct_ii(frame, n_mfcc) for frame in log]
Step 2: fixed-length summary
def summarize(mfcc_frames):
n = len(mfcc_frames[0])
mean = [sum(f[i] for f in mfcc_frames) / len(mfcc_frames) for i in range(n)]
var = [
sum((f[i] - mean[i]) ** 2 for f in mfcc_frames) / len(mfcc_frames) for i in range(n)
]
return mean + var
Simple but strong: mean + variance across time gives a 26-dim fixed embedding for a 13-coef
MFCC. Runs instantly. Beat state-of-the-art NN baselines on ESC-50 as recently as 2017.
Step 3: k-NN
def cosine(a, b):
dot = sum(x * y for x, y in zip(a, b))
na = math.sqrt(sum(x * x for x in a)) or 1e-12
nb = math.sqrt(sum(x * x for x in b)) or 1e-12
return dot / (na * nb)
def knn_classify(q, bank, labels, k=5):
sims = sorted(range(len(bank)), key=lambda i: -cosine(q, bank[i]))[:k]
votes = Counter(labels[i] for i in sims)
return votes.most_common(1)[0][0]
Step 4: upgrade to CNN on log-mels
In PyTorch:
import torch.nn as nn
class AudioCNN(nn.Module):
def __init__(self, n_mels=80, n_classes=50):
super().__init__()
self.body = nn.Sequential(
nn.Conv2d(1, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
nn.Conv2d(64, 128, 3, padding=1), nn.ReLU(),
nn.AdaptiveAvgPool2d(1),
)
self.head = nn.Linear(128, n_classes)
AIENGINEERINGFROMSCRATCH.COM 356

AUDIO CLASSIFICATION — FROM K-NN ON MFCCS TO AST AND BEATS
def forward(self, x): # x: (B, 1, T, n_mels)
return self.head(self.body(x).flatten(1))
3M parameters. Trains in ~10 min on ESC-50 with a single RTX 4090. 80%+ accuracy.
Step 5: the 2026 default — fine-tune BEATs
from transformers import ASTFeatureExtractor, ASTForAudioClassification
ext = ASTFeatureExtractor.from_pretrained("MIT/ast-finetuned-audioset-10-10-0.4593")
model = ASTForAudioClassification.from_pretrained(
"MIT/ast-finetuned-audioset-10-10-0.4593",
num_labels=50,
ignore_mismatched_sizes=True,
)
inputs = ext(audio, sampling_rate=16000, return_tensors="pt")
logits = model(**inputs).logits
For BEATs, use microsoft/BEATs-base via the beats library; the transformers API is the same
shape.
Use It
The 2026 stack:
Situation Start with
Tiny dataset (<1000 clips) k-NN on MFCC means (your baseline) +
audio augmentation
Medium dataset (1K–100K) BEATs or AST fine-tune
Large dataset (>100K) Train from scratch or fine-tune
Whisper-encoder
Real-time, edge 40-MFCC CNN, quantized to int8
(KWS-style)
Multi-label (AudioSet) BEATs-iter3 with BCE loss + mixup +
SpecAugment
Language ID MMS-LID, SpeechBrain VoxLingua107
baseline
Decision rule: start with a frozen backbone, not a fresh model. Fine-tuning a BEATs
head gets you 95% of SOTA in hours, not weeks.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/06-speech-and-audio/03-audio-classification
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/06-speech-and-audio/03-audio-classification/code
AIENGINEERINGFROMSCRATCH.COM 357

AUDIO CLASSIFICATION — FROM K-NN ON MFCCS TO AST AND BEATS
1. Easy. Run code/main.py. It trains the k-NN MFCC baseline on a 4-class synthetic dataset
(pure tones at different pitches). Report confusion matrix.
2. Medium. Replace summarize with [mean, var, skew, kurtosis]. Does 4-moment pooling
beat mean+var on the same synthetic dataset?
3. Hard. Using torchaudio, train a 2D CNN on ESC-50 fold 1. Report 5-fold cross-
validation accuracy. Add SpecAugment (time mask = 20, freq mask = 10) and report
the delta.
Key Terms
Term What people say What it actually means
AudioSet The ImageNet of audio Google’s 2M-clip, 632-class weakly-labeled
YouTube dataset.
ESC-50 Small classification benchmark 50 classes × 40 clips of environmental
sounds.
AST Audio Spectrogram ViT on log-mel patches; 2021 SOTA.
Transformer
BEATs Self-supervised audio Microsoft model, iter3 leads AudioSet as of
2026.
Mixup Pair augmentation x = λ·x1 + (1-λ)·x2; y = λ·y1 +
(1-λ)·y2.
SpecAugmentMask-based augmentation Zero-out random time and frequency bands
of the spectrogram.
mAP Main multi-label metric Mean average precision across classes and
thresholds.
Further Reading
• Gong, Chung, Glass (2021). AST: Audio Spectrogram Transformer — the architecture of
record from 2021–2024.
• Chen et al. (2022, rev. 2024). BEATs: Audio Pre-Training with Acoustic Tokenizers —
the 2024+ default.
• Park et al. (2019). SpecAugment — the dominant audio augmentation.
• Piczak (2015). ESC-50 dataset — 50-class benchmark that lives on.
• Gemmeke et al. (2017). AudioSet — 632-class YouTube taxonomy; still the gold standard.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/06-speech-and-audio/03-audio-classification
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/06-speech-and-audio/03-audio-classification/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 358