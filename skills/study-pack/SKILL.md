---
name: study-pack
description: Builds a case-first study pack for one task of the Claude Certified Architect – Foundations (CCAR-F) exam guide, such as 1.4 or 3.2, so a learner can understand it deeply in about 45 minutes. Runs a research, judge, write, review and fix pipeline of agents over the official exam guide and the Claude docs, then shuffles the practice answers with a real random source. Use when someone preparing for CCAR-F names a guide task ("3.2", "task 1.4", "make a pack for 4.3", "explain task statement 5.1"), asks to study, learn or practice a CCAR-F task, or asks for practice questions on one.
argument-hint: <task, e.g. 3.2> [output folder]
---

# CCAR-F study pack

One pack per guide task, in Markdown, readable in **5–10 minutes raw** and **about 45 minutes, at most an hour,** with the guesses and questions. The format rules live in [references/pack-format.md](references/pack-format.md), the agent instructions in [references/stages.md](references/stages.md). Paths below are relative to this skill's base directory.

## 1. Settle the inputs

- **Task:** `D.N` with D in 1–5, such as `3.2`. Anything else: ask which task.
- **Output folder:** the one the user named; else `ccar-f-study-packs/` in the working directory. Say which one you use.
- **Learner context (optional):** if the user gave their score report results per objective, or a study-plan file, pass them on. Never invent scores. Without them the pack leaves out the "Your first attempt" line.
- **Guide URL:** the one the user gave, else
  `https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf`
- **Exam content:** follow "Exam content and the NDA" in [references/pack-format.md](references/pack-format.md). If the learner describes an item from their exam, keep only the task number or topic, build nothing that recreates the item, and tell them in 1 line that the exam NDA forbids reproducing it.

## 2. Download the guide

Make a work folder in your scratchpad (or a fresh temp folder), then:

```bash
bash scripts/fetch_guide.sh "<guide url>" "<work folder>"
```

It writes `guide.pdf` and `guide.txt` and checks that `Task Statement` headings exist. If `pdftotext` and `pypdf` are both missing, read the PDF with the Read tool (`pages`) and write the text to `<work folder>/guide.txt` yourself. Check that `Task Statement <task>` appears in `guide.txt`; if not, tell the user the task doesn't exist in this guide version.

## 3. Run the pipeline

Call the **Workflow** tool with `scriptPath: <skill dir>/workflow.js` and these `args` (a JSON object, not a string):

```json
{ "task": "3.2", "skillDir": "<absolute skill dir>", "workDir": "<work folder>",
  "learner": "<score lines or plan path, or empty string>" }
```

Using this skill is the user's opt-in to the workflow. The workflow runs research (guide + docs), judge, then per part write, review and fix. It returns the parts, each with the folder that holds its `body.md` and `questions.json`, and the judge's kept and flagged facts, each with its source. Keep the facts for the follow-ups of step 6.

**No Workflow tool in this session?** Run the same stages with the Agent tool, in the order of `workflow.js`: give each agent the instruction "Read `<skill dir>/references/stages.md`, section `<stage>`, and follow it" plus the same inputs. Run the 2 research agents in parallel.

## 4. Shuffle, check and save

For each part, run the script, not a model, so answer letters and question order are truly random:

```bash
bash scripts/pack.sh "<part folder>/body.md" "<part folder>/questions.json" "<output folder>/<part id>.md"
```

`pack.sh` runs `shuffle_pack.py` with Python 3.9+, or the same checks in `shuffle_pack.mjs` with Node when Python is missing. Either one shuffles question order and option order with the system's random source, fills in the `{opt:id}` letters, appends the answer key as an HTML comment, and prints the key, the word count and the reading time. It creates the output folder if needed. On a broken pack (case shape, options, placeholders, more than 2,400 words) it exits non-zero with the rule that failed and writes nothing; send the part back to the `Fix` stage with that message, then run the script again. A part whose result is null failed inside the workflow: re-run the Workflow with `resumeFromRunId` to retry it.

**Exit 127: neither Python nor Node.** Tell the user once that installing either makes the checks automatic, then build the pack by hand:

1. Get random numbers from the system, never choose them yourself: `od -An -tu1 -N16 /dev/urandom`.
2. Order the questions, then the options of each question, by a Fisher-Yates shuffle: for position i from the last down to 1, swap it with position `number mod (i + 1)`, taking the next number each time.
3. Replace `{{QUESTIONS}}` with the questions in the layout the script uses: `**Q1.** ` and, for multiple response, ` (multiple response, pick N)` before the stem; options as `A) …`; then a `<details><summary>Answer</summary>` block that starts with the correct letters in bold. Write every `{opt:id}` as its letter.
4. Check every rule of `references/pack-format.md` by reading, add the footer line of the script and the answer key comment, and say in the report that the pack was checked by reading, not by the script.

## 5. Report

- A link to each pack file and its reading time.
- **Never show the answer key in chat.** The learner reads the answers in the pack after guessing.
- If a task was split, say why in one line.
- End with 1 line inviting questions about any part of the pack.

## 6. Follow-up questions

Read each final pack once, right after step 4, so you can answer questions about it without opening the file again. Answer from the pack and the kept facts, and cite the source line (guide page or doc URL). For a flagged fact, give the guide's answer as the exam answer and the docs' version after it. When a question goes beyond those facts, say so and check the docs before you answer. Reveal the answer to a practice question only when the learner asks for it.
