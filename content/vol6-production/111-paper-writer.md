---
title: "Paper Writer"
volume: "vol6-production"
part: "Part III — Capstone Projects"
chapter_number: 111
source_pages: "473-475"
---

# Paper Writer

Paper Writer
A LaTeX skeleton is a contract between the researcher and the typesetter. If the
contract is broken the document does not compile, and the failure is loud. Build the
skeleton first, then fill it.
Type: Build Languages: Python Prerequisites: Phase 19 lessons 50-53 Time: ~90 minutes
Learning Objectives
• Treat a research paper as a structured artifact with a known section graph, not a freeform
document.
• Generate a LaTeX skeleton that declares its abstract, sections, figure slots, and bibliog-
raphy keys before any prose is written.
• Inject figures from experiment outputs (paths and captions) into the skeleton through a
deterministic slot mechanism.
• Wire a mocked prose generator that fills each section from a structured outline so the
harness is testable without a model.
• Emit a single paper.tex plus a references.bib plus a manifest that lists every figure
referenced and every citation used.
Interactive figure: ch-paper-skeleton. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/19-capstone-projects/54-paper-writer
Why a skeleton first
A draft that starts as prose accumulates structural debt. The introduction grows three para-
graphs that should be in related work. A figure gets referenced before it is defined. The
bibliography ends up with three keys for the same paper. By the time the author notices, the
rewriting cost is higher than the writing cost.
A skeleton inverts that. The structure is declared up front as data. Sections are slots with
names and order. Figures are slots with ids and captions. Bibliography keys are declared at
the top with the entries they point at. Prose is generated into those slots one at a time. The
harness can validate, before any prose is written, that every figure has a slot, every citation
has an entry, and every section appears in the table of contents.
This is the same discipline that earlier lessons applied to plans, tool calls, and traces. The
structure is the contract.
The Paper shape
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/19-capstone-projects/54-paper-writer
AIENGINEERINGFROMSCRATCH.COM 466

PAPER WRITER
Every field is plain Python data. The renderer is a pure function from Paper to a LaTeX string.
The harness can introspect the paper before rendering: count sections, list missing figure
files, check that every \cite{key} has a matching BibEntry.
The render contract
The renderer guarantees three properties. First, every figure slot in the skeleton emits a
\begin{figure} block with a stable label of the form fig:<id>. Second, every section emits
a \section{} with a stable label of the form sec:<id> so cross-references work. Third, the
bibliography emits a \bibliography block whose references.bib contains exactly the entries
declared on the paper, no more and no fewer.
Violating any of these is a render error, not a warning. The skeleton is the contract; a render
that silently drops a figure is a contract break.
Figure injection from experiments
The earlier lessons in this track produced experiment outputs as JSON manifests. Each man-
ifest carries a list of artifacts with paths and short captions. The paper writer reads that
manifest and produces Figure records.
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/19-capstone-projects/54-paper-writer
The injection is deterministic. Figure ids are derived from the experiment name plus a mono-
tonic counter. Captions come from the manifest. Paths are normalised relative to the paper’s
output directory so the LaTeX compiles even when the experiment outputs sit elsewhere on
disk.
The mocked prose generator
The lesson does not call a model. A MockProseGenerator reads an outline shape and emits
prose deterministically. The outline shape is one short string per section. The generator
expands that string into two short paragraphs with the section title woven in. The generated
prose name-drops figures and citations exactly when the outline declares them.
This is enough to test every behaviour of the writer. A real implementation would swap the
generator for a model call. The harness around it does not change. That is the value of
declaring the prose generator as a callable: the test substitutes a deterministic one, produc-
tion substitutes a model one, the rest of the pipeline is identical.
The manifest output
The writer emits three files into the output directory.
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/19-capstone-projects/54-paper-writer
The manifest is what a downstream evaluator or critic loop reads. It does not parse LaTeX; it
reads the manifest. The next lesson, the critic loop, takes this manifest as input and produces
a feedback list. That is why the manifest is part of the contract and the LaTeX is not.
AIENGINEERINGFROMSCRATCH.COM 467

PAPER WRITER
Validation gates
The writer runs four gates before writing any file.
1. Every figure id is unique within the paper.
2. Every section’s cites field references a bibliography key that is declared on the paper.
3. The abstract is non-empty.
4. The title is non-empty.
A failed gate raises PaperValidationError with a precise reason. The harness surfaces the
reason as the failure mode. There is no partial write: either all three files are emitted, or
none.
How to read the code
code/main.py defines Paper, Section, Figure, BibEntry, PaperValidationError, Mock-
ProseGenerator, PaperWriter, and a render_latex function. The write method takes
an output directory and emits paper.tex, references.bib, and manifest.json. The
read_experiment_manifest helper converts a list of experiment manifests into Figure
records.
code/tests/test_paper_writer.py covers: skeleton render with no sections, full render with
two sections and two figures, missing-citation gate, duplicate-figure-id gate, manifest con-
tent, and the LaTeX-string contract (every section emits a \section{}, every figure emits a
\begin{figure}).
Going further
Two extensions a real implementation will want. First, multi-format render: the same Paper
shape compiles to Markdown for blog posts and HTML for previews. The renderer becomes
a strategy on Paper. Second, citation enrichment: the writer fetches BibTeX entries from a
citation key, given a local cache of DOIs. Both add value, both can be added without touching
the skeleton contract.
The skeleton is the bet. Sections, figures, and citations declared as data, prose generated
into slots, manifest emitted alongside the LaTeX. Every other improvement composes on top.
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/19-capstone-projects/54-paper-writer
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/19-capstone-projects/54-paper-writer/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/19-capstone-projects/54-paper-writer
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 468