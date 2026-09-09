---
title: "Document and Diagram Understanding"
volume: "vol5-agents"
part: "Part I — Multimodal AI"
chapter_number: 24
source_pages: "112-116"
---

# Document and Diagram Understanding

Document and Diagram Understanding
Documents are not photos. A PDF, scientific paper, invoice, or handwritten form
has layout, tables, diagrams, footnotes, headers, and semantic structure that plain
image understanding cannot capture. The pre-VLM stack was a pipeline: Tesseract
OCR + LayoutLMv3 + table-extraction heuristics. The VLM wave replaced that
with OCR-free models — Donut (2022), Nougat (2023), DocLLM (2023) — that emit
structured markup directly. By 2026 the frontier is just “feed the page image to
Claude Opus 4.7 at 2576px native,” and the structured-markup output comes for
free. This lesson reads the three-era arc of document AI.
Type: Build Languages: Python (stdlib, layout-aware document parser skeleton) Prerequi-
sites: Phase 12 · 05 (LLaVA), Phase 5 (NLP) Time: ~180 minutes
Learning Objectives
• Explain the three eras of document AI: OCR pipeline, OCR-free, VLM-native.
• Describe LayoutLMv3’s three input streams: text, layout (bbox), image patches, with
unified masking.
• Compare Donut (OCR-free, image → markup), Nougat (scientific paper → LaTeX), Do-
cLLM (layout-aware generative), PaliGemma 2 (VLM-native).
• Pick a document model for a new task (invoices, scientific papers, handwritten forms,
Chinese receipts).
The Problem
“Understand this PDF” is deceptively hard. The information sits in:
• Text content (90% of the signal).
• Layout (headers, footnotes, sidebars, two-column format).
• Tables (rows, columns, merged cells).
• Figures and diagrams.
• Handwritten annotations.
• Fonts and typography (title vs body).
Raw OCR dumps the text and loses the rest. A system that cares about invoices needs to
know “Total: $1,245” came from the bottom-right, not from a footnote.
The Concept
Era 1 — OCR pipeline (pre-2021)
The classic stack:
1. PDF → image per page.
2. Tesseract (or commercial OCR) extracts text with per-word bounding boxes.
3. Layout analyzer identifies blocks (header, table, paragraph).
AIENGINEERINGFROMSCRATCH.COM 106

DOCUMENT AND DIAGRAM UNDERSTANDING
4. Table structure recognizer parses tables.
5. Domain rules + regex extract fields.
Works for clean printed text. Breaks on handwriting, skewed scans, complex tables, non-
English scripts. Every failure mode requires a custom exception path.
TrOCR (2021)
TrOCR (Li et al., arXiv:2109.10282) replaced Tesseract’s classic CNN-CTC with a transformer
encoder-decoder trained on synthetic + real text images. Clean win on handwritten and mul-
tilingual text. Still a pipeline (detector then TrOCR then layout), but the OCR step improved
dramatically.
Era 2 — OCR-free (2022-2023)
The first OCR-free models said: skip detection entirely, map image pixels to structured output
directly.
Donut (Kim et al., arXiv:2111.15664): - Encoder-decoder transformer, encoder is Swin-B. -
Output is JSON for form understanding, markdown for summarization, or any task-specific
schema. - No OCR, no layout, no detection.
Nougat (Blecher et al., arXiv:2308.13418): - Trained specifically on scientific papers. - Output
is LaTeX / markdown. - Handles equations, multi-column layout, figures. - The model every
arXiv-parser calls.
These are specialists, not generalists. Donut on a scientific paper fails; Nougat on an invoice
fails.
LayoutLMv3 (2022)
A different track. LayoutLMv3 (Huang et al., arXiv:2204.08387) keeps OCR but adds layout
understanding:
• Three input streams: OCR text tokens, per-token 2D bounding boxes, image patches.
• Masked training objective across all three modalities (masked text, masked patches,
masked layout).
• Downstream: classification, entity extraction, table QA.
LayoutLMv3 is the peak of OCR-based document understanding. Strong on forms and in-
voices. Requires OCR upstream. Best pre-VLM accuracy on standardized document bench-
marks.
DocLLM (2023)
DocLLM (Wang et al., arXiv:2401.00908) is LayoutLM’s generative sibling. Generates free-
form answers conditioned on layout tokens. Better for QA on documents; still depends on
OCR input.
Era 3 — VLM-native (2024+)
2024 VLMs became good enough to replace the pipeline entirely. Feed the full page image at
high resolution to a VLM, ask the question, get an answer.
• LLaVA-NeXT 336-tile AnyRes works for small documents.
• Qwen2.5-VL dynamic-resolution handles 2048+ pixels natively.
AIENGINEERINGFROMSCRATCH.COM 107

DOCUMENT AND DIAGRAM UNDERSTANDING
• Claude Opus 4.7 supports 2576px documents.
• PaliGemma 2 (April 2025) trains specifically for documents + handwriting.
The gap between VLM-native and OCR-pipeline closed rapidly. By 2026, VLM-native wins on:
• Scene text (hand-written + printed, mixed scripts).
• Complex tables with merged cells.
• Math equations embedded in text.
• Figures with text annotations.
OCR pipelines still win on:
• Pure-scan workloads at massive scale where per-page latency matters.
• Pipeline reliability (deterministic failures vs VLM hallucinations).
• Regulated environments requiring auditable OCR output.
The Claude 4.7 / GPT-5 frontier
At 2576-pixel native input, frontier VLMs do document understanding at near-human accuracy.
The benchmark numbers from early 2026:
• DocVQA: Claude 4.7 ~95.1, PaliGemma 2 ~88.4, Nougat ~77.3, pipelined LayoutLMv3
~83.
• ChartQA: Claude 4.7 ~92.2, GPT-4V ~78.
• VisualMRC: Claude 4.7 ~94.
The closed-model gap is mostly resolution and base-LLM scale. Open models at 7B are a few
points behind but catching up.
Math equations and LaTeX output
Scientific papers need exact LaTeX output for equations. Nougat was trained on this. VLMs
trained with LaTeX targets (Qwen2.5-VL-Math, Nougat derivatives) produce usable LaTeX.
Without explicit LaTeX training, VLMs produce readable but imprecise transcriptions.
For scientific-paper pipelines in 2026: chain Nougat on the PDF, then a VLM on tricky pages.
Handwriting
Still the hardest sub-task. Mixed printed + handwritten (doctors’ notes, filled forms) is where
OCR pipelines still beat VLMs for cost. Handwritten-only VLMs are improving (Claude 4.7,
PaliGemma 2).
2026 recipe
For a new document-AI project:
• Pure-printed invoices at scale: LayoutLMv3 + rules, cost-efficient.
• Mixed documents (scientific + handwritten + forms): VLM-native (PaliGemma 2 or
Qwen2.5-VL).
• Full arXiv ingestion: Nougat for math, VLM for figures.
• Regulatory: OCR pipeline + VLM validator for cross-check.
Interactive figure: mm-doc-layout. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/12-
multimodal-ai/22-document-diagram-understanding
AIENGINEERINGFROMSCRATCH.COM 108

DOCUMENT AND DIAGRAM UNDERSTANDING
Use It
code/main.py:
• A toy layout-aware tokenizer: given (text, bbox) pairs, produces the LayoutLMv3-style
input.
• A Donut-style task schema generator: JSON template for forms.
• A comparison of token budgets per page across OCR-pipeline, Donut, Nougat, and VLM-
native.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/12-multimodal-ai/22-document-diagram-
understanding
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/12-multimodal-ai/22-document-diagram-
understanding/code
1. Your project is 10M invoices per day. Which stack minimizes cost-per-page without losing
accuracy?
2. Why does LayoutLMv3 outperform pure-CLIP-VLMs on form QA but underperform at
scene-text? What does the bbox stream give up?
3. Nougat generates LaTeX. Propose a test case where VLM-native output beats Nougat on
LaTeX fidelity, and a case where Nougat wins.
4. Read PaliGemma 2 paper (Google, 2024). What was the key training-data addition that
lifted document accuracy vs PaliGemma 1?
5. Design a regulatory-safe hybrid: OCR pipeline as primary, VLM as secondary cross-check.
How do you resolve disagreement?
Key Terms
Term What people say What it actually means
OCR “Tesseract-style” Stage-wise stack: detect -> OCR -> layout
pipeline -> rules; deterministic, fragile
OCR-free “Donut-style” Image-to-output transformer that skips
explicit OCR; single model
Layout- “LayoutLM” Input includes per-token bbox coordinates;
aware unified masking across modalities
VLM- “Frontier VLM” Feed page image directly to
native Claude/GPT/Qwen VLM at high resolution;
no pipeline
DocVQA “Doc benchmark” Document VQA standard; most-cited score
Markup “LaTeX / MD” Structured output format instead of
output free-form text; enables downstream
automation
AIENGINEERINGFROMSCRATCH.COM 109

DOCUMENT AND DIAGRAM UNDERSTANDING
Further Reading
• Li et al. — TrOCR (arXiv:2109.10282)
• Blecher et al. — Nougat (arXiv:2308.13418)
• Huang et al. — LayoutLMv3 (arXiv:2204.08387)
• Kim et al. — Donut (arXiv:2111.15664)
• Wang et al. — DocLLM (arXiv:2401.00908)
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/12-multimodal-ai/22-document-diagram-understanding
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/12-multimodal-ai/22-document-diagram-understanding/code
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 110