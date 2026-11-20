"""Shuffle the practice questions of a study pack and render the final Markdown.

Usage: python3 -I shuffle_pack.py <body.md> <questions.json> <out.md>

Question order and option order come from secrets.SystemRandom, so answer letters
are truly random. Exits non-zero with a message when the pack breaks a rule.
"""
import json
import re
import secrets
import sys

LETTERS = "ABCDEFGH"
OPTION_ID = re.compile(r"^[a-z0-9_]+$")
OPTION_REF = re.compile(r"\{opt:([^}]*)\}")
WORDS_PER_MINUTE = 200
MAX_WORDS = 1500
FOOTER = ("*Practice questions written for this pack from the public CCAR-F exam guide and the Claude docs. "
          "They are not exam content: the exam's questions, options and scenarios are confidential under its NDA.*")


class PackError(Exception):
    pass


def check_question(question: dict) -> None:
    qid = question.get("id", "?")
    options = question.get("options", [])
    ids = [option.get("id", "") for option in options]
    if len(set(ids)) != len(ids) or not all(OPTION_ID.match(i) for i in ids):
        raise PackError(f"{qid}: option ids must be unique and match [a-z0-9_]+: {ids}")
    correct = sum(1 for option in options if option.get("correct"))
    multi = question.get("multi", 0)
    expected_correct = multi if multi else 1
    if correct != expected_correct:
        raise PackError(f"{qid}: {correct} correct options, expected {expected_correct}")
    expected_options = 5 if multi else 4
    if len(options) != expected_options:
        raise PackError(f"{qid}: {len(options)} options, expected {expected_options}")
    text = question["stem"] + question["explanation"]
    unknown = [ref for ref in OPTION_REF.findall(text) if ref not in ids]
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


def build(body: str, questions: list[dict], rng: secrets.SystemRandom) -> tuple[str, list[str]]:
    if "{{QUESTIONS}}" not in body:
        raise PackError("body.md has no {{QUESTIONS}} placeholder")
    if len(questions) != 3:
        raise PackError(f"{len(questions)} questions, expected 3")
    if not any(question.get("multi") for question in questions):
        raise PackError("no multiple-response question")
    for question in questions:
        check_question(question)
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
    pack += f"\n<!-- answer key, shuffled with secrets.SystemRandom: {' '.join(key)} -->\n"
    return pack, key


def main(body_path: str, questions_path: str, out_path: str) -> None:
    with open(body_path) as body_file, open(questions_path) as questions_file:
        body, questions = body_file.read(), json.load(questions_file)
    try:
        pack, key = build(body, questions, secrets.SystemRandom())
    except PackError as error:
        sys.exit(f"Pack check failed: {error}")
    words = len(re.sub(r"<!--.*?-->|<[^>]+>", " ", pack, flags=re.S).split())
    minutes = max(1, round(words / WORDS_PER_MINUTE))
    pack = re.sub(r"Raw reading: about \d+ min", f"Raw reading: about {minutes} min", pack, count=1)
    with open(out_path, "w") as out_file:
        out_file.write(pack)
    print(f"key: {' '.join(key)}")
    print(f"words: {words}, raw reading: about {minutes} min")
    if words > MAX_WORDS:
        sys.exit(f"Pack check failed: {words} words, the limit is about {MAX_WORDS}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:4])
