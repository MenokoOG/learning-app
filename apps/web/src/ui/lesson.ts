/**
 * Splits a chapter's markdown into the three pieces the lesson layout shows:
 * the epigraph pull quote, the metadata chips, and the body that still goes
 * through react-markdown untouched.
 *
 * The source is PDF-extracted text, so the parse is deliberately forgiving:
 * anything it can't recognise falls through into the body.
 */
export interface ParsedLesson {
  epigraph: string | null;
  chips: string[];
  body: string;
}

/** How far into the chapter we'll look for the "Type: … Time: …" metadata line. */
const META_SEARCH_LINES = 12;

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function collectChips(meta: string): string[] {
  const chips: string[] = [];
  const type = /Type:\s*([^:]*?)(?=\s+(?:Languages?|Prerequisites?|Time):|$)/i.exec(meta);
  const langs = /Languages?:\s*([^:]*?)(?=\s+(?:Type|Prerequisites?|Time):|$)/i.exec(meta);
  const time = /Time:\s*([^:]*?)(?=\s+(?:Type|Languages?|Prerequisites?):|$)/i.exec(meta);
  if (type) chips.push(type[1].trim());
  if (langs) chips.push(langs[1].trim());
  if (time) chips.push(time[1].trim());
  return chips.filter(Boolean);
}

export function parseLesson(content: string, title: string): ParsedLesson {
  const lines = content.split("\n");

  // Drop the leading H1 — the chapter hero already carries the title.
  let start = 0;
  while (start < lines.length && lines[start].trim() === "") start += 1;
  if (start < lines.length && /^#\s+/.test(lines[start])) start += 1;

  const metaStart = lines.findIndex(
    (line, i) => i >= start && i < start + META_SEARCH_LINES && /^\s*Type:\s/i.test(line),
  );

  if (metaStart === -1) {
    return { epigraph: null, chips: [], body: lines.slice(start).join("\n").trim() };
  }

  // The metadata run wraps across lines; it ends on the line carrying "Time:".
  let metaEnd = metaStart;
  while (metaEnd < lines.length && metaEnd < metaStart + 3 && !/Time:/i.test(lines[metaEnd])) {
    metaEnd += 1;
  }

  const meta = lines.slice(metaStart, metaEnd + 1).join(" ");

  // Between the H1 and the metadata sits a re-printed title followed by the epigraph.
  let intro = lines.slice(start, metaStart).join(" ").replace(/\s+/g, " ").trim();
  const normalizedTitle = normalize(title);
  if (normalize(intro).startsWith(normalizedTitle)) {
    intro = intro.slice(title.length).trim();
    // The re-printed title can differ in whitespace, so re-trim word by word.
    intro = intro.replace(/^[\s—·-]+/, "");
  }

  return {
    epigraph: intro.length > 8 ? intro : null,
    chips: collectChips(meta),
    body: lines
      .slice(metaEnd + 1)
      .join("\n")
      .trim(),
  };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export interface Heading {
  id: string;
  text: string;
  level: number;
}

/**
 * Pulls ## / ### headings out of the body for the "On this page" rail. Ids are a
 * plain slug of the heading text so the rendered heading can derive the same id
 * from its own children without sharing counter state.
 */
export function extractHeadings(body: string): Heading[] {
  const headings: Heading[] = [];
  let inFence = false;
  for (const line of body.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    const text = match[2].replace(/[*_`]/g, "").trim();
    headings.push({ id: slugify(text), text, level: match[1].length });
  }
  return headings;
}
