# Pipeline stages

Each agent of the pipeline reads its own section. The inputs (task, work folder, guide text, skill folder) come in the agent's prompt; the learner context goes only to the judge and the reviewer. The format rules are in `pack-format.md` next to this file.

## Research: guide

Read `<workDir>/guide.txt`. For the task, return:

- the task statement and every "Knowledge of" and "Skills in" line, in short form, with the guide page;
- the domain, its weight, and the scenarios that list the domain;
- the sample questions of the guide that touch the task: their right answers and why the wrong options fail, as patterns, not copied text;
- the out-of-scope items that sit close to the task, so nobody teaches them;
- the neighbouring tasks a question could combine with this one.

Report only what the guide says. Mark each fact with its page.

## Research: docs

Check the mechanics of the task against the official Claude documentation: https://code.claude.com/docs for Claude Code, https://platform.claude.com/docs for the API, the Agent SDK, tool use and MCP, and https://modelcontextprotocol.io for MCP itself. Use the web tools of the session (WebSearch, WebFetch or a web-fetch agent). Return:

- the exact names of files, folders, settings, frontmatter keys, flags, fields, hook events and API parameters the task needs, each with its doc URL;
- small, correct examples of each, 15 lines or fewer;
- every place where the guide and the docs differ, and the docs' newer details the exam doesn't need.

If no web tool works, say so and return nothing invented: the judge then relies on the guide only. Search only for the mechanics, never for exam questions, "recalled" items, dumps or practice tests (see "Exam content and the NDA" in `pack-format.md`).

## Judge

You get both research reports. For each fact, decide: **keep** (the guide states it, or the docs confirm it and it serves the guide's statement), **drop** (out of scope, unverifiable, or detail the exam doesn't test), or **flag** (guide and docs disagree: keep the guide's answer as the exam answer, and note the docs' version in 1 line). Return each kept and flagged fact as 1 line: the claim, then its source as a guide page or a doc URL. The learner's session answers follow-up questions from these lines.

Then plan the pack by `pack-format.md`:

- a coverage map: each "Knowledge of" and "Skills in" line of the task, and the part that teaches it: the reveal, the right-vs-wrong notes or "Also in this task", never only the decision card or a question;
- the edge behaviours of the mechanism that the kept facts support (trigger, what it is relative to, default, failure fallback);
- the teaching case: scenario, what you built, the failure the evidence shows, the fix. Its situation differs from every guide sample question;
- the right-vs-wrong example;
- the "Also in this task" blocks for the topics the case doesn't teach;
- the decision card rows (at most 5);
- 3 practice questions: for each, the angle, the scenario, the right answer and the traps, all different from the teaching case;
- the word estimate. If 1 pack can't teach the task in about 1,800 words, split it into parts (`<task>a`, `<task>b`) by sub-topic, each with its own plan.

## Write

Write the part's 2 files into `<workDir>/<part id>/`:

- `body.md` by the layout of `pack-format.md`, with `{{QUESTIONS}}` where the practice goes;
- `questions.json` by the schema of `pack-format.md`.

Use only the kept facts of the judge. Write short sentences and plain words. Show the code, the value or the before and after, instead of describing them.

Then run the pack check and fix the files until it passes:

```bash
bash <skill folder>/scripts/pack.sh <part folder>/body.md <part folder>/questions.json /dev/null
```

If it exits 127 (no Python or Node), check the rules of `pack-format.md` by reading instead. It checks the case shape of the teaching case and every question, the 3 reveal fields, frontmatter on line 1 of each code block, the options, the `{opt:id}` references and the word count.

## Review

You did not write this pack. Read both files of the part and check every rule of `pack-format.md`, plus:

- each technical claim against the kept facts; flag any claim the facts don't support;
- the coverage map of the judge: every line of the task is taught before the practice, and the edge behaviours are stated;
- every code block shows the state it reads being set, not only a comment about it;
- every code or config block as if it were a real file: frontmatter on line 1, valid JSON and YAML, real flags;
- every keyed answer holds on every run, not only on most;
- no evidence line names the diagnosis instead of the symptom: words that name the mechanism, such as "in context", "loads" or "at session start", belong in the reveal or the explanation;
- every wrong option has a trap type of `pack-format.md`; drop any option that is a personal preference, outside the repository, or a code restructure to fit the config;
- the exam's answer, not just a working answer: the most proportionate, deterministic, root-cause fix;
- every wrong option is wrong or worse for a reason the explanation states;
- no practice question reuses the teaching case's files, tools, numbers, wording or need-to-mechanism pair, and the 3 angles differ;
- no question gives its answer away: the right option isn't the longest, the only specific or the only complete one, the evidence names no error or log line that is the answer, and the question has no hint;
- no answer letters anywhere; every `{opt:id}` matches an option id;
- the word count: about 1,800 words, code and tables included, never above 2,400;
- "Exam content and the NDA" of `pack-format.md`: read the guide's sample questions in `guide.txt` and flag any case or practice question that shares a sample question's situation, tools or set of options, or reads like a remembered exam item, a dump or a practice-test item. Also check against any exam memory in the learner context.

Return each issue with where it is, the problem and the fix. Return no issues if the pack passes.

## Fix

Apply every issue of the review to the 2 files of the part. Where an issue is wrong, leave the text and say why in your return. Then run the pack check of the `Write` section and fix the files until it passes.
