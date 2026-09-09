---
title: "Audio-Language Models — Qwen2.5-Omni, Audio Flamingo, GPT-4o Audio"
volume: "vol2-deep-learning"
part: "Part III — Speech & Audio"
chapter_number: 52
source_pages: "395-400"
---

# Audio-Language Models — Qwen2.5-Omni, Audio Flamingo, GPT-4o Audio

Audio-Language Models — Qwen2.5-
Omni, Audio Flamingo, GPT-4o Audio
2026 audio-language models reason over speech + environmental sound + music.
Qwen2.5-Omni-7B matches GPT-4o Audio on MMAU-Pro. Audio Flamingo Next
beats Gemini 2.5 Pro on LongAudioBench. The gap between open and closed is
essentially closed — except on multi-audio tasks, where everyone is near random.
Type: Learn Languages: Python Prerequisites: Phase 6 · 04 (ASR), Phase 12 · 03 (Vision-
Language Models), Phase 7 · 10 (Audio Transformers) Time: ~45 minutes
The Problem
You have 5 seconds of audio: dog barks, someone yells “stop!”, then silence. Useful questions
span multiple axes:
• Transcription. “What was said?” — ASR territory.
• Semantic reasoning. “Is the person in danger?” — requires joint understanding of the
bark + yell + silence.
• Music reasoning. “What instruments play the melody?”
• Long-audio retrieval. “Where in this 90-minute lecture did the instructor explain gra-
dient descent?”
A single model that answers all of these with one prompt is an audio-language model (LALM
/ ALM). Separate from pure ASR: LALMs produce free-form natural-language answers, not
just transcripts.
The Concept
The three-component template
Every 2026 LALM has the same skeleton:
1. Audio encoder. Whisper encoder · BEATs · CLAP · WavLM · or a custom encoder per
model.
2. Projector. Linear or MLP bridging audio-encoder features into the LLM’s token embed-
ding space.
3. LLM. Llama / Qwen / Gemma-based decoder. Takes interleaved text + audio tokens;
generates text.
Training:
• Stage 1. Freeze encoder + LLM; train projector only on ASR / captioning data.
• Stage 2. Full / LoRA fine-tune on instruction-following audio tasks (QA, reasoning, music
understanding).
• Stage 3 (optional). Voice-in / voice-out adds a speech decoder. Qwen2.5-Omni and
AF3-Chat do this.
AIENGINEERINGFROMSCRATCH.COM 391

AUDIO-LANGUAGE MODELS — QWEN2.5-OMNI, AUDIO FLAMINGO, GPT-4O AUDIO
audio-language model — three-component template (2026)
1. audio encoder 2. projector 3. LLM decoder 4. text OR speech
Whisper / BEATs / CLAP 1-3 linear layers Llama / Qwen / Gemma Qwen2.5-Omni: both
→ (T, d_audio) d_audio → d_llm text + audio tokens GPT-4o Audio: both
frozen in stage 1 trained first LoRA-fine-tuned stage 2 speech decoder optional
training recipe
stage 1 · freeze encoder + LLM; train projector on ASR / captioning pairs
stage 2 · LoRA on encoder + LLM; audio-QA / instruction-following data
stage 3 · (optional) bolt on a speech decoder for voice-in / voice-out
MMAU-Pro 2026 — open weights have closed the gap, except on multi-audio
Gemini 2.5 Pro ~60% overall 73.4% speech 51.9% sound 64.9% music ~22% multi
GPT-4o Audio 52.5% — — — 26.5% multi
Qwen2.5-Omni-7B 52.2% 57.4% speech 47.6% sound 61.5% music ~20% multi
Audio Flamingo 3 ~54% — (music specialist via AF-CLAP)
random chance on 4-way multiple choice = 25% — multi-audio is genuinely broken across all models
Figure 10: Audio-language model: audio encoder + projector + LLM decoder
The 2026 model map
Model Backbone Audio encoder Output modality Access
Qwen2.5- Qwen2.5-7B Custom + Whisper text + speech Apache-2.0
Omni-7B
Qwen3- Qwen3 Custom text + speech Apache-2.0
Omni
Audio Qwen2 AF-CLAP text NVIDIA
Flamingo non-
3 commercial
Audio Qwen2 AF-CLAP v2 text NVIDIA
Flamingo non-
Next commercial
SALMONN Vicuna Whisper + BEATs text Apache-2.0
LTU / Llama CAV-MAE text Apache-2.0
LTU-AS
GAMA Llama AST + Q-Former text Apache-2.0
Gemini Gemini proprietary text + speech API
2.5
Flash/Pro
(closed)
GPT-4o GPT-4o proprietary text + speech API
Audio
(closed)
Benchmark reality check (2026)
MMAU-Pro. 1800 QA pairs covering speech / sound / music / mixed. Multi-audio subset
included.
AIENGINEERINGFROMSCRATCH.COM 392

AUDIO-LANGUAGE MODELS — QWEN2.5-OMNI, AUDIO FLAMINGO, GPT-4O AUDIO
Model Overall Speech Sound Music Multi-audio
Gemini 2.5 ~60% 73.4% 51.9% 64.9% ~22%
Pro
Gemini 2.5 ~57% 73.4% 50.5% 64.9% 21.2%
Flash
GPT-4o 52.5% — — — 26.5%
Audio
Qwen2.5- 52.2% 57.4% 47.6% 61.5% ~20%
Omni-7B
Audio ~54% — — — —
Flamingo
3
Audio SOTA on Lon- — — — —
Flamingo gAudioBench
Next
The multi-audio column is damning for everyone. Random chance on 4-option multiple
choice = 25%; most models score around there. LALMs still struggle to compare two clips.
Where LALMs are useful in 2026
• Compliance audit of call-center recordings. “Did the agent mention the required
disclosure?”
• Accessibility. Describe sound events to deaf users (not just transcription).
• Content moderation. Detect violent language + threatening tone + background con-
text.
• Podcast / meeting chaptering. Semantic summary, not just speaker turns.
• Music catalog analysis. “Find all tracks with a B-section key change.”
Where they are NOT (yet) useful
• Fine-grained music theory (below chord-level).
• Speaker-attributed reasoning over long conversations (degrades past 10 minutes).
• Multi-audio comparison (22-26% is barely above random).
• Real-time streaming reasoning (most are offline batch inference).
Interactive figure: v4-alm-tokens. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/06-
speech-and-audio/10-audio-language-models
Build It
Step 1: query Qwen2.5-Omni
from transformers import AutoModelForCausalLM, AutoProcessor
processor = AutoProcessor.from_pretrained("Qwen/Qwen2.5-Omni-7B")
model = AutoModelForCausalLM.from_pretrained("Qwen/Qwen2.5-Omni-7B", torch_dtype="auto")
audio, sr = load_wav("clip.wav", sr=16000)
messages = [{
AIENGINEERINGFROMSCRATCH.COM 393

AUDIO-LANGUAGE MODELS — QWEN2.5-OMNI, AUDIO FLAMINGO, GPT-4O AUDIO
"role": "user",
"content": [
{"type": "audio", "audio": audio},
{"type": "text", "text": "What sounds do you hear, and what's happening?"},
],
}]
inputs = processor.apply_chat_template(messages, tokenize=True, return_tensors="pt")
output = model.generate(**inputs, max_new_tokens=200)
print(processor.decode(output[0], skip_special_tokens=True))
Step 2: the projector pattern
import torch.nn as nn
class AudioProjector(nn.Module):
def __init__(self, audio_dim=1280, llm_dim=4096):
super().__init__()
self.down = nn.Linear(audio_dim, llm_dim)
self.act = nn.GELU()
self.up = nn.Linear(llm_dim, llm_dim)
def forward(self, audio_features):
return self.up(self.act(self.down(audio_features)))
That’s it. The projector is usually 1-3 linear layers. Training it on ASR pairs (audio → tran-
script) is the Stage-1 pretext task.
Step 3: benchmarking MMAU / LongAudioBench
from datasets import load_dataset
mmau = load_dataset("MMAU/MMAU-Pro")
correct = 0
for item in mmau["test"]:
answer = call_model(item["audio"], item["question"], item["choices"])
if answer == item["correct_choice"]:
correct += 1
print(f"Accuracy: {correct / len(mmau['test']):.3f}")
Report per-category (speech / sound / music / multi-audio) separately. Aggregate numbers
hide where the model fails.
Use It
Task 2026 pick
Free-form audio QA (open) Qwen2.5-Omni-7B
Best open on long audio Audio Flamingo Next
Best closed Gemini 2.5 Pro
Voice-in / voice-out agent Qwen2.5-Omni or GPT-4o Audio
Music reasoning Audio Flamingo 3 or 2 (music-specialized AF-CLAP)
Call-center audit Gemini 2.5 Pro via API, with RAG over your policy docs
AIENGINEERINGFROMSCRATCH.COM 394

AUDIO-LANGUAGE MODELS — QWEN2.5-OMNI, AUDIO FLAMINGO, GPT-4O AUDIO
Pitfalls
• Over-trust on multi-audio. If your task needs “which clip has X,” random-chance-level
performance is real.
• Long-audio degradation. Past 10 minutes, most models’ speaker attribution breaks.
Diarize first (Lesson 6), then summarize.
• Hallucinations on silence. Same Whisper-style issue inherited by LALMs that use
Whisper encoder. VAD-gate.
• Benchmark cherry-picking. Vendor blog posts highlight best-case categories. Run
MMAU-Pro multi-audio subset yourself.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/06-speech-and-audio/10-audio-language-models
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engine
ering-from-scratch/tree/main/phases/06-speech-and-audio/10-audio-language-models/code
1. Easy. Run code/main.py to see a toy projector pattern + fake LALM routing of (audio-
embedding, text-tokens) → output tokens.
2. Medium. Score Qwen2.5-Omni-7B on 100 MMAU-Pro speech items. Compare to the
paper’s reported number.
3. Hard. Build a minimal audio-captioning baseline: BEATs encoder + 2-layer projector +
frozen Llama-3.2-1B. Fine-tune only the projector on AudioCaps. Compare to SALMONN
on Clotho-AQA.
Key Terms
Term What people say What it actually means
LALM Audio ChatGPT Audio encoder + projector + LLM decoder.
Projector Adapter Small MLP mapping audio features into
LLM embedding space.
MMAU The benchmark 10k audio-QA pairs across speech, sound,
music.
MMAU-Pro Harder MMAU 1800 multi-audio / reasoning-heavy
questions.
LongAudioBenLcohng-form eval Multi-minute clips with semantic queries.
Voice-in / Speech-native Model ingests speech and emits speech
voice-out without text detour.
Further Reading
• Chu et al. (2024). Qwen2-Audio — reference architecture.
• Alibaba (2025). Qwen2.5-Omni — speech-in-speech-out.
• NVIDIA (2025). Audio Flamingo 3 — the open long-audio leader.
• NVIDIA (2026). Audio Flamingo Next — LongAudioBench SOTA.
• Tang et al. (2023). SALMONN — dual-encoder pioneer.
AIENGINEERINGFROMSCRATCH.COM 395

AUDIO-LANGUAGE MODELS — QWEN2.5-OMNI, AUDIO FLAMINGO, GPT-4O AUDIO
• MMAU-Pro leaderboard — live 2026 rankings.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/06-speech-and-audio/10-audio-language-models
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/06-speech-and-audio/10-audio-language-models/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 396