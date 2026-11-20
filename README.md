# ccar-f-study-pack

A Claude Code plugin for preparing for the **Claude Certified Architect – Foundations (CCAR-F)** exam. Name a task from the exam guide, such as `3.2`, and it builds a study pack you work through in about 25 minutes.

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
3. **Right vs wrong.** Short code or config blocks side by side.
4. **A decision card.** "If you see X, pick Y, not Z, because…", at most 4 rows.
5. **3 practice questions.** Each from a different angle than the lesson, at least 1 multiple response, with the answer folded under the question.

Raw reading is 3–7 minutes; with the guesses and questions about 25 minutes. A task too big for that is split into parts (`5.1a`, `5.1b`).

## How it is built

Each run downloads the official exam guide and runs a pipeline of agents: research (guide and Claude docs in parallel), a judge that keeps, drops or flags each fact, then per part a writer, an independent reviewer and a fixer. A Python script, not a model, then shuffles question order and answer options with `secrets.SystemRandom`, so the right answers don't cluster on B.

Rules for the pack: [skills/study-pack/references/pack-format.md](skills/study-pack/references/pack-format.md). Agent instructions: [skills/study-pack/references/stages.md](skills/study-pack/references/stages.md).

## Requirements

- Claude Code with the Workflow tool (falls back to plain subagents without it) and web access for the docs check.
- `curl`, `python3`, and `pdftotext` (poppler) or the `pypdf` package.

## Exam content

Packs never contain real exam questions. The CCAR-F agreement forbids sharing exam questions, options or scenarios, so the practice questions are written fresh from the public exam guide.

## License

MIT
