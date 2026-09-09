---
title: "Speech Recognition (ASR) — CTC, RNN-T, Attention"
volume: "vol2-deep-learning"
part: "Part III — Speech & Audio"
chapter_number: 47
source_pages: "363-368"
---

# Speech Recognition (ASR) — CTC, RNN-T, Attention

Speech Recognition (ASR) — CTC, RNN-
T, Attention
Speech recognition is audio classification at every timestep, glued together by a
sequence model that knows English and silence. CTC, RNN-T, and attention are the
three ways to do it. Pick one and understand why.
Type: Build Languages: Python Prerequisites: Phase 6 · 02 (Spectrograms & Mel), Phase
5 · 08 (CNNs & RNNs for Text), Phase 5 · 10 (Attention) Time: ~45 minutes
The Problem
You have a 10-second 16 kHz clip. You want a string: “turn on the kitchen lights”. The
challenge is structural: audio frames do not align one-to-one with characters. The word
“okay” might take 200 ms or 1200 ms. Silence punctuates the utterance. Some phonemes
are longer than others. The number of output tokens is not known in advance.
Three formulations solve this:
1. CTC (Connectionist Temporal Classification). Emit per-frame token probabilities in-
cluding a special blank. Collapse repeats and blanks at decode time. Non-autoregressive,
fast. Used by wav2vec 2.0, MMS.
2. RNN-T (Recurrent Neural Network Transducer). Joint network predicts next token
given encoder frame and previous tokens. Streamable. Used by Google’s on-device ASR,
NVIDIA Parakeet.
3. Attention encoder-decoder. Encoder compresses audio to hidden states, decoder
cross-attends to generate tokens autoregressively. Used by Whisper, SeamlessM4T.
In 2026, SOTA WER on LibriSpeech test-clean is 1.4% (Parakeet-TDT-1.1B, NVIDIA) and
1.58% (Whisper-Large-v3-turbo). The differences are tiny; the deployment differences are
huge.
The Concept
CTC intuition. Let the encoder output T frame-level distributions over V+1 tokens (V chars
+ blank). For a target string y of length U < T, any frame alignment that collapses to y counts.
CTC loss sums over all such alignments. Inference: per-frame argmax, collapse repeats,
remove blanks.
Advantages: non-autoregressive, streamable, zero lookahead. Drawback: conditional inde-
pendence assumption — each frame prediction is independent of the others, so there is no
internal language model. Fix with an external LM via beam search or shallow fusion.
RNN-T intuition. Adds a predictor network that embeds the token history and a joiner that
combines predictor state with encoder frame into a joint distribution over V+1 (the +1 is a null
/ no-emit). Explicitly models the conditional dependence CTC ignored. Streamable because
each step conditions only on past frames and past tokens.
AIENGINEERINGFROMSCRATCH.COM 359

SPEECH RECOGNITION (ASR) — CTC, RNN-T, ATTENTION
three ways to map T audio frames to U tokens
CTC — frame-level + blank RNN-T — encoder + predictor attention — seq2seq
log-mel → encoder audio encoder (frames) audio encoder (6-32L)
per-frame distribution predictor: prev tokens → decoder cross-attends
state
argmax per frame: autoregressive tokens:
a a _ _ a b b _ c BOS → hello → world → EOS
joiner → P(next | frame, history)
collapse + unblank → "aabc" emit token or skip frame timestamps from attention
non-AR, streamable streamable, internal LM highest offline quality
no internal LM complex 3D loss lattice non-streamable by default
wav2vec 2.0, MMS Parakeet, Riva, Google on-device Whisper v3, SeamlessM4T
LibriSpeech-clean: ~1.9 WER LibriSpeech-clean: 1.40 WER (SOTA 2026) LibriSpeech-clean: 1.58 WER
Figure 4: Three ASR formulations: CTC, RNN-T, attention-encoder-decoder
Advantages: streamable + internal LM. Drawback: training is more complex and memory-
hungry (3D loss lattice); RNN-T loss kernels are a whole library category on their own.
Attention encoder-decoder. Encoder (6-32 transformer layers) over log-mel frames.
Decoder (6-32 transformer layers) cross-attends to encoder outputs to generate tokens
autoregressively. No alignment constraint — attention can look anywhere in the audio.
Non-streamable unless you restrict attention (chunked Whisper-Streaming, 2024).
Advantages: highest quality on offline ASR, easy to train with standard seq2seq tooling. Draw-
back: autoregressive latency is proportional to output length; cannot stream without engi-
neering.
WER: the one number
Word Error Rate = (S + D + I) / N, where S=substitutions, D=deletions, I=insertions,
N=reference word count. Matches Levenshtein edit distance at the word level. Lower is
better. A WER above 20% is generally unusable; below 5% is human-parity for read speech.
2026 numbers on standard benchmarks:
Model LibriSpeech test-clean LibriSpeech test-other Size
Parakeet- 1.40% 2.78% 1.1B
TDT-1.1B params
Whisper- 1.58% 3.03% 809M
Large-v3-
turbo
Canary- 1.48% 2.87% 1B
1B Flash
Seamless 1.7% 3.5% 2.3B
M4T v2
AIENGINEERINGFROMSCRATCH.COM 360

SPEECH RECOGNITION (ASR) — CTC, RNN-T, ATTENTION
All these are encoder-decoder or RNN-T based. Pure CTC systems (wav2vec 2.0) sit around
1.8–2.1% on test-clean.
Interactive figure: ctc-collapse. This one moves. Watch it animate and drag its controls in
the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/06-speech-
and-audio/04-speech-recognition-asr
Build It
Step 1: greedy CTC decode
def ctc_greedy(frame_logits, blank=0, vocab=None):
# frame_logits: list of per-frame probability vectors
preds = [max(range(len(p)), key=lambda i: p[i]) for p in frame_logits]
out = []
prev = -1
for p in preds:
if p != prev and p != blank:
out.append(p)
prev = p
return "".join(vocab[i] for i in out) if vocab else out
Two rules: collapse consecutive repeats, drop blanks. Example: a a _ _ a b b _ c → a a b
c.
Step 2: beam-search CTC
def ctc_beam(frame_logits, beam=8, blank=0):
import math
beams = [([], 0.0)] # (tokens, log_prob)
for p in frame_logits:
log_p = [math.log(max(pi, 1e-10)) for pi in p]
candidates = []
for seq, lp in beams:
for t, lpt in enumerate(log_p):
new = seq[:] if t == blank else (seq + [t] if not seq or seq[-1] != t else seq)
candidates.append((new, lp + lpt))
candidates.sort(key=lambda x: -x[1])
beams = candidates[:beam]
return beams[0][0]
Production uses prefix tree beam search with LM fusion; this is the conceptual skeleton.
Step 3: WER
def wer(ref, hyp):
r, h = ref.split(), hyp.split()
dp = [[0] * (len(h) + 1) for _ in range(len(r) + 1)]
for i in range(len(r) + 1):
dp[i][0] = i
for j in range(len(h) + 1):
dp[0][j] = j
for i in range(1, len(r) + 1):
for j in range(1, len(h) + 1):
AIENGINEERINGFROMSCRATCH.COM 361

SPEECH RECOGNITION (ASR) — CTC, RNN-T, ATTENTION
cost = 0 if r[i - 1] == h[j - 1] else 1
dp[i][j] = min(
dp[i - 1][j] + 1,
dp[i][j - 1] + 1,
dp[i - 1][j - 1] + cost,
)
return dp[len(r)][len(h)] / max(1, len(r))
Step 4: inference against Whisper
import whisper
model = whisper.load_model("large-v3-turbo")
result = model.transcribe("clip.wav")
print(result["text"])
One-liner for the strongest general ASR in 2026. Runs on a 24 GB GPU at ~20× realtime.
Step 5: streaming with Parakeet or wav2vec 2.0
from transformers import pipeline
asr = pipeline("automatic-speech-recognition", model="nvidia/parakeet-tdt-1.1b")
for chunk in streaming_audio():
print(asr(chunk, return_timestamps=True))
Streaming ASR needs chunked encoder attention and carryover state; use a library that sup-
ports it (NeMo for Parakeet, transformers pipeline with chunk_length_s).
Use It
The 2026 stack:
Situation Pick
English, offline, max quality Whisper-large-v3-turbo
Multilingual, robust SeamlessM4T v2
Streaming, low latency Parakeet-TDT-1.1B or Riva
Edge, mobile, <500 ms latency Whisper-Tiny quantized or
Moonshine (2024)
Long-form Whisper with VAD-based
chunking (WhisperX)
Domain-specific (medical, legal) Fine-tune wav2vec 2.0 +
domain LM fusion
Pitfalls that still ship in 2026
• No VAD. Running Whisper on silence produces hallucinations (“Thanks for watching!”).
Always gate with VAD.
• Character vs word vs subword WER. Report word-level WER after normalization (low-
ercase, punctuation stripped).
• Language ID drift. Whisper’s auto LID mis-routes noisy clips to Japanese or Welsh;
force language="en" when you know.
AIENGINEERINGFROMSCRATCH.COM 362

SPEECH RECOGNITION (ASR) — CTC, RNN-T, ATTENTION
• Long clips without chunking. Whisper has a 30-second window. Use chunk_length_s=30,
stride=5 for anything longer.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/06-speech-and-audio/04-speech-recognition-asr
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engine
ering-from-scratch/tree/main/phases/06-speech-and-audio/04-speech-recognition-asr/code
1. Easy. Run code/main.py. It greedily decodes a hand-crafted CTC output and computes
WER against a reference.
2. Medium. Implement the prefix-tree beam search in Step 2 properly (account for the
blank merge rule). Compare with greedy on a 10-example synthetic dataset.
3. Hard. Use whisper-large-v3-turbo on LibriSpeech test-clean. Compute WER on the
first 100 utterances. Compare with published numbers.
Key Terms
Term What people say What it actually means
CTC The blank-token loss Marginal over all frame-to-token
alignments; non-AR.
RNN-T The streaming loss CTC + next-token predictor; handles
word-order.
Attention Whisper-style Encoder + cross-attending decoder; best
enc-dec offline quality.
WER The number you report (S+D+I)/N at word level.
Blank The emptiness Special token in CTC signalling “no
emission this frame”.
LM fusion External language model Add weighted LM log-probs during beam
search.
VAD The silence gate Voice activity detector; trims non-speech.
Further Reading
• Graves et al. (2006). Connectionist Temporal Classification — the CTC paper.
• Graves (2012). Sequence Transduction with RNNs — the RNN-T paper.
• Radford et al. / OpenAI (2022). Whisper: Robust Speech Recognition via Large-Scale
Weak Supervision — the 2022 canonical paper; v3-turbo extension in 2024.
• NVIDIA NeMo — Parakeet-TDT card — 2026 Open ASR Leaderboard leader.
• Hugging Face — Open ASR Leaderboard — live benchmark across 25+ models.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/06-speech-and-audio/04-speech-recognition-asr
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/06-speech-and-audio/04-speech-recognition-asr/code
AIENGINEERINGFROMSCRATCH.COM 363

SPEECH RECOGNITION (ASR) — CTC, RNN-T, ATTENTION
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 364