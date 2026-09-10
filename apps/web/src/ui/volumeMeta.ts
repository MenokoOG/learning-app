/**
 * Presentation-only metadata for the six volumes: the short sidebar name and the
 * one-line blurb shown on the home page. Not served by the API, so it lives here.
 */
const BLURBS: Record<string, string> = {
  "vol1-foundations":
    "Environment, git, GPUs, linear algebra, calculus, probability and classical ML.",
  "vol2-deep-learning":
    "Backprop from scratch, PyTorch and JAX, CNNs, diffusion, speech and audio.",
  "vol3-language":
    "Tokenization, embeddings, attention, and the full transformer built by hand.",
  "vol4-llms": "Generative models, RL, pretraining and the engineering around LLMs.",
  "vol5-agents": "Multimodal models, tool protocols, autonomy and multi-agent systems.",
  "vol6-production": "Serving infrastructure, evaluation, safety, and end-to-end capstones.",
};

export function volumeBlurb(id: string): string {
  return BLURBS[id] ?? "";
}

/** "Language: NLP Foundations…" → "LANGUAGE" */
export function volumeShortName(title: string): string {
  return title.split(":")[0].trim().toUpperCase();
}

/** "vol3-language" → "03"; falls back to the 1-based index when the id is unexpected. */
export function volumeNumber(id: string, index: number): string {
  const match = /^vol(\d+)/.exec(id);
  const n = match ? Number(match[1]) : index + 1;
  return pad(n);
}

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}
