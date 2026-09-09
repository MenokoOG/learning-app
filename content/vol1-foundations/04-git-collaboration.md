---
title: "Git & Collaboration"
volume: "vol1-foundations"
part: "Part I — Setup & Tooling"
chapter_number: 4
source_pages: "12-14"
---

# Git & Collaboration

Git & Collaboration
Version control is not optional. Every experiment, every model, every lesson you
build here gets tracked.
Type: Learn Languages: – Prerequisites: Phase 0, Lesson 01 Time: ~30 minutes
Learning Objectives
• Configure git identity and use the daily workflow of add, commit, and push
• Create and merge branches for isolated experiments without breaking main
• Write a .gitignore that excludes model checkpoints and large binary files
• Navigate the commit history with git log to understand project evolution
The Problem
You’re about to write hundreds of code files across 20 phases. Without version control you
will lose work, break things you can’t undo, and have no way to collaborate with others.
Git is the tool. GitHub is where the code lives. This lesson covers what you need for this
course and nothing more.
The Concept
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/00-setup-and-tooling/02-git-and-collaboration
Three things to remember: 1. Save often (git commit) 2. Push to remote (git push) 3. Branch
for experiments (git checkout -b experiment)
Interactive figure: s0-commit-dag. This one moves. Watch it animate and drag its controls
in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/00-
setup-and-tooling/02-git-and-collaboration
Build It
Step 1: Configure git
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
Step 2: The daily workflow
git status
git add file.py
AIENGINEERINGFROMSCRATCH.COM 8

GIT & COLLABORATION
git commit -m "Add perceptron implementation"
git push origin main
Step 3: Branching for experiments
git checkout -b experiment/new-optimizer
# ... make changes, commit ...
git checkout main
git merge experiment/new-optimizer
Step 4: Working with this course repo
You can’t push to the course repo itself — only maintainers have write access. Fork it on
GitHub first (the Fork button, top right) so origin points at your own copy:
git clone https://github.com/YOUR-USERNAME/ai-engineering-from-scratch.git
cd ai-engineering-from-scratch
git checkout -b my-progress
# work through lessons, commit your code
git push origin my-progress
Use It
For this course, you need exactly these commands:
Command When
git clone Get the course repo
git add + git commit Save your work
git push Back it up to GitHub
git checkout -b Try something without breaking
main
git log --oneline See what you’ve done
That’s it. You don’t need rebase, cherry-pick, or submodules for this course.
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/00-setup-and-tooling/02-git-and-collaboration/code
1. Fork this repo, clone your fork, create a branch called my-progress, make a file, commit
it, push it
2. Create a .gitignore that excludes model checkpoint files (.pt, .pth, .safetensors)
3. Look at the commit history of this repo with git log --oneline and read how lessons
were added
AIENGINEERINGFROMSCRATCH.COM 9

GIT & COLLABORATION
Key Terms
Term What people say What it actually means
Commit “Saving” A snapshot of your entire project at a point
in time
Branch “A copy” A pointer to a commit that moves forward
as you work
Merge “Combining code” Taking changes from one branch and
applying them to another
Remote “The cloud” A copy of your repo hosted somewhere else
(GitHub, GitLab)
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/00-setup-and-tooling/02-git-and-collaboration
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/00-setup-and-tooling/02-git-and-collaboration/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/00-setup-and-tooling/02-git-and-collaboration
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 10