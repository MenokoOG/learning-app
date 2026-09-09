---
title: "Voice Cloning & Voice Conversion"
volume: "vol2-deep-learning"
part: "Part III — Speech & Audio"
chapter_number: 51
source_pages: "385-394"
---

# Voice Cloning & Voice Conversion

Voice Cloning & Voice Conversion
Voice cloning reads your text in someone else’s voice. Voice conversion rewrites
your voice into someone else’s while preserving what you said. Both hang on the
same decomposition: separate speaker identity from content.
Type: Build Languages: Python Prerequisites: Phase 6 · 06 (Speaker Recognition), Phase
6 · 07 (TTS) Time: ~75 minutes
The Problem
In 2026, a 5-second audio clip is enough to produce a high-quality clone of anyone’s voice
with a consumer GPU. ElevenLabs, F5-TTS, OpenVoice v2, VoiceBox all ship zero-shot or few-
shot cloning. The technology is a blessing (accessibility TTS, dubbing, assistive voices) and a
weapon (scam calls, political deepfakes, IP theft).
Two closely-related tasks:
• Voice cloning (TTS-side): text + 5-second reference voice → audio in that voice.
• Voice conversion (speech-side): source audio (person A saying X) + reference voice
of person B → audio of B saying X.
Both factor a waveform into (content, speaker, prosody) and recombine content from one
source with speaker from another.
Key constraint you now ship under in 2026: watermarking and consent gates are legally
required in the EU (AI Act, enforceable August 2026) and in California (AB 2905,
effective 2025). Your pipeline must emit an inaudible watermark and refuse non-consensual
clones.
The Concept
Zero-shot cloning. Pass a 5-second clip to a model that has been trained on thousands
of speakers. The speaker encoder maps the clip to a speaker embedding; the TTS decoder
conditions on that embedding plus text.
Used by: F5-TTS (2024), YourTTS (2022), XTTS v2 (2024), OpenVoice v2 (2024).
Few-shot fine-tuning. Record 5-30 minutes of the target voice. LoRA-fine-tune a base model
for an hour. Quality leaps from “okay” to “indistinguishable”. Coqui and ElevenLabs both
support this pattern; community uses it with F5-TTS.
Voice conversion (VC). Two families:
• Recognition-synthesis. Run ASR-like model to extract content representation (e.g.,
soft phoneme posteriors, PPGs), then resynthesize with target speaker embedding. Ro-
bust to language and accent. Used by KNN-VC (2023), Diff-HierVC (2023).
• Disentanglement. Train an autoencoder that separates content, speaker, and prosody
in latent space at the bottleneck. Swap speaker embedding at inference. Lower quality
but faster. Used by AutoVC (2019), VITS-VC variants.
AIENGINEERINGFROMSCRATCH.COM 381

VOICE CLONING & VOICE CONVERSION
factor → swap speaker → recombine (plus watermark)
target ref (5 s) speaker encoder cloning TTS watermark
alice_5s.wav ECAPA / WavLM-SV F5 / XTTS / VALL-E 2 SilentCipher
dry, close-mic, single speaker 192-d embedding text + speaker_emb → mel ~32 bits, inaudible
text: "add milk to list"
source speech content extractor resynthesizer output
bob saying "turn off" ASR PPG / WavLM frames KNN-VC / Diff-HierVC alice saying "turn off"
any speaker, any text speaker-invariant representation content + alice_emb → wav content preserved
legal and ethical stack (required 2026)
consent gate signed record + speaker-hash match before inference
watermark SilentCipher or PerTh; ~32-bit payload, MP3-robust
detector pair AASIST / RawNet2 — ship with the generator
audit log tamper-evident record of every synthesis request
Figure 8: Voice cloning vs conversion: factorize, swap speaker, recombine
Neural codec-based cloning (2024+). VALL-E, VALL-E 2, NaturalSpeech 3, VoiceBox —
treat audio as discrete tokens from SoundStream / EnCodec, train a large autoregressive or
flow-matching model over codec tokens. Quality comparable to ElevenLabs on short prompts.
The ethics bit, not a bolt-on
Watermarking. PerTh (Perth) and SilentCipher (2024) embed a ~16-32 bit ID imperceptibly
in the audio. Survives re-encoding, streaming, and common edits. Production-ready open
source.
Consent gates. Must pair every cloned output with a verifiable consent record. “I, Rohit, on
2026-04-22, authorize this voice for X purpose.” Store in a tamper-evident log.
Detection. AASIST, RawNet2, and Wav2Vec2-AASIST ship as detectors. ASVspoof 2025
challenge published EERs of 0.8–2.3% for state-of-the-art detectors against ElevenLabs, VALL-
E 2, and Bark outputs.
Numbers (2026)
Model Zero-shot? SECS (target sim) WER (intel.) Params
F5-TTS Yes 0.72 2.1% 335M
XTTS v2 Yes 0.65 3.5% 470M
OpenVoice Yes 0.70 2.8% 220M
v2
VALL-E 2 Yes 0.77 2.4% 370M
VoiceBox Yes 0.78 2.1% 330M
SECS > 0.70 is generally indistinguishable from the target for most listeners.
AIENGINEERINGFROMSCRATCH.COM 382

VOICE CLONING & VOICE CONVERSION
Interactive figure: sp-voice-factorize. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/06-speech-and-audio/08-voice-cloning-conversion
Build It
Step 1: decompose with recognition-synthesis (code-only demo in
main.py)
def clone_pipeline(ref_audio, text, target_embedder, tts_model):
speaker_emb = target_embedder.encode(ref_audio)
mel = tts_model(text, speaker=speaker_emb)
return vocoder(mel)
Conceptually simple; implementation mass is in tts_model and speaker encoder.
Step 2: zero-shot clone with F5-TTS
from f5_tts.api import F5TTS
tts = F5TTS()
wav = tts.infer(
ref_file="rohit_5s.wav",
ref_text="The quick brown fox jumps over the lazy dog.",
gen_text="Please add milk and bread to my list.",
)
Reference transcript must exactly match the audio; mismatch breaks alignment.
Step 3: voice conversion with KNN-VC
import torch
from knnvc import KNNVC # 2023 model, https://github.com/bshall/knn-vc
vc = KNNVC.load("wavlm-base-plus")
out_wav = vc.convert(source="my_voice.wav", target_pool=["alice_1.wav", "alice_2.wav"])
KNN-VC runs WavLM to extract per-frame embeddings for source and target pool, then re-
places each source frame with its nearest neighbor in the pool. Non-parametric, works with
a minute of target speech.
Step 4: embed a watermark
from silentcipher import SilentCipher
sc = SilentCipher(model="2024-06-01")
payload = b"consent_id:abc123;ts:1745353200"
watermarked = sc.embed(wav, sr=24000, message=payload)
detected = sc.detect(watermarked, sr=24000) # returns payload bytes
~32 bits of payload, detectable after MP3 re-encode and light noise.
Step 5: consent gate
def cloned_inference(text, ref_audio, consent_record):
assert verify_signature(consent_record), "Signed consent required"
assert consent_record["speaker_id"] == hash_speaker(ref_audio)
AIENGINEERINGFROMSCRATCH.COM 383

VOICE CLONING & VOICE CONVERSION
wav = tts.infer(ref_file=ref_audio, gen_text=text)
wav = watermark(wav, payload=consent_record["id"])
return wav
Use It
The 2026 stack:
Situation Pick
5-sec zero-shot clone, open-source F5-TTS or OpenVoice v2
Commercial production cloning ElevenLabs Instant Voice Clone
v2.5
Voice conversion (rewriting) KNN-VC or Diff-HierVC
Many-speaker fine-tune StyleTTS 2 + speaker adapter
Cross-lingual cloning XTTS v2 or VALL-E X
Deepfake detection Wav2Vec2-AASIST
Pitfalls
• Misaligned reference transcript. F5-TTS and similar require the reference text to
match the reference audio exactly, punctuation included.
• Reverberant reference. Echo kills the clone. Record dry, close-mic.
• Emotional mismatch. Training reference “cheerful” produces cheerful clones of ev-
erything. Match reference emotion to target use.
• Language leakage. Cloning an English speaker then asking the model to speak French
often carries the accent anyway; use cross-lingual models (XTTS, VALL-E X).
• No watermark. Legally unshippable in EU from Aug 2026.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/06-speech-and-audio/08-voice-cloning-
conversion
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/06-speech-and-audio/08-voice-cloning-
conversion/code
1. Easy. Run code/main.py. Demonstrates the speaker-embedding swap by computing the
cosine between two “speakers” pre and post swap.
2. Medium. Use OpenVoice v2 to clone your own voice. Measure SECS between reference
and clone. Measure CER via Whisper.
3. Hard. Apply SilentCipher watermark to 20 clones, run them through 128 kbps MP3
encode+decode, detect the payload. Report bit-accuracy.
Key Terms
AIENGINEERINGFROMSCRATCH.COM 384

VOICE CLONING & VOICE CONVERSION
Term What people say What it actually means
Zero-shot 5 seconds is enough Pretrained model + speaker embedding; no
clone training.
PPG Phonetic posteriorgram Per-frame ASR posteriors used as
language-agnostic content rep.
KNN-VC Nearest-neighbor conversion Replace each source frame with nearest
target-pool frame.
Neural VALL-E style AR model over EnCodec/SoundStream
codec TTS tokens.
Watermark Inaudible signature Bits embedded in audio, survive re-encode.
SECS Cloning fidelity Cosine between target and clone speaker
embeddings.
AASIST Deepfake detector Anti-spoof model; detects synthesized
speech.
Further Reading
• Chen et al. (2024). F5-TTS — open-source SOTA zero-shot cloning.
• Baevski et al. / Microsoft (2023). VALL-E and VALL-E 2 (2024) — neural-codec TTS.
• Qian et al. (2019). AutoVC — disentanglement-based voice conversion.
• Baas, Waubert de Puiseau, Kamper (2023). KNN-VC — retrieval-based VC.
• SilentCipher (2024) — Audio Watermarking — production-ready 32-bit audio watermark.
• ASVspoof 2025 results — detector vs synthesizer arms race, updated 2026.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/06-speech-and-audio/08-voice-cloning-conversion
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/06-speech-and-audio/08-voice-cloning-conversion/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 385

Music Generation — MusicGen, Stable
Audio, Suno, and the Licensing Earth-
quake
2026 music generation: Suno v5 and Udio v4 dominate commercial; MusicGen, Sta-
ble Audio Open, and ACE-Step lead open-source. The technical problem is mostly
solved. The legal problem (Warner Music $500M settlement, UMG settlement) re-
shaped the field in 2025-2026.
Type: Build Languages: Python Prerequisites: Phase 6 · 02 (Spectrograms), Phase 4 · 10
(Diffusion Models) Time: ~75 minutes
The Problem
Text → a 30-second to 4-minute music clip, with lyrics, vocals, and structure. Three sub-
problems:
1. Instrumental generation. Text like “lo-fi hip-hop drums with warm keys” → audio.
MusicGen, Stable Audio, AudioLDM.
2. Song generation (with vocals + lyrics). “Country song about rainy Texas nights” →
full song. Suno, Udio, YuE, ACE-Step.
3. Conditional / controllable. Extend an existing clip, regenerate a bridge, swap genre,
stem-separate, or inpaint. Udio’s inpainting + stem separation is the 2026 feature to
match.
The Concept
Token LM over neural-codec tokens
Meta’s MusicGen (2023, MIT) and many derivatives: condition on text/melody embeddings,
autoregressively predict EnCodec tokens (32 kHz, 4 codebooks), decode with EnCodec. 300M
- 3.3B params. Strong baseline; struggles past 30 seconds.
ACE-Step (open-source, 4B XL released April 2026) extends this for full-song lyric-
conditioned generation. The open community’s closest thing to Suno.
Diffusion over mels or latents
Stable Audio (2023) and Stable Audio Open (2024): latent diffusion on compressed audio.
Excels at loops, sound design, ambient textures. Not great at structured full songs.
AudioLDM / AudioLDM2: text-to-audio via T2I-style latent diffusion, generalized to music,
sound effects, speech.
AIENGINEERINGFROMSCRATCH.COM 386

MUSIC GENERATION — MUSICGEN, STABLE AUDIO, SUNO, AND THE LICENSING EARTHQUAKE
music generation — two paradigms, one legal landscape
A. AR token LM over neural codec B. latent diffusion over mel / latent codec
MusicGen · ACE-Step · YuE · VALL-E-Music Stable Audio · AudioLDM 2 · Riffusion
text prompt → T5 / CLAP embedding text → CLAP embedding
→ AR transformer over EnCodec tokens → latent diffusion (DDPM / flow)
→ EnCodec decoder → audio 32 kHz → decoder → audio 44.1 / 48 kHz
streams (future); structured songs with lyrics best for loops, textures, sound design
drift past 30 s; loops; needs crossfade weaker structure, weaker vocals
2026 leaderboard + legal note
MusicGen-large 3.3B 30 s no vocals MIT - instrumental baseline
Stable Audio Open 1.2B 47 s no vocals non-commercial - loops, textures
ACE-Step XL (Apr 26) 4B > 2 min vocals Apache-2.0 - open full-song
Suno v5 (closed) ? 4 min vocals commercial - ELO 1293; quality leader
Udio v4 (closed) ? 4 min vocals+stems commercial - inpainting, stem split
legal: Warner + UMG settled with Suno / Udio in 2025-26; disclosure + watermarking required (EU AI Act, CA SB 942)
safe-to-ship: instrumental MIT/CC0 · commercial API with license · train on owned catalog
Figure 9: Music generation: token-LM vs diffusion, the 2026 model map
Hybrid (production) — Suno, Udio, Lyria
Closed weights. Likely AR codec LM + diffusion-based vocoder with specialized voice / drum
/ melody heads. Suno v5 (2026) is the ELO 1293 quality leader. Udio v4 adds inpainting +
stem separation (bass, drums, vocals separate downloads).
Evaluation
• FAD (Fréchet Audio Distance). Embedding-level distance between generated vs real
audio distribution using VGGish or PANNs features. Lower is better. MusicGen small:
4.5 FAD on MusicCaps; SOTA ~3.0.
• Musicality (subjective). Human preference. Suno v5 ELO 1293 leads.
• Text-audio alignment. CLAP score between prompt and output.
• Musicality artifacts. Off-beat transitions, vocal-phrase drift, loss of structure past 30
s.
2026 model map
Model Params Length Vocals License
MusicGen- 3.3B 30 s no MIT
large
Stable Audio 1.2B 47 s no Stability
Open non-commercial
ACE-Step XL 4B > 2 min yes Apache-2.0
(Apr 2026)
YuE 7B > 2 min yes, multilingual Apache-2.0
Suno v5 ? 4 min yes, ELO 1293 commercial
(closed)
AIENGINEERINGFROMSCRATCH.COM 387

MUSIC GENERATION — MUSICGEN, STABLE AUDIO, SUNO, AND THE LICENSING EARTHQUAKE
Model Params Length Vocals License
Udio v4 ? 4 min yes + stems commercial
(closed)
Google Lyria ? real-time yes commercial
3 (closed)
MiniMax ? 4 min yes commercial API
Music 2.5
The legal landscape (2025-2026)
• Warner Music vs Suno settlement. $500M. WMG now has oversight of AI-likeness,
music rights, and user-generated tracks on Suno. Similar UMG settlement on Udio.
• EU AI Act + California SB 942: AI-generated music must be disclosed.
• Riffusion / MusicGen under MIT have no compliance baggage but also no commercial
vocals.
Safe-to-ship patterns:
1. Generate instrumental only (MusicGen, Stable Audio Open, MIT/CC0 outputs).
2. Use commercial APIs (Suno, Udio, ElevenLabs Music) with per-generation license.
3. Train on owned or licensed catalog (most enterprises end up here).
4. Tag generations with watermarks + metadata.
Interactive figure: sp-codec-tokens. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/06-
speech-and-audio/09-music-generation
Build It
Step 1: generate with MusicGen
from audiocraft.models import MusicGen
import torchaudio
model = MusicGen.get_pretrained("facebook/musicgen-small")
model.set_generation_params(duration=10)
wav = model.generate(["upbeat synthwave with driving drums, 128 BPM"])
torchaudio.save("out.wav", wav[0].cpu(), 32000)
Three sizes: small (300M, fast), medium (1.5B), large (3.3B). Small is enough for “does the
idea land.”
Step 2: melody conditioning
melody, sr = torchaudio.load("humming.wav")
wav = model.generate_with_chroma(
["jazz piano cover"],
melody.squeeze(),
sr,
)
MusicGen-melody takes a chromagram and preserves the tune while swapping timbre. Useful
for “give me this melody as a string quartet.”
AIENGINEERINGFROMSCRATCH.COM 388

MUSIC GENERATION — MUSICGEN, STABLE AUDIO, SUNO, AND THE LICENSING EARTHQUAKE
Step 3: FAD evaluation
from frechet_audio_distance import FrechetAudioDistance
fad = FrechetAudioDistance()
fad.get_fad_score("generated_folder/", "reference_folder/")
Computes VGGish-embedding distance. Useful for genre-level regression tests; not a substi-
tute for human listeners.
Step 4: adding to the LLM-music workflow
Combine with the ideas from Lessons 7-8:
prompt = "Write a 30-second jazz loop. Describe the drums, bass, and piano voicing."
description = llm.complete(prompt)
music = musicgen.generate([description], duration=30)
Use It
Goal Stack
Instrumental sound design Stable Audio Open
Game / adaptive music Google Lyria RealTime (closed)
Full songs with vocals (commercial) Suno v5 or Udio v4 with explicit license
Full songs with vocals (open) ACE-Step XL or YuE
Short ad jingle MusicGen melody-conditioned on a hummed
reference
Music-video background MusicGen + Stable Video Diffusion
Pitfalls that still ship in 2026
• Copyright-laundering prompts. “Song in the style of Taylor Swift” — commercial
Suno/Udio filter these now, open models do not. Add your own filter list.
• Repetition / drift past 30 s. AR models loop. Crossfade multiple generations, or use
ACE-Step for structural coherence.
• Tempo drift. Models wander off the BPM. Use BPM tags in the prompt and post-filter
with librosa’s beat_track.
• Vocal intelligibility. Suno is excellent; open models are often mushy on words. If lyrics
matter, use a commercial API or fine-tune.
• Mono output. Open models generate mono or fake-stereo. Upgrade with a proper
stereo reconstruction (ezst, Cartesia’s stereo diffusion).
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/06-speech-and-audio/09-music-generation
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/06-speech-and-audio/09-music-generation/code
AIENGINEERINGFROMSCRATCH.COM 389

MUSIC GENERATION — MUSICGEN, STABLE AUDIO, SUNO, AND THE LICENSING EARTHQUAKE
1. Easy. Run code/main.py. It produces a “generative” chord progression + drum pattern
as ASCII symbols — a music-gen cartoon. Play it back via any MIDI renderer if you want.
2. Medium. Install audiocraft, generate 10-second clips across 4 genre prompts with
MusicGen-small, measure FAD against a reference genre set.
3. Hard. Using ACE-Step (or MusicGen-melody), generate three variations of the same
tune with different timbre prompts. Compute CLAP similarity to the prompt to verify
alignment.
Key Terms
Term What people say What it actually means
FAD Audio FID Fréchet distance between embedding
distributions of real vs generated.
Chromagram Melody as pitches 12-dim per-frame vector; input to melody
conditioning.
Stems Instrument tracks Separated bass / drums / vocals / melody as
WAV.
Inpainting Regen a section Mask a time window; model regenerates
just that.
CLAP Text-audio CLIP Contrastive audio-text embedding; eval
text-audio alignment.
EnCodec Music codec Meta’s neural codec used by MusicGen; 32
kHz, 4 codebooks.
Further Reading
• Copet et al. (2023). MusicGen — the open autoregressive benchmark.
• Evans et al. (2024). Stable Audio Open — the sound-design default.
• ACE-Step — open 4B full-song generator, April 2026.
• Suno v5 platform docs — the commercial quality leader.
• AudioLDM2 — latent diffusion for music + sound effects.
• WMG-Suno settlement coverage — Nov 2025 precedent.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/06-speech-and-audio/09-music-generation
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/06-speech-and-audio/09-music-generation/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 390