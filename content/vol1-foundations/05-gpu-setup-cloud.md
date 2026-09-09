---
title: "GPU Setup & Cloud"
volume: "vol1-foundations"
part: "Part I — Setup & Tooling"
chapter_number: 5
source_pages: "15-17"
---

# GPU Setup & Cloud

GPU Setup & Cloud
Training on CPU is fine for learning. Training for real needs a GPU.
Type: Build Languages: Python Prerequisites: Phase 0, Lesson 01 Time: ~45 minutes
Learning Objectives
• Verify local GPU availability using nvidia-smi and PyTorch’s CUDA API
• Configure Google Colab with a T4 GPU for free cloud-based experiments
• Benchmark matrix multiplication on CPU vs GPU and measure the speedup
• Estimate the largest model that fits in your VRAM using the fp16 rule of thumb
The Problem
Most lessons in phases 1-3 run fine on CPU. But once you start training CNNs, transformers,
or LLMs (phases 4+), you need GPU acceleration. A training run that takes 8 hours on CPU
takes 10 minutes on GPU.
You have three options: local GPU, cloud GPU, or Google Colab (free).
The Concept
Your options:
1. Local NVIDIA GPU
Cost: $0 (you already have it)
Setup: Install CUDA + cuDNN
Best for: Regular use, large datasets
2. Google Colab (free tier)
Cost: $0
Setup: None
Best for: Quick experiments, no GPU at home
3. Cloud GPU (Lambda, RunPod, Vast.ai)
Cost: $0.20-2.00/hr
Setup: SSH + install
Best for: Serious training, large models
Interactive figure: s0-gpu-dispatch. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/00-
setup-and-tooling/03-gpu-setup-and-cloud
AIENGINEERINGFROMSCRATCH.COM 11

GPU SETUP & CLOUD
Build It
Option 1: Local NVIDIA GPU
Check if you have one:
nvidia-smi
Install PyTorch with CUDA:
import torch
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"CUDA version: {torch.version.cuda}")
if torch.cuda.is_available():
print(f"GPU: {torch.cuda.get_device_name(0)}")
print(f"Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
Option 2: Google Colab
1. Go to colab.research.google.com
2. Runtime > Change runtime type > T4 GPU
3. Run !nvidia-smi to verify
Upload notebooks from this course directly to Colab.
Option 3: Cloud GPU
For Lambda Labs, RunPod, or Vast.ai:
ssh user@your-gpu-instance
pip install torch torchvision torchaudio
python -c "import torch; print(torch.cuda.get_device_name(0))"
No GPU? No problem.
Most lessons work on CPU. The ones that need GPU will say so and include Colab links.
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using: {device}")
Build It: GPU vs CPU benchmark
import torch
import time
size = 5000
a_cpu = torch.randn(size, size)
b_cpu = torch.randn(size, size)
start = time.time()
c_cpu = a_cpu @ b_cpu
cpu_time = time.time() - start
AIENGINEERINGFROMSCRATCH.COM 12

GPU SETUP & CLOUD
print(f"CPU: {cpu_time:.3f}s")
if torch.cuda.is_available():
a_gpu = a_cpu.to("cuda")
b_gpu = b_cpu.to("cuda")
torch.cuda.synchronize()
start = time.time()
c_gpu = a_gpu @ b_gpu
torch.cuda.synchronize()
gpu_time = time.time() - start
print(f"GPU: {gpu_time:.3f}s")
print(f"Speedup: {cpu_time / gpu_time:.0f}x")
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/00-setup-and-tooling/03-gpu-setup-and-cloud/code
1. Run the benchmark above and compare CPU vs GPU times
2. If you don’t have a GPU, run it on Google Colab and compare
3. Check how much GPU memory you have and estimate the largest model you can fit (rule
of thumb: 2 bytes per parameter for fp16)
Key Terms
Term What people say What it actually means
CUDA “GPU programming” NVIDIA’s parallel computing platform that
lets you run code on the GPU
VRAM “GPU memory” Video RAM on the GPU, separate from
system RAM. Limits model size.
fp16 “Half precision” 16-bit floating point, uses half the memory
of fp32 with minimal accuracy loss
Tensor “Fast matrix hardware” Specialized GPU cores for matrix
Core multiplication, 4-8x faster than regular
cores
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/00-setup-and-tooling/03-gpu-setup-and-cloud
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/00-setup-and-tooling/03-gpu-setup-and-cloud/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/00-setup-and-tooling/03-gpu-setup-and-cloud
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 13