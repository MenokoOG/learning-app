---
title: "Build a Voice Assistant Pipeline — The Phase 6 Capstone"
volume: "vol2-deep-learning"
part: "Part III — Speech & Audio"
chapter_number: 54
source_pages: "406-410"
---

# Build a Voice Assistant Pipeline — The Phase 6 Capstone

Build a Voice Assistant Pipeline — The
Phase 6 Capstone
Everything from lessons 01-11, stitched together. Build a voice assistant that lis-
tens, reasons, and talks back. In 2026 that is a solved engineering problem, not a
research problem — but the integration details decide whether it ships.
Type: Build Languages: Python Prerequisites: Phase 6 · 04, 05, 06, 07, 11; Phase 11 · 09
(Function Calling); Phase 14 · 01 (Agent Loop) Time: ~120 minutes
The Problem
Build an end-to-end assistant:
1. Captures mic input (16 kHz mono).
2. Detects start/end of user speech.
3. Transcribes streaming.
4. Passes transcript to an LLM that can call tools (timer, weather, calendar).
5. Streams LLM text to a TTS.
6. Plays audio back to the user.
7. Stops if the user interrupts mid-response.
Latency target: first TTS audio byte within 800 ms of the user finishing their utterance on a
laptop CPU. Quality target: no missed words, no hallucinated subtitles on silence, no voice
cloning leakage, no prompt injection success.
The Concept
The seven components
1. Audio capture. Mic → 16 kHz mono → 20 ms chunks. Usually sounddevice in Python or
native AudioUnit/ALSA/WASAPI in production.
2. VAD (Lesson 11). Silero VAD @ threshold 0.5, min speech 250 ms, silence hang-over
500 ms. Signals “start” and “end.”
3. Streaming STT (Lesson 4-5). Whisper-streaming, Parakeet-TDT, or Deepgram Nova-3
(API). Partial + final transcripts.
4. LLM with tool calling. GPT-4o / Claude 3.5 / Gemini 2.5 Flash. JSON schema for tools.
Stream tokens.
5. Streaming TTS (Lesson 7). Kokoro-82M (fastest open) or Cartesia Sonic (commercial).
Start TTS after 20 LLM tokens.
6. Playback. Speaker out; opus-encode for low-bandwidth networks.
7. Interruption handler. If VAD fires during TTS playback, stop playback, cancel LLM,
restart STT.
AIENGINEERINGFROMSCRATCH.COM 402

BUILD A VOICE ASSISTANT PIPELINE — THE PHASE 6 CAPSTONE
voibcaerg ae-sins:i isf tuasenr stp epaikps, eVlAiDn cea n—cel s7 T TcSo +m LLpMo, nreestnartt sfr,o m1 (t2u) rn
1. mic 2. VAD 3. STT 4. LLM + tools 5. TTS 6. speaker 7. user
16 kHz mono Silero Whisper / Parakeet GPT-4o / Claude Kokoro / Cartesia opus out
20 ms chunks + pre-roll streaming stream + JSON tools stream from token 20 PLC enabled ear
the three failure modes you will hit
1. first-word clip — VAD triggers late; user's "hey" is lost. Keep 200-400 ms pre-roll buffer.
2. barge-in confusion — LLM keeps generating after user interrupts. Wire VAD → cancel-LLM.
3. silence hallucinations — Whisper says "Thanks for watching" on silent warm-up. Always VAD-gate.
in production, log every turn + P50/P95/P99 per-stage histograms before shipping.
2026 reference stacks (pick by target latency + license)
LiveKit + Deepgram + GPT-4o + Cartesia 350-500 ms industry default
Pipecat + Whisper-stream + GPT-4o + Kokoro 500-800 ms DIY open-source
Moshi (full-duplex, single model) 200-300 ms different architecture — lesson 15
Vapi / Retell (managed) 300-500 ms fastest to ship
whisper.cpp + llama.cpp + Kokoro-ONNX offline edge / privacy
add wake-word gate (Porcupine) for always-on consumer devices; never log raw audio > 30 days.
Figure 12: Voice assistant pipeline: mic → VAD → STT → LLM+tools → TTS → speaker
The three failure modes you will hit
1. First-word clip. VAD starts a beat too late. User’s “hey” is missing. Start threshold at
0.3, not 0.5.
2. Mid-response interrupt confusion. LLM keeps generating after user interrupts; as-
sistant talks over user. Wire VAD → cancel-LLM.
3. Silence hallucination. Whisper outputs “Thanks for watching” on the silent warm-up
frames. Always VAD-gate.
2026 production reference stacks
Stack Latency License Notes
LiveKit + 350-500 ms commercial API Industry default
Deepgram + 2026
GPT-4o + Cartesia
Pipecat + 500-800 ms mostly open DIY-friendly
Whisper-
streaming +
GPT-4o + Kokoro
Moshi 200-300 ms CC-BY 4.0 Single-model;
(full-duplex) different
architecture,
lesson 15
Vapi / Retell 300-500 ms commercial Fastest to launch;
(managed) limited
customization
AIENGINEERINGFROMSCRATCH.COM 403

BUILD A VOICE ASSISTANT PIPELINE — THE PHASE 6 CAPSTONE
Stack Latency License Notes
Whisper.cpp + offline open Privacy / edge
llama.cpp +
Kokoro-ONNX
Interactive figure: v4-voice-latency. This one moves. Watch it animate and drag its con-
trols in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/06-
speech-and-audio/12-voice-assistant-pipeline
Build It
Step 1: mic capture with chunking (pseudocode)
import sounddevice as sd
def mic_stream(chunk_ms=20, sr=16000):
q = queue.Queue()
def cb(indata, frames, time, status):
q.put(indata.copy().flatten())
with sd.InputStream(channels=1, samplerate=sr, blocksize=int(sr * chunk_ms/1000), callback=cb):
while True:
yield q.get()
Step 2: VAD-gated turn capture
def capture_turn(stream, vad, pre_roll_ms=300, silence_ms=500):
buf, pre, triggered = [], collections.deque(maxlen=pre_roll_ms // 20), False
silent = 0
for chunk in stream:
pre.append(chunk)
if vad(chunk):
if not triggered:
buf = list(pre)
triggered = True
buf.append(chunk)
silent = 0
elif triggered:
silent += 20
buf.append(chunk)
if silent >= silence_ms:
return b"".join(buf)
Step 3: streaming STT → LLM → TTS
async def turn(audio_bytes):
transcript = await stt.transcribe(audio_bytes)
async for token in llm.stream(transcript):
async for audio in tts.stream(token):
await speaker.play(audio)
AIENGINEERINGFROMSCRATCH.COM 404

BUILD A VOICE ASSISTANT PIPELINE — THE PHASE 6 CAPSTONE
Step 4: tool calling inside the LLM loop
tools = [
{"name": "get_weather", "parameters": {"location": "string"}},
{"name": "set_timer", "parameters": {"seconds": "int"}},
]
async for chunk in llm.stream(user_text, tools=tools):
if chunk.type == "tool_call":
result = dispatch(chunk.name, chunk.args)
continue_streaming(result)
if chunk.type == "text":
await tts.stream(chunk.text)
Step 5: interruption handling
tts_task = asyncio.create_task(tts_loop())
while True:
chunk = await mic.get()
if vad(chunk):
tts_task.cancel()
await speaker.stop()
await new_turn()
break
Use It
See code/main.py for a runnable simulation that wires all seven components with stub models,
so you can see the pipeline shape even without hardware. For a real implementation, swap
stubs with:
• silero-vad (pip install silero-vad)
• deepgram-sdk or openai-whisper
• openai (gpt-4o) or anthropic
• kokoro or cartesia
• sounddevice for I/O
Pitfalls
• Logging PII forever. Full-turn audio is PII in most jurisdictions. 30-day retention,
encrypted at rest.
• No barge-in. Users will interrupt. Your assistant must stop talking.
• TTS that blocks. Synchronous TTS blocks the event loop. Use async or a separate
thread.
• No tool-call error handling. Tools fail. LLM must get back the error + retry once,
then gracefully degrade.
• Overzealous hallucination filters. Over-filter and the assistant repeats “I can’t help
with that.” Under-filter and it says anything. Calibrate on a held-out set.
• No wake-word option. Always-listening is a privacy liability. Add a wake-word gate
(Porcupine or openWakeWord).
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
AIENGINEERINGFROMSCRATCH.COM 405

BUILD A VOICE ASSISTANT PIPELINE — THE PHASE 6 CAPSTONE
engineering-from-scratch/tree/main/phases/06-speech-and-audio/12-voice-assistant-
pipeline
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engine
ering-from-scratch/tree/main/phases/06-speech-and-audio/12-voice-assistant-pipeline/code
1. Easy. Run code/main.py. It simulates one full turn end-to-end with stub modules and
prints per-stage latency.
2. Medium. Replace the STT stub with a real Whisper model on a pre-recorded .wav.
Measure WER and end-to-end latency.
3. Hard. Add tool calling: implement get_weather (any API) and set_timer. Route the
LLM through the tools and verify that when the user says “set a 5 minute timer” the
right function fires and the spoken reply confirms it.
Key Terms
Term What people say What it actually means
Turn A user + assistant round-trip One VAD-bounded user speech + one
LLM-TTS response.
Barge-in Interruption User speaks while assistant talks; assistant
stops.
Wake word “Hey assistant” Short keyword detector; Porcupine,
Snowboy, openWakeWord.
End- Turn ending VAD + min-silence decision that user has
pointing finished.
Pre-roll Pre-speech buffer Keep 200-400 ms of audio before VAD fires
to avoid first-word clip.
Tool call Function invocation LLM emits JSON; runtime dispatches;
result feeds back in-loop.
Further Reading
• LiveKit — voice agent quickstart — production-grade reference.
• Pipecat — voice agent examples — DIY-friendly framework.
• OpenAI Realtime API — the managed voice-native path.
• Kyutai Moshi — full-duplex reference (Lesson 15).
• Porcupine wake-word — wake-word gating.
• Anthropic — tool use guide — LLM function calling.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/06-speech-and-audio/12-voice-assistant-pipeline
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/06-speech-and-audio/12-voice-assistant-pipeline/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 406