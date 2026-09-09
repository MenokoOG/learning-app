---
title: "Python Environments"
volume: "vol1-foundations"
part: "Part I — Setup & Tooling"
chapter_number: 8
source_pages: "27-31"
---

# Python Environments

Python Environments
Dependency hell is real. Virtual environments are the cure.
Type: Build Languages: Shell Prerequisites: Phase 0, Lesson 01 Time: ~30 minutes
Learning Objectives
• Create isolated virtual environments using uv, venv, or conda
• Write a pyproject.toml with optional dependency groups and generate lockfiles for re-
producibility
• Diagnose and fix common pitfalls: global installs, pip/conda mixing, CUDA version mis-
matches
• Implement a per-phase environment strategy for projects with conflicting dependencies
The Problem
You install PyTorch 2.4 for a fine-tuning project. Next week, a different project needs PyTorch
2.1 because its CUDA build is pinned. You upgrade globally, and the first project breaks. You
downgrade, and the second one breaks.
This is dependency hell. It happens constantly in AI/ML work because:
• PyTorch, JAX, and TensorFlow each ship their own CUDA bindings
• Model libraries pin specific framework versions
• A global pip install overwrites whatever was there before
• CUDA 11.8 builds don’t work with CUDA 12.x drivers (and vice versa)
The fix: every project gets its own isolated environment with its own packages.
The Concept
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/00-setup-and-tooling/06-python-environments
Interactive figure: s0-env-isolation. This one moves. Watch it animate and drag its con-
trols in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/00-
setup-and-tooling/06-python-environments
Build It
Option 1: uv venv (Recommended)
uv is the fastest Python package manager (10-100x faster than pip). It handles virtual envi-
ronments, Python versions, and dependency resolution in one tool.
AIENGINEERINGFROMSCRATCH.COM 23

PYTHON ENVIRONMENTS
curl -LsSf https://astral.sh/uv/install.sh | sh
uv python install 3.12
cd your-project
uv venv
source .venv/bin/activate
Install packages:
uv pip install torch numpy
Create a project with pyproject.toml in one step:
uv init my-ai-project
cd my-ai-project
uv add torch numpy matplotlib
Option 2: venv (Built-in)
If you can’t install uv, Python ships with venv:
python3 -m venv .venv
source .venv/bin/activate # Linux/macOS
.venv\Scripts\activate # Windows
pip install torch numpy
Slower than uv, but works everywhere Python is installed.
Option 3: conda (When You Need It)
Conda manages non-Python dependencies like CUDA toolkits, cuDNN, and C libraries. Use
it when:
• You need a specific CUDA toolkit version without installing it system-wide
• You’re on a shared cluster where you can’t install system packages
• A library’s install instructions say “use conda”
# Install miniconda (not the full Anaconda)
curl -LsSf https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -o miniconda.sh
bash miniconda.sh -b
conda create -n myproject python=3.12
conda activate myproject
conda install pytorch torchvision torchaudio pytorch-cuda=12.4 -c pytorch -c nvidia
One rule: if you use conda for an environment, use conda for all packages in that environment.
Mixing pip install into a conda env causes dependency conflicts that are painful to debug.
For This Course: Per-Phase Strategy
You could create one environment for the whole course. Don’t. Different phases need different
(sometimes conflicting) dependencies.
Strategy:
AIENGINEERINGFROMSCRATCH.COM 24

PYTHON ENVIRONMENTS
ai-engineering-from-scratch/
├── .venv/ <-- shared lightweight env for phases 0-3
├── phases/
│ ├── 04-neural-networks/
│ │ └── .venv/ <-- PyTorch env
│ ├── 05-cnns/
│ │ └── .venv/ <-- same PyTorch env (symlink or shared)
│ ├── 08-transformers/
│ │ └── .venv/ <-- might need different transformer versions
│ └── 11-llm-apis/
│ └── .venv/ <-- API SDKs, no torch needed
The script in code/env_setup.sh creates the base environment for this course.
pyproject.toml Basics
Every Python project should have a pyproject.toml. It replaces setup.py, setup.cfg, and
requirements.txt in one file.
[project]
name = "ai-engineering-from-scratch"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
"numpy>=1.26",
"matplotlib>=3.8",
"jupyter>=1.0",
"scikit-learn>=1.4",
]
[project.optional-dependencies]
torch = ["torch>=2.3", "torchvision>=0.18"]
llm = ["anthropic>=0.39", "openai>=1.50"]
Then install:
uv pip install -e ".[torch]" # base + PyTorch
uv pip install -e ".[llm]" # base + LLM SDKs
uv pip install -e ".[torch,llm]" # everything
Lockfiles
A lockfile pins every dependency (including transitive ones) to exact versions. This guarantees
reproducibility: anyone who installs from the lockfile gets exactly the same packages.
# uv generates uv.lock automatically when using uv add
uv add numpy
# pip-tools approach
uv pip compile pyproject.toml -o requirements.lock
uv pip install -r requirements.lock
Commit your lockfile to git. When someone clones the repo, they install from the lockfile and
get identical versions.
AIENGINEERINGFROMSCRATCH.COM 25

PYTHON ENVIRONMENTS
Common Mistakes
1. Installing globally
pip install torch # BAD: installs to system Python
source .venv/bin/activate
pip install torch # GOOD: installs to virtual environment
Check where your packages go:
which python # should show .venv/bin/python, not /usr/bin/python
which pip # should show .venv/bin/pip
2. Mixing pip and conda
conda create -n myenv python=3.12
conda activate myenv
conda install pytorch -c pytorch
pip install some-other-package # BAD: can break conda's dependency tracking
conda install some-other-package # GOOD: let conda manage everything
If you must use pip inside conda (some packages are pip-only), install all conda packages first,
then pip packages last.
3. Forgetting to activate
python train.py # uses system Python, missing packages
source .venv/bin/activate
python train.py # uses project Python, packages found
Your shell prompt should show the environment name:
(.venv) $ python train.py
4. Committing .venv to git
echo ".venv/" >> .gitignore
Virtual environments are 200MB-2GB. They’re local, not portable between machines. Commit
pyproject.toml and the lockfile instead.
5. CUDA version mismatch
nvidia-smi # shows driver CUDA version (e.g., 12.4)
python -c "import torch; print(torch.version.cuda)" # shows PyTorch CUDA version
# These must be compatible.
# PyTorch CUDA version must be <= driver CUDA version.
Use It
Run the setup script to create your course environment:
bash phases/00-setup-and-tooling/06-python-environments/code/env_setup.sh
AIENGINEERINGFROMSCRATCH.COM 26

PYTHON ENVIRONMENTS
This creates a .venv at the repo root with core dependencies installed and verified.
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/00-setup-and-tooling/06-python-environments/code
1. Run env_setup.sh and verify all checks pass
2. Create a second virtual environment, install a different version of numpy in it, and con-
firm the two environments are isolated
3. Write a pyproject.toml for a project that needs both PyTorch and the Anthropic SDK
4. Deliberately install a package globally (without activating a venv), notice where it goes,
then uninstall it
Key Terms
Term What people say What it actually means
Virtual envi- “A venv” An isolated directory containing a Python
ronment interpreter and packages, separate from
the system Python
Lockfile “Pinned dependencies” A file listing every package and its exact
version, guaranteeing identical installs
across machines
pyproject.toml“The new setup.py” The standard Python project configuration
file, replacing
setup.py/setup.cfg/requirements.txt
Transitive “A dependency of a Package B depends on C; if you install A
depen- dependency” which depends on B, C is a transitive
dency dependency of A
CUDA “My GPU isn’t working” PyTorch was compiled for a different CUDA
mismatch version than what your GPU driver supports
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/00-setup-and-tooling/06-python-environments
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/00-setup-and-tooling/06-python-environments/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/00-setup-and-tooling/06-python-environments
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 27