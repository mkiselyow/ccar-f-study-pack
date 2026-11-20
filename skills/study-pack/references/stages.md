# Pipeline stages

Each agent of the pipeline reads its own section. The inputs (task, work folder, guide text, skill folder, learner context) come in the agent's prompt. The format rules are in `pack-format.md` next to this file.

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
- small, correct examples of each, 10 lines or fewer;
- every place where the guide and the docs differ, and the docs' newer details the exam doesn't need.

If no web tool works, say so and return nothing invented: the judge then relies on the guide only. Search only for the mechanics, never for exam questions, "recalled" items, dumps or practice tests (see "Exam content and the NDA" in `pack-format.md`).

## Judge

You get both research reports. For each fact, decide: **keep** (the guide states it, or the docs confirm it and it serves the guide's statement), **drop** (out of scope, unverifiable, or detail the exam doesn't test), or **flag** (guide and docs disagree: keep the guide's answer as the exam answer, and note the docs' version in 1 line).

Then plan the pack by `pack-format.md`:

- a coverage map: each "Knowledge of" and "Skills in" line of the task, and the part of the pack that teaches it;
- the edge behaviours of the mechanism that the kept facts support (trigger, what it is relative to, default, failure fallback);
- the teaching case: scenario, what you built, the failure the evidence shows, the fix. Its situation differs from every guide sample question;
- the right-vs-wrong example;
- the decision card rows (at most 4);
- 3 practice questions: for each, the angle, the scenario, the right answer and the traps, all different from the teaching case;
- the word estimate. If 1 pack can't teach the task in about 1,200 words, split it into parts (`<task>a`, `<task>b`) by sub-topic, each with its own plan.

## Write

Write the part's 2 files into `<workDir>/<part id>/`:

- `body.md` by the layout of `pack-format.md`, with `{{QUESTIONS}}` where the practice goes;
- `questions.json` by the schema of `pack-format.md`.

Use only the kept facts of the judge. Write short sentences and plain words. Show the code, the value or the before and after, instead of describing them.

## Review

You did not write this pack. Read both files of the part and check every rule of `pack-format.md`, plus:

- each technical claim against the kept facts; flag any claim the facts don't support;
- the coverage map of the judge: every line of the task is taught, and the edge behaviours are stated;
- every code or config block as if it were a real file: frontmatter on line 1, valid JSON and YAML, real flags;
- every keyed answer holds on every run, not only on most;
- no evidence line names the diagnosis instead of the symptom;
- the exam's answer, not just a working answer: the most proportionate, deterministic, root-cause fix;
- every wrong option is wrong or worse for a reason the explanation states;
- no practice question reuses the teaching case's files, tools, numbers, wording or need-to-mechanism pair, and the 3 angles differ;
- no question gives its answer away: the right option isn't the longest or the only specific one, and the question has no hint;
- no answer letters anywhere; every `{opt:id}` matches an option id;
- the word count: about 1,200 words, code and tables included, never above 1,500;
- "Exam content and the NDA" of `pack-format.md`: read the guide's sample questions in `guide.txt` and flag any case or practice question that shares a sample question's situation, tools or set of options, or reads like a remembered exam item, a dump or a practice-test item. Also check against any exam memory in the learner context.

Return each issue with where it is, the problem and the fix. Return no issues if the pack passes.

## Fix

Apply every issue of the review to the 2 files of the part. Where an issue is wrong, leave the text and say why in your return. Then check the files once more against `pack-format.md`.
