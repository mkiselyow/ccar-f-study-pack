"""Shuffle the practice questions of a study pack and render the final Markdown.

Usage: python3 -I shuffle_pack.py <body.md> <questions.json> <out.md>

Question order and option order come from secrets.SystemRandom, so answer letters
are truly random. Exits non-zero with a message, and writes nothing, when the pack
breaks a rule.
"""
import json
import os
import re
import secrets
import sys

LETTERS = "ABCDEFGH"
OPTION_ID = re.compile(r"^[a-z0-9_]+$")
OPTION_REF = re.compile(r"\{opt:([^}]*)\}")
WORDS_PER_MINUTE = 200
MAX_WORDS = 2400
LENGTH_MARGIN = 1.2
FOOTER = ("*Practice questions written for this pack from the public CCAR-F exam guide and the Claude docs. "
          "They are not exam content: the exam's questions, options and scenarios are confidential under its NDA.*")
SCENARIOS = ("Customer Support Resolution Agent", "Code Generation with Claude Code", "Multi-Agent Research System",
             "Developer Productivity with Claude", "Claude Code for Continuous Integration",
             "Structured Data Extraction")
SCENARIO = re.compile(r"\*\*Scenario: (" + "|".join(map(re.escape, SCENARIOS)) + r")\.?\*\*")
EVIDENCE = re.compile(r"\*\*(Production logs show|Developers report|Production data shows):\*\*")
GUESS = re.compile(r"\*\*Your guess:\*\*")
REVEAL_FIELDS = ["Fix", "Mechanism", "The one thing that matters most"]
READING_LINE = re.compile(r"^Raw reading:[^\n]*?(?=\. With|$)", re.M)
FENCE = re.compile(r"^(`{3,}|~{3,})")
NOT_READ = re.compile(r"<!--.*?-->|</?(?:details|summary)>", re.S)


class PackError(Exception):
    pass


def reading_minutes(words: int) -> int:
    return max(1, round(words / WORDS_PER_MINUTE))


def check_case(text: str, where: str) -> None:
    for name, pattern in (("'**Scenario: <exact guide name>**'", SCENARIO), ("an evidence label", EVIDENCE),
                          ("'**Your guess:**'", GUESS)):
        if not pattern.search(text):
            raise PackError(f"{where}: missing {name}")


def section(body: str, start: str, end: str) -> str:
    match = re.search(re.escape(start) + r"(.*?)" + re.escape(end), body, re.S)
    if not match:
        raise PackError(f"body.md: no section from '{start}' to '{end}'")
    return match.group(1)


def closes(line: str, fence: str) -> bool:
    mark = line.strip()
    return len(mark) >= len(fence) and set(mark) == {fence[0]}


def code_blocks(body: str) -> list[list[str]]:
    blocks, current, fence = [], [], None
    for line in body.split("\n"):
        if fence is None:
            match = FENCE.match(line)
            if match:
                fence, current = match.group(1), []
        elif closes(line, fence):
            blocks.append(current)
            fence = None
        else:
            current.append(line)
    if fence is not None:
        raise PackError("body.md: a code block is never closed")
    return blocks


def check_body(body: str) -> None:
    if "{{QUESTIONS}}" not in body:
        raise PackError("body.md has no {{QUESTIONS}} placeholder")
    if not READING_LINE.search(body):
        raise PackError("body.md has no 'Raw reading:' line")
    check_case(section(body, "## 1.", "### Reveal"), "teaching case")
    fields = re.findall(r"^\*\*([^*]+?):\*\*", section(body, "### Reveal", "## 2."), re.M)
    if fields != REVEAL_FIELDS:
        raise PackError(f"reveal fields are {fields}, expected {REVEAL_FIELDS}")
    for lines in code_blocks(body):
        if "---" in lines and lines[0] != "---" and all(not line.strip() for line in lines[:lines.index("---")]):
            raise PackError("a code block has blank lines before its frontmatter; '---' must be on line 1")


def check_question(question: object) -> None:
    if not isinstance(question, dict):
        raise PackError(f"each question must be an object, got {question!r:.60}")
    qid = question.get("id", "?")
    for field in ("id", "stem", "explanation"):
        if not isinstance(question.get(field), str) or not question[field].strip():
            raise PackError(f"{qid}: '{field}' must be a non-empty string")
    multi = question.get("multi")
    if type(multi) is not int or multi == 1 or multi < 0:
        raise PackError(f"{qid}: 'multi' must be the integer 0 or the number to pick (2 or more), got {multi!r}")
    options = question.get("options")
    if not isinstance(options, list) or not all(isinstance(option, dict) for option in options):
        raise PackError(f"{qid}: 'options' must be a list of objects")
    for option in options:
        if not isinstance(option.get("id"), str) or not isinstance(option.get("text"), str) \
                or type(option.get("correct")) is not bool:
            raise PackError(f"{qid}: each option needs a string 'id' and 'text' and a true/false 'correct': {option}")
    ids = [option["id"] for option in options]
    if len(set(ids)) != len(ids) or not all(OPTION_ID.match(i) for i in ids):
        raise PackError(f"{qid}: option ids must be unique and match [a-z0-9_]+: {ids}")
    correct = sum(1 for option in options if option["correct"])
    expected_correct = multi or 1
    if correct != expected_correct:
        raise PackError(f"{qid}: {correct} correct options, expected {expected_correct}")
    expected_options = 5 if multi else 4
    if len(options) != expected_options:
        raise PackError(f"{qid}: {len(options)} options, expected {expected_options}")
    shortest_correct = min(len(option["text"]) for option in options if option["correct"])
    longest_wrong = max(len(option["text"]) for option in options if not option["correct"])
    if shortest_correct > LENGTH_MARGIN * longest_wrong:
        raise PackError(f"{qid}: the correct options are the longest by a clear margin "
                        f"({shortest_correct} vs {longest_wrong} characters); even out the option lengths")
    check_case(question["stem"], qid)
    if re.search(r"pick \d", question["stem"], re.I):
        raise PackError(f"{qid}: the stem says 'pick N'; the script adds it")
    unknown = [ref for ref in OPTION_REF.findall(question["stem"] + question["explanation"]) if ref not in ids]
    if unknown:
        raise PackError(f"{qid}: unknown option ids {unknown}")


def render_question(number: int, question: dict, rng: secrets.SystemRandom) -> tuple[str, list[str]]:
    options = list(question["options"])
    rng.shuffle(options)
    letter_of = {option["id"]: LETTERS[index] for index, option in enumerate(options)}
    correct = [letter_of[option["id"]] for option in options if option["correct"]]

    def letters(text: str) -> str:
        return OPTION_REF.sub(lambda match: letter_of[match.group(1)], text)

    pick = f" (multiple response, pick {question['multi']})" if question["multi"] else ""
    lines = [f"**Q{number}.**{pick} {letters(question['stem'])}", ""]
    lines += [f"{letter_of[option['id']]}) {option['text']}" for option in options]
    lines += ["", "<details><summary>Answer</summary>", "",
              f"**{' and '.join(correct)}.** {letters(question['explanation'])}", "</details>", ""]
    return "\n".join(lines), correct


def build(body: str, questions: object, rng: secrets.SystemRandom) -> tuple[str, list[str], int]:
    check_body(body)
    if not isinstance(questions, list) or len(questions) != 3:
        raise PackError("questions.json must be a list of 3 questions")
    for question in questions:
        check_question(question)
    if not any(question["multi"] for question in questions):
        raise PackError("no multiple-response question")
    order = list(questions)
    rng.shuffle(order)
    blocks, key = [], []
    for number, question in enumerate(order, start=1):
        block, correct = render_question(number, question, rng)
        blocks.append(block)
        key.append(f"Q{number}={'+'.join(correct)}({question['id']})")
    pack = body.replace("{{QUESTIONS}}", "\n".join(blocks).rstrip())
    if re.search(r"\{opt:|\{\{", pack):
        raise PackError("a placeholder is left in the pack")
    pack += f"\n\n---\n\n{FOOTER}\n"
    words = len(NOT_READ.sub(" ", pack).split())
    if words > MAX_WORDS:
        raise PackError(f"{words} words, the limit is about {MAX_WORDS}")
    pack = READING_LINE.sub(f"Raw reading: about {reading_minutes(words)} min", pack, count=1)
    pack += f"\n<!-- answer key, shuffled with secrets.SystemRandom: {' '.join(key)} -->\n"
    return pack, key, words


def main(body_path: str, questions_path: str, out_path: str) -> None:
    try:
        with open(body_path) as body_file, open(questions_path) as questions_file:
            body, questions = body_file.read(), json.load(questions_file)
        pack, key, words = build(body, questions, secrets.SystemRandom())
    except json.JSONDecodeError as error:
        sys.exit(f"Pack check failed: questions.json is not valid JSON: {error}")
    except (OSError, PackError) as error:
        sys.exit(f"Pack check failed: {error}")
    folder = os.path.dirname(out_path)
    if folder:
        os.makedirs(folder, exist_ok=True)
    with open(out_path, "w") as out_file:
        out_file.write(pack)
    print(f"key: {' '.join(key)}")
    print(f"words: {words}, raw reading: about {reading_minutes(words)} min")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:4])
