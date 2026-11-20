# ccar-f-study-pack

A Claude Code plugin for preparing for the **Claude Certified Architect – Foundations (CCAR-F)** exam. Name a task from the exam guide, such as `3.2`, and it builds a study pack you work through in about 45 minutes.

## Install

```
/plugin marketplace add mkiselyow/ccar-f-study-pack
/plugin install ccar-f-study-pack@ccar-f-study-pack
```

## Use

```
/ccar-f-study-pack:study-pack 3.2
```

Or just ask: "make a study pack for task 1.4". Add an output folder after the task if you want one; the default is `ccar-f-study-packs/` in your working directory. If you share your score report results per objective, the pack shows your score on that objective.

## What a pack looks like

1. **A case in exam format.** A scenario from the guide, the evidence ("Production logs show: …"), and a question you answer before reading on.
2. **The reveal.** The fix, the mechanism in 2–3 sentences, and the one thing that matters most.
3. **Right vs wrong.** Short code or config blocks side by side, showing every piece of state they depend on.
4. **Also in this task.** A short block with a before → after example for each topic of the task the case doesn't cover, so every topic is taught before the questions.
5. **A decision card.** "If you see X, pick Y, not Z, because…", at most 5 rows.
6. **3 practice questions.** Each from a different angle than the lesson, at least 1 multiple response, with the answer folded under the question.

Raw reading is 5–10 minutes; with the guesses and questions about 45 minutes, at most an hour. A task too big for that is split into parts (`5.1a`, `5.1b`).

## How it is built

Each run downloads the official exam guide and runs a pipeline of agents: research (guide and Claude docs in parallel), a judge that keeps, drops or flags each fact, then per part a writer, an independent reviewer and a fixer. A script, not a model, then checks the pack and shuffles question order and answer options with the system's random source, so the right answers don't cluster on B. It runs on Python or on Node, whichever is installed.

Rules for the pack: [skills/study-pack/references/pack-format.md](skills/study-pack/references/pack-format.md). Agent instructions: [skills/study-pack/references/stages.md](skills/study-pack/references/stages.md).

## Requirements

- Claude Code with the Workflow tool (falls back to plain subagents without it) and web access for the docs check.
- `curl`.
- Python 3.9+ or Node for the shuffle and the pack check. Claude Code installed through npm already brings Node. On macOS, `python3` comes with the command-line tools (`xcode-select --install`); most developers have them because `git` needs them. With neither, the skill shuffles from `/dev/urandom` and checks the pack by reading, and says so.
- Optional: `pdftotext` (poppler) or the `pypdf` package, to extract the guide cheaply. Without them, Claude reads the PDF with its own Read tool, which costs more context.

## Exam content

Packs never contain real exam questions. The CCAR-F agreement forbids sharing exam questions, options or scenarios, so the practice questions are written fresh from the public exam guide.

## License

MIT
