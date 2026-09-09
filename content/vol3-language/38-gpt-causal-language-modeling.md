---
title: "GPT — Causal Language Modeling"
volume: "vol3-language"
part: "Part II — Transformers Deep Dive"
chapter_number: 38
source_pages: "211-216"
---

# GPT — Causal Language Modeling

GPT — Causal Language Modeling
BERT sees both sides. GPT sees only the past. The triangle mask is the most con-
sequential single line of code in modern AI.
Type: Build Languages: Python Prerequisites: Phase 7 · 02 (Self-Attention), Phase 7 · 05
(Full Transformer), Phase 7 · 06 (BERT) Time: ~75 minutes
The Problem
A language model answers one question: given the first t-1 tokens, what is the probability
distribution over token t? Train on that signal — next-token prediction — and you get a model
that can generate arbitrary text one token at a time.
To train it end-to-end on a whole sequence in parallel, you need each position’s prediction
to depend only on earlier positions. Otherwise the model trivially cheats by looking at the
answer.
The causal mask does this. It is a single upper-triangular matrix of -inf values added to
attention scores before softmax. After softmax, those positions become 0. Each position
can attend only to itself and earlier positions. And because you apply it once to the whole
sequence, you get N parallel next-token predictions in one forward pass.
GPT-1 (2018), GPT-2 (2019), GPT-3 (2020), GPT-4 (2023), GPT-5 (2025), Claude, Llama, Qwen,
Mistral, DeepSeek, Kimi — they are all decoder-only causal transformers with the same core
loop. What separates them is data quality, scale and architectural refinements, and post-
training (SFT, RLHF, DPO, and their successors).
The Concept
The mask
Given a sequence of length N, build an N × N matrix:
M[i, j] = 0 if j <= i
M[i, j] = -inf if j > i
Add M to the raw attention scores before softmax. exp(-inf) = 0, so masked positions con-
tribute zero weight. Each row of the attention matrix is a probability distribution over previ-
ous positions only.
Implementation cost: one torch.tril() call. Time to compute: nanoseconds. Impact on the
field: everything.
Where the triangle comes from
The mask is usually presented as a patch bolted onto attention. Run the derivation in the
other direction and it stops being mysterious: attention is the third refinement of a prefix
average, and the triangle is the loop bounds of that average, written as a matrix.
AIENGINEERINGFROMSCRATCH.COM 208

GPT — CAUSAL LANGUAGE MODELING
causal mask — one triangle, half a decade of progress
unmasked (BERT-style) causal (GPT-style)
every position sees every position position i attends to positions ≤ i only
fits encoders (classification, embeddings) fits decoders (GPT, Llama, Claude)
what the mask enables
training full N-token forward pass, N parallel next-token losses in one batch
inference autoregressive: feed tokens 1..t, generate t+1, repeat. KV cache (lesson 12) avoids re-computation
loss cross-entropy shift-by-one: predict t_{i+1} from t_{0..i}
the mask is added before softmax; exp(-inf) = 0; masked positions get zero weight.
Figure 26: Causal mask creates a triangular attention matrix
Stage 1 — prefix average. The dumbest causal summary of a sequence: position i becomes
the mean of positions 0…i. As a loop, that is out[i] = X[:i+1].mean(0). The same computation
is one matrix multiply. Take a lower-triangular matrix of ones, divide each row by its count,
multiply:
import numpy as np
A = np.tril(np.ones((n, n)))
A = A / A.sum(axis=1, keepdims=True)
out = A @ X
Row i of A is [1/(i+1), …, 1/(i+1), 0, …, 0]. The zeros above the diagonal are the causality.
Nothing about the future was masked out; the future was never in the sum.
Stage 2 — learned weights. A uniform average treats every past token as equally rele-
vant. Replace the ones with a learned score matrix S. Now rows no longer sum to one by
construction, so normalize each row with softmax instead of dividing by the count. Softmax
never outputs an exact zero, which breaks causality — unless the future scores go in as -inf,
because exp(-inf) = 0:
def softmax(x, axis):
e = np.exp(x - np.max(x, axis=axis, keepdims=True))
return e / e.sum(axis=axis, keepdims=True)
S = S + np.triu(np.full((n, n), -np.inf), k=1)
A = softmax(S, axis=1)
out = A @ X
Same triangle, same row-stochastic matrix, same one matmul. The -inf mask is not new
machinery. It is stage 1’s zero entries, translated into softmax’s input domain.
AIENGINEERINGFROMSCRATCH.COM 209

GPT — CAUSAL LANGUAGE MODELING
Stage 3 — content-dependent weights. In stage 2, S is fixed after training: position 7
always weighs position 3 the same, whatever the tokens say. Let the scores depend on the
tokens themselves: S = Q @ K.T / sqrt(d_k). Nothing else changes. Mask, softmax, matmul
— identical.
Three stages, one invariant: a lower-triangular row-stochastic matrix times the sequence.
Uniform average, learned static weights, content-dependent weights. The mask was never
added to attention. It survived from the average.
Interactive figure: mask-derivation. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/07-
transformers-deep-dive/07-gpt-causal-language-modeling
Parallel training, serial inference
Training: forward-pass the whole (N, d_model) sequence once, compute N cross-entropy
losses (one per position), sum, backprop. Parallel along the sequence. This is why GPT train-
ing scales — you process 1M tokens in a batch in one GPU pass.
Inference: you generate token by token. Feed [t1, t2, t3], get t4. Feed [t1, t2, t3,
t4], get t5. Feed [t1, t2, t3, t4, t5], get t6. The KV cache (Lesson 12) saves the hidden
states of t1…tn so you don’t recompute them each step. But serial depth at inference = output
length. That is the autoregressive tax and why decoding is the latency bottleneck of every
LLM.
The loss — shift-by-one
Given tokens [t1, t2, t3, t4]:
• Input: [t1, t2, t3]
• Targets: [t2, t3, t4]
For every position i, compute -log P(target_i | inputs[:i+1]). Sum. This is the cross-
entropy for the whole sequence.
Every transformer LM you’ve heard of trains on this loss. Pre-training, fine-tuning, SFT —
same loss, different data.
Decoding strategies
After training, sampling choices matter more than people think.
Method What it does When to use
Greedy Argmax every step Deterministic tasks, code
completion
Temperature Divide logits by T, sample Creative tasks, higher T = more
diversity
Top-k Sample from top-k tokens only Kills low-probability tails
Top-p (nucleus) Sample from smallest set with 2020+ default; adapts to
cumulative prob ≥ p distribution shape
Min-p Keep tokens with p > min_p * 2024+; better at rejecting long
max_p tails than top-p
Speculative Draft model proposes N tokens, 2–3× latency reduction at same
decoding big model verifies quality
AIENGINEERINGFROMSCRATCH.COM 210

GPT — CAUSAL LANGUAGE MODELING
In 2026, min-p + temperature 0.7 is a reasonable default for open-weights models. Specula-
tive decoding is table stakes for any production inference stack.
What made the “GPT recipe” work
1. Decoder-only. No encoder overhead. One pass of attention + FFN per layer.
2. Scaling. 124M → 1.5B → 175B → trillions. Chinchilla scaling laws (Lesson 13) tell you
how to spend compute.
3. In-context learning. Emerged around 6B–13B. The model can follow few-shot exam-
ples without fine-tuning.
4. RLHF. Post-training on human preferences converted raw pretrained text into chat as-
sistants.
5. Pre-norm + RoPE + SwiGLU. Stable training at scale.
The core architecture hasn’t changed much since GPT-2. Everything interesting has happened
in data, scale, and post-training.
Interactive figure: causal-mask. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/07-
transformers-deep-dive/07-gpt-causal-language-modeling
Build It
Step 1: the causal mask
See code/main.py. A one-liner:
def causal_mask(n):
return [[0.0 if j <= i else float("-inf") for j in range(n)] for i in range(n)]
Add it to attention scores before softmax. That’s the entire mechanism.
Step 2: a 2-layer GPT-ish model
Stack two decoder blocks (masked self-attention + FFN, no cross-attention). Add a token
embedding, a positional encoding, and an unembedding (tied to the token embedding matrix
— a standard trick since GPT-2).
Step 3: next-token prediction, end-to-end
On a 20-token toy vocab, produce logits at every position. Compute cross-entropy loss against
the shift-by-one target. No gradient — this is a forward-pass sanity check.
Step 4: sampling
Implement greedy, temperature, top-k, top-p, min-p. Run each on a fixed prompt and compare
outputs. A sampling function is 10 lines.
Use It
PyTorch, 2026 idiom:
AIENGINEERINGFROMSCRATCH.COM 211

GPT — CAUSAL LANGUAGE MODELING
from transformers import AutoModelForCausalLM, AutoTokenizer
model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3.2-3B-Instruct")
tok = AutoTokenizer.from_pretrained("meta-llama/Llama-3.2-3B-Instruct")
prompt = "Attention is all you need because"
inputs = tok(prompt, return_tensors="pt")
out = model.generate(
**inputs,
max_new_tokens=64,
temperature=0.7,
top_p=0.9,
do_sample=True,
)
print(tok.decode(out[0]))
Under the hood, generate() runs the forward pass, pulls the final-position logits, samples the
next token, appends it, and repeats. Every production LLM inference stack (vLLM, TensorRT-
LLM, llama.cpp, Ollama, MLX) implements the same loop with heavy optimization — batched
prefill, continuous batching, KV cache paging, speculative decoding.
GPT vs BERT, one line each: GPT predicts P(x_t | x_{<t}). BERT predicts P(x_masked |
x_unmasked). The loss determines whether the model can generate.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/07-transformers-deep-dive/07-gpt-causal-
language-modeling
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/07-transformers-deep-dive/07-gpt-causal-
language-modeling/code
1. Easy. Run code/main.py and verify the causal attention matrix is lower-triangular after
softmax. Spot-check: row 3 should have weights only in columns 0–3.
2. Medium. Implement beam search for width 4. Compare perplexity of beam-4 vs greedy
on 10 short prompts. Does beam always win? (Hint: usually for translation, not for
open-ended chat.)
3. Hard. Implement speculative decoding: use a tiny 2-layer model as the draft and a 6-
layer model as the verifier. Measure wall-clock speedup on 100 completions of length
64. Confirm outputs match greedy of the verifier.
Key Terms
Term What people say What it actually means
Causal “The triangle” Upper-triangular -inf matrix added to
mask attention scores so position i only sees
positions ≤ i.
Next-token “The loss” Cross-entropy of the model’s distribution
prediction against the true next token at every
position.
AIENGINEERINGFROMSCRATCH.COM 212

GPT — CAUSAL LANGUAGE MODELING
Term What people say What it actually means
Autoregressiv“eGenerate one at a time” Feed output back as input; parallelism only
during training, not during generation.
Logits “Pre-softmax scores” Raw output of the LM head before softmax;
sampling happens on these.
Temperature “Creativity knob” Divide logits by T; T→0 = greedy, T→∞ =
uniform.
Top-p “Nucleus sampling” Truncate distribution to smallest set
summing to ≥p; sample from what remains.
Min-p “Better than top-p” Keep tokens where p ≥ min_p × max_p;
adapts cutoff to sharpness of distribution.
Speculative “Draft + verify” Cheap model proposes N tokens; big model
decoding verifies in parallel.
Teacher “Training trick” During training, feed the true previous
forcing token, not the model’s prediction. Standard
for every seq2seq LM.
Further Reading
• Radford et al. (2018). Improving Language Understanding by Generative Pre-Training
— GPT-1.
• Radford et al. (2019). Language Models are Unsupervised Multitask Learners — GPT-2.
• Brown et al. (2020). Language Models are Few-Shot Learners — GPT-3 and in-context
learning.
• Leviathan, Kalman, Matias (2023). Fast Inference from Transformers via Speculative
Decoding — spec decoding paper.
• HuggingFace modeling_llama.py — canonical causal-LM reference code.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/07-transformers-deep-dive/07-gpt-causal-language-modeling
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/07-transformers-deep-dive/07-gpt-causal-language-modeling/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 213