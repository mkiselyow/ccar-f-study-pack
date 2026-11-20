# Pack format

The rules every pack follows. The writer applies them and the reviewer checks each one.

## Exam content and the NDA

Before the exam, every candidate accepts an agreement (guide §14) that all exam content, "including questions, answer options, and scenarios", is confidential and must not be disclosed, reproduced or distributed. Packs are public study material, so they are built only from public sources.

- **Sources:** the public exam guide (task statements, the 6 scenario descriptions, the domain weights, the published question format) and the public Claude documentation. Nothing else about exam content.
- **Never use** questions, answer options or scenarios from a live exam: not remembered by the learner, not from forums or question-dump sites, not from the practice test on the Anthropic Partner Academy. Never search for them.
- **Same shape, new content.** The scenario, evidence, question and 4–5 options shape is the public format of the guide's sample questions, so packs use it. Every situation, name, number, tool and option is written fresh for the pack.
- **The guide's sample questions** are public but not ours to reuse: take only the pattern of why the right answer wins. No practice question shares a sample question's situation, tools or set of options, and none is a close paraphrase of one.
- **Learner input:** a learner's own scores per objective are theirs to share and fine to show. A learner's memory of an exam item becomes a task number or topic only.
- **Labels:** never call a pack question real, actual, recalled or "from the exam". The shuffle script ends every pack with a footer that says the questions are written from the public guide and are not exam content.

## Size

- Raw reading 3–7 minutes: aim for about 1,200 words per pack. The shuffle script counts everything, code and tables included, and fails above 1,500. With the guesses and questions, about 25 minutes.
- If the task needs more, split it into parts (`5.1a`, `5.1b`), each a full pack of its own. The judge decides the split.
- Cut anything the exam doesn't test. The guide's out-of-scope list is never taught.

## Layout of `body.md`

```markdown
# Task <id>: <short title from the guide>

Raw reading: about <n> min. With the guesses and questions: about 25 min.
Guide: p.<page> (Domain <d>, <weight>% of the exam). <Scenario names from the guide> lean on it most.
<Only with learner context:> Your first attempt: "<objective>" **<score>%**. <Plan pointer if given.>

At every **Your guess** line, stop and answer before reading on. <Roles line>

---

## 1. Case: <short title>

<Case: see "Cases">

### Reveal

**Fix:** <the fix>
**Mechanism:** <why it works, 2–3 sentences>
**The one thing that matters most:** <1 sentence>

## 2. Right vs wrong: <short title>

<2 short code or config blocks, 10 lines or fewer each, or 1 block marked RIGHT with the wrong way in 1 line; then 1-line notes on the difference>

## 3. Decision card

| If you see… | Pick | Not | Because |
| --- | --- | --- | --- |
<at most 4 rows>

---

## 4. Practice

{{QUESTIONS}}
```

`{{QUESTIONS}}` stays literally in `body.md`. The shuffle script replaces it.

## Roles line

- Agent SDK, API and MCP tasks: "Roles, as on the exam: **you** are the architect, **your agent** is Claude inside the system you built, **the user**/**the customer** is the person talking to it."
- Claude Code tasks: "Roles, as on the exam: **you** are the architect or team lead who sets Claude Code up, **developers** are the people using it."

## Cases

The teaching case and every practice question have 3 parts:

1. **Scenario: <exact name>** in bold, with 1–2 sentences on what *you* built: tools, loop, config. The 6 names, exactly as written: Customer Support Resolution Agent, Code Generation with Claude Code, Multi-Agent Research System, Developer Productivity with Claude, Claude Code for Continuous Integration, Structured Data Extraction.
2. **Production logs show:**, **Developers report:** or **Production data shows:**, with the evidence and every actor named: the customer, your agent (Claude), your code. Describe code behaviour as "your loop ends when…", never as a quote someone said.
3. **Your guess:** 1 question in exam wording, such as "What change would most effectively fix this?" or "What should you do first?". No hint in the question, such as "why isn't X enough".

The reveal speaks of "you" and "your agent" the same way as the case.

## Teaching content

- Lead with the case, then the reveal. The rule comes out of the case; there is no separate rule or "why" section.
- The mechanism is the real one, checked against the guide and the docs. No invented flags, files, fields or commands.
- The decision card is the only summary. Each row is "if you see X, pick Y, not Z, because…".

## Practice questions

- 3 questions. At least 1 is multiple response ("pick 2"), like the real exam.
- Each question differs from the teaching parts by at least 1 angle, and no 2 questions use the same angle:
  - another scenario than the teaching case;
  - reversed direction: a broken setup, and the question asks why or what to change;
  - symptom only: the behaviour without naming the topic;
  - near-miss distractors: every option almost fits;
  - 2 tasks combined: this task with a neighbouring one;
  - multiple response.
- No question reuses the files, tools, numbers, wording or need-to-mechanism pair of the teaching case or the right-vs-wrong example.
- Wrong options are the exam's usual traps: over-engineering (a classifier, a routing layer), relying on a prompt where a rule must hold, self-reported confidence or sentiment, a bigger model or context window, blaming another part, hiding errors or stopping the whole run, and features that don't exist. Some options are only worse, not wrong; the explanation says which.
- 4 options for single answer, 5 for multiple response.

## `questions.json`

A list of questions. The writer never writes answer letters; the shuffle script assigns them.

```json
[
  {
    "id": "short_slug",
    "multi": 0,
    "stem": "**Scenario: …** …\n\n**Production logs show:** …\n\n**Your guess:** What change would most effectively fix this?",
    "options": [
      {"id": "hook_gate", "correct": true, "text": "…"},
      {"id": "prompt_rule", "correct": false, "text": "…"}
    ],
    "explanation": "Why the right option works, then 1 short reason per wrong option, naming each as {opt:prompt_rule}."
  }
]
```

- `multi` is 0 for single answer, else the number to pick (2), equal to the number of correct options. The script writes "(multiple response, pick 2)" in front of the stem, so the stem doesn't say it again.
- The "Raw reading" minutes in `body.md` are a placeholder number: the script replaces them with its own count.
- Option ids are lowercase letters, digits and `_`. Stems and explanations name options only as `{opt:<id>}`, never as A–E.
- The explanation starts with the reason, not the letter: the script writes the letters in front of it.
