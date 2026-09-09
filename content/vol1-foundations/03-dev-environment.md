---
title: "Dev Environment"
volume: "vol1-foundations"
part: "Part I — Setup & Tooling"
chapter_number: 3
source_pages: "8-11"
---

# Dev Environment

Dev Environment
Your tools shape your thinking. Set them up once, set them up right.
Type: Build Languages: Python, Node.js, Rust Prerequisites: None Time: ~45 minutes
Learning Objectives
• Set up Python 3.11+, Node.js 20+, and Rust toolchains from scratch
• Configure virtual environments and package managers for reproducible builds
• Verify GPU access with CUDA/MPS and run a test tensor operation
• Understand the four-layer stack: system, packages, runtimes, AI libraries
The Problem
You’re about to learn AI engineering across 200+ lessons using Python, TypeScript, Rust,
and Julia. If your environment is broken, every single lesson becomes a fight against tooling
instead of learning.
Most people skip environment setup. Then they spend hours debugging import errors, version
conflicts, and missing CUDA drivers. We’re going to do this once, properly.
The Concept
An AI engineering environment has four layers:
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/00-setup-and-tooling/01-dev-environment
We install bottom-up. Each layer depends on the one below it.
Interactive figure: s0-env-stack. This one moves. Watch it animate and drag its controls in
the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/00-setup-
and-tooling/01-dev-environment
Build It
Step 1: System Foundation
Check your system and install the basics.
# macOS
xcode-select --install
brew install git curl wget
# Ubuntu/Debian
AIENGINEERINGFROMSCRATCH.COM 4

DEV ENVIRONMENT
sudo apt update && sudo apt install -y build-essential git curl wget
# Windows (use WSL2)
wsl --install -d Ubuntu-24.04
Step 2: Python with uv
We use uv — it’s 10-100x faster than pip and handles virtual environments automatically.
curl -LsSf https://astral.sh/uv/install.sh | sh
uv python install 3.12
uv venv
source .venv/bin/activate # or .venv\Scripts\activate on Windows
uv pip install numpy matplotlib jupyter
Verify:
import sys
print(f"Python {sys.version}")
import numpy as np
print(f"NumPy {np.__version__}")
a = np.array([1, 2, 3])
print(f"Vector: {a}, dot product with itself: {np.dot(a, a)}")
Step 3: Node.js with pnpm
For TypeScript lessons (agents, MCP servers, web apps).
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 22
fnm use 22
npm install -g pnpm
node -e "console.log('Node', process.version)"
macOS / Apple Silicon (M1/M2/M3/M4): If the installer stops with Error: Cannot install
under Rosetta 2 in ARM default prefix (/opt/homebrew), your terminal is running under
Rosetta 2 (arch prints i386) while Homebrew is a native arm64 build. Install fnm forcing
arm64, wire it into your shell, then rerun the commands above from fnm install 22:
arch -arm64 brew install fnm
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc
source ~/.zshrc
Step 4: Rust
For performance-critical lessons (inference, systems).
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustc --version
cargo --version
AIENGINEERINGFROMSCRATCH.COM 5

DEV ENVIRONMENT
Step 5: Julia (Optional)
For math-heavy lessons where Julia shines.
curl -fsSL https://install.julialang.org | sh
julia -e 'println("Julia ", VERSION)'
Step 6: GPU Setup (If You Have One)
NVIDIA (Linux / Windows):
nvidia-smi
# Install PyTorch with CUDA
uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
macOS / Apple Silicon (M1/M2/M3/M4): There is no CUDA on a Mac — that’s expected,
not a failure. Do not pass --index-url .../cuXXX (those wheels are Linux/Windows only, so
the install fails). Install the plain build, which includes Apple’s MPS (Metal) GPU backend:
uv pip install torch torchvision torchaudio
Verify (works on any platform):
import torch
print(f"CUDA available: {torch.cuda.is_available()}") # False on macOS — expected
print(f"MPS available: {torch.backends.mps.is_available()}") # True on Apple Silicon
if torch.cuda.is_available():
print(f"GPU: {torch.cuda.get_device_name(0)}")
No GPU? No problem. Most lessons work on CPU. For training-heavy lessons, use Google
Colab or cloud GPUs.
Step 7: Verify Everything
Run the verification script:
python phases/00-setup-and-tooling/01-dev-environment/code/verify.py
Use It
Your environment is now ready for every lesson in this course. Here’s what you’ll use where:
Language Used In Package Manager
Python Phases 1-12 (ML, DL, uv
NLP, Vision, Audio,
LLMs)
TypeScript Phases 13-17 (Tools, pnpm
Agents, Swarms,
Infra)
Rust Phases 12, 15-17 cargo
(Performance-critical
systems)
Julia Phase 1 (Math Pkg
foundations)
AIENGINEERINGFROMSCRATCH.COM 6

DEV ENVIRONMENT
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/00-setup-and-tooling/01-dev-environment
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/00-setup-and-tooling/01-dev-environment/code
1. Run the verification script and fix any failures
2. Create a Python virtual environment for this course and install PyTorch
3. Write a “hello world” in all four languages and run each one
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/00-setup-and-tooling/01-dev-environment
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/00-setup-and-tooling/01-dev-environment/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/00-setup-and-tooling/01-dev-environment
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 7