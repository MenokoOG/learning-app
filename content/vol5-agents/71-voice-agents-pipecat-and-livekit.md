---
title: "Voice Agents: Pipecat and LiveKit"
volume: "vol5-agents"
part: "Part III — Agent Engineering"
chapter_number: 71
source_pages: "340-343"
---

# Voice Agents: Pipecat and LiveKit

Voice Agents: Pipecat and LiveKit
Voice agents are a first-class production category in 2026. Pipecat gives you a
Python frame-based pipeline (VAD → STT → LLM → TTS → transport). LiveKit Agents
bridges AI models to users over WebRTC. Production latency targets land at 450–
600ms end-to-end for premium stacks.
Type: Learn Languages: Python (stdlib) Prerequisites: Phase 14 · 01 (Agent Loop), Phase
14 · 12 (Workflow Patterns) Time: ~60 minutes
Learning Objectives
• Describe Pipecat’s frame-based pipeline: DOWNSTREAM (source→sink) and UP-
STREAM (control).
• Name the canonical voice pipeline stages and which transports Pipecat supports.
• Explain LiveKit Agents’ two voice agent classes (MultimodalAgent, VoicePipelineAgent)
and when each fits.
• Summarize 2026 production latency expectations and how they drive architecture
choices.
The Problem
Voice agents are not a text loop with TTS bolted on. Latency budgets are brutal (~600ms),
partial audio is the default, turn detection is a model, and transports range from telephony
SIP to WebRTC. Either you build a frame-based pipeline (Pipecat) or you lean on a platform
(LiveKit).
The Concept
Pipecat (pipecat-ai/pipecat)
• Python frame-based pipeline framework.
• Frame → FrameProcessor chain.
• Two flow directions:
– DOWNSTREAM — source → sink (audio in, TTS out).
– UPSTREAM — feedback and control (cancellation, metrics, barge-in).
• PipelineTask manages lifecycle with events (on_pipeline_started, on_pipeline_finished,
on_idle_timeout) and observers for metrics/tracing/RTVI.
Typical pipeline:
VAD (Silero) → STT → LLM (context alternates user/assistant) → TTS → transport
Transports: Daily, LiveKit, SmallWebRTCTransport, FastAPI WebSocket, WhatsApp.
Pipecat Flows adds structured conversations (state machines). Pipecat Cloud is the managed
runtime.
AIENGINEERINGFROMSCRATCH.COM 334

VOICE AGENTS: PIPECAT AND LIVEKIT
LiveKit Agents (livekit/agents)
• Bridges AI models to users over WebRTC.
• Key concepts: Agent, AgentSession, entrypoint, AgentServer.
• Two voice agent classes:
– MultimodalAgent — direct audio via OpenAI Realtime or equivalent.
– VoicePipelineAgent — STT → LLM → TTS cascade; gives text-level control.
• Semantic turn detection via a transformer model.
• Native MCP integration.
• Telephony via SIP.
• 50+ models with no API keys via LiveKit Inference; 200+ more via plugins.
Commercial platforms
Vapi (~450–600ms on an optimized premium stack) and Retell (~600ms end-to-end across
180 test calls) build on top of these. Pick a platform when you want a managed voice stack
without a WebRTC team.
Where this pattern goes wrong
• No barge-in handling. User interrupts; agent keeps talking. Requires UPSTREAM
cancel frames in Pipecat, equivalent in LiveKit.
• STT confidence ignored. Low-confidence transcripts fed to the LLM as if gospel. Gate
on confidence or request confirmation.
• TTS mid-sentence cutoff. When the pipeline cancels mid-utterance, TTS needs to
know or cut audio.
• Latency budget ignored. Every component adds 50–200ms. Sum your chain before
shipping.
Typical 2026 latencies
• VAD: 20–60ms
• STT partial: 100–250ms
• LLM first token: 150–400ms
• TTS first audio: 100–200ms
• Transport RTT: 30–80ms
End-to-end 450–600ms is premium. 800–1200ms is common. Anything > 1500ms feels bro-
ken.
Interactive figure: voice-pipeline. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/14-
agent-engineering/22-voice-agents-pipecat-livekit
Build It
code/main.py is a frame-based toy pipeline with:
• Frame types (audio, transcript, text, tts_audio, control).
• Processor interface with process(frame).
• A five-stage pipeline (VAD → STT → LLM → TTS → transport) as scripted processors.
• An UPSTREAM cancel frame to demonstrate barge-in.
Run it:
AIENGINEERINGFROMSCRATCH.COM 335

VOICE AGENTS: PIPECAT AND LIVEKIT
python3 code/main.py
The trace shows normal flow and a barge-in cancel that stops TTS mid-utterance.
Use It
• Pipecat for full control — custom processors, Python-first, pluggable providers.
• LiveKit Agents for WebRTC-first deployments and telephony.
• Vapi / Retell for hosted voice agents without a WebRTC team.
• OpenAI Realtime / Gemini Live for direct audio-in/audio-out (MultimodalAgent).
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/22-voice-agents-pipecat-
livekit
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/14-agent-engineering/22-voice-agents-pipecat-
livekit/code
1. Add a metrics observer to your toy pipeline: count frames per stage per second. Where
does latency accumulate?
2. Implement confidence-gated STT: below threshold, request “could you repeat that?”
3. Add semantic turn detection: simple rule — if transcript ends with “?”, end of turn.
4. Read Pipecat’s transport docs. Swap the stdlib transport for the SmallWebRTCTransport
config (stub).
5. Measure an OpenAI Realtime vs STT+LLM+TTS cascade on the same query. What la-
tency cost does text-level control carry?
Key Terms
Term What people say What it actually means
Frame “Event” Typed unit of data in the pipeline (audio,
transcript, text, control)
Processor “Pipeline stage” Handler with process(frame)
DOWNSTREA“MForward flow” Source to sink: audio in, speech out
UPSTREAM “Feedback flow” Control: cancel, metrics, barge-in
VAD “Voice activity detection” Detects when user is speaking
Semantic “Smart end-of-turn” Model-based decision that the user is done
turn
detection
MultimodalAg“eDnitrect audio agent” Audio in, audio out; no text in the middle
VoicePipelineA“Cgeansct ade agent” STT + LLM + TTS; text-level control
Further Reading
• Pipecat docs — frame-based pipeline, processors, transports
AIENGINEERINGFROMSCRATCH.COM 336

VOICE AGENTS: PIPECAT AND LIVEKIT
• LiveKit Agents docs — WebRTC + voice primitives
• Vapi — managed voice platform
• Retell AI — managed voice, latency-benchmarked
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/14-agent-engineering/22-voice-agents-pipecat-livekit
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/14-agent-engineering/22-voice-agents-pipecat-livekit/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/14-agent-engineering/22-voice-agents-pipecat-livekit
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 337