import pdfplumber, re, json, os, sys

# Paths are relative to this script's location: scripts/ sits inside learning-app/,
# which sits inside the ai-from-scratch folder alongside the 6 source PDFs.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCE_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))  # ai-from-scratch/
OUT = os.path.join(SCRIPT_DIR, "..", "content")  # learning-app/content

VOLS = [
    {"id": "vol1-foundations", "title": "Foundations: Math, Tooling, and Classical Machine Learning", "path": os.path.join(SOURCE_DIR, "aiefs-vol1-foundations.pdf"), "phases": "00, 01, 02"},
    {"id": "vol2-deep-learning", "title": "Deep Learning: Networks, Vision, and Speech", "path": os.path.join(SOURCE_DIR, "aiefs-vol2-deep-learning.pdf"), "phases": "03, 04, 06"},
    {"id": "vol3-language", "title": "Language: NLP Foundations and the Transformer", "path": os.path.join(SOURCE_DIR, "aiefs-vol3-language.pdf"), "phases": "05, 07"},
    {"id": "vol4-llms", "title": "Large Language Models: Generation, Reinforcement, Pretraining, and Engineering", "path": os.path.join(SOURCE_DIR, "aiefs-vol4-llms.pdf"), "phases": "08, 09, 10, 11"},
    {"id": "vol5-agents", "title": "Agents: Multimodality, Protocols, Autonomy, and Swarms", "path": os.path.join(SOURCE_DIR, "aiefs-vol5-agents.pdf"), "phases": "12, 13, 14, 15, 16"},
    {"id": "vol6-production", "title": "Production: Infrastructure, Safety, and Capstones", "path": os.path.join(SOURCE_DIR, "aiefs-vol6-production.pdf"), "phases": "17, 18, 19"},
]

def slugify(s):
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"-+", "-", s).strip("-")

TOC_LINE = re.compile(r"^(.*?)\s+(\d{1,4})$")

def parse_toc(pdf, about_idx):
    entries = []  # (kind, title, page_num)
    for i in range(1, about_idx):
        text = pdf.pages[i].extract_text(x_tolerance=1.5) or ""
        for line in text.split("\n"):
            line = line.strip()
            if not line or line.upper() == "CONTENTS" or line == "Contents":
                continue
            if "AIENGINEERINGFROMSCRATCH.COM" in line.upper():
                continue
            m = TOC_LINE.match(line)
            if not m:
                continue
            title, num = m.group(1).strip(), int(m.group(2))
            if not title:
                continue
            kind = "part" if title.lower().startswith("part ") else "chapter"
            entries.append({"kind": kind, "title": title, "page": num})
    return entries

def build_volume(vol):
    with pdfplumber.open(vol["path"]) as pdf:
        n = len(pdf.pages)
        about_idx = None
        for i in range(min(10, n)):
            t = pdf.pages[i].extract_text(x_tolerance=1.5) or ""
            if t.strip().startswith("About This Volume"):
                about_idx = i
                break
        offset = about_idx - 1  # printed page 1 -> pdf index about_idx
        entries = parse_toc(pdf, about_idx)

        # attach pdf start index to each entry
        for e in entries:
            e["pdf_index"] = e["page"] + offset

        # compute end index = next entry's pdf_index - 1, last chapter -> n-1
        chapters = []
        current_part = None
        for idx, e in enumerate(entries):
            if e["kind"] == "part":
                current_part = e["title"]
                continue
            start = e["pdf_index"]
            end = n - 1
            for e2 in entries[idx+1:]:
                end = e2["pdf_index"] - 1
                break
            if end < start:
                end = start
            chapters.append({
                "title": e["title"],
                "part": current_part,
                "start": start,
                "end": end,
            })

        # extract full text for whole pdf once
        all_pages_text = [p.extract_text(x_tolerance=1.5) or "" for p in pdf.pages]

    # dedupe / sanity: clamp indices to valid range
    for c in chapters:
        c["start"] = max(0, min(c["start"], n - 1))
        c["end"] = max(c["start"], min(c["end"], n - 1))

    vol_dir = os.path.join(OUT, vol["id"])
    os.makedirs(vol_dir, exist_ok=True)

    manifest_chapters = []
    for i, c in enumerate(chapters, start=1):
        body = "\n\n".join(all_pages_text[c["start"]:c["end"]+1])
        slug = f"{i:02d}-{slugify(c['title'])}"
        fname = f"{slug}.md"
        fpath = os.path.join(vol_dir, fname)
        front = (
            f"---\n"
            f"title: \"{c['title']}\"\n"
            f"volume: \"{vol['id']}\"\n"
            f"part: \"{c['part'] or ''}\"\n"
            f"chapter_number: {i}\n"
            f"source_pages: \"{c['start']+1}-{c['end']+1}\"\n"
            f"---\n\n"
            f"# {c['title']}\n\n"
        )
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(front + body)
        manifest_chapters.append({
            "id": slug,
            "title": c["title"],
            "part": c["part"],
            "chapter_number": i,
            "file": f"{vol['id']}/{fname}",
            "word_count": len(body.split()),
        })

    manifest = {
        "id": vol["id"],
        "title": vol["title"],
        "phases": vol["phases"],
        "chapter_count": len(manifest_chapters),
        "chapters": manifest_chapters,
    }
    with open(os.path.join(vol_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(vol["id"], "pages=", n, "toc_entries=", len(entries), "chapters=", len(chapters))
    return manifest

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    all_manifests = []
    for vol in VOLS:
        m = build_volume(vol)
        all_manifests.append({
            "id": m["id"], "title": m["title"], "phases": m["phases"],
            "chapter_count": m["chapter_count"], "manifest": f"{m['id']}/manifest.json"
        })
    with open(os.path.join(OUT, "course-manifest.json"), "w", encoding="utf-8") as f:
        json.dump({"course": "AI Engineering From Scratch", "volumes": all_manifests}, f, indent=2)
