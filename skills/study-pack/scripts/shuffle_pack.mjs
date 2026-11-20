// Node port of shuffle_pack.py, for machines without Python: the same checks, the same output.
// Usage: node shuffle_pack.mjs <body.md> <questions.json> <out.md>
// Question order and option order come from crypto.randomInt, so answer letters are truly random.
// Exits non-zero with a message, and writes nothing, when the pack breaks a rule.
import { randomInt } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const LETTERS = 'ABCDEFGH'
const OPTION_ID = /^[a-z0-9_]+$/
const OPTION_REF = /\{opt:([^}]*)\}/g
const WORDS_PER_MINUTE = 200
const MAX_WORDS = 2400
const LENGTH_MARGIN = 1.2
const FOOTER = '*Practice questions written for this pack from the public CCAR-F exam guide and the Claude docs. '
  + "They are not exam content: the exam's questions, options and scenarios are confidential under its NDA.*"
const SCENARIOS = ['Customer Support Resolution Agent', 'Code Generation with Claude Code', 'Multi-Agent Research System',
  'Developer Productivity with Claude', 'Claude Code for Continuous Integration', 'Structured Data Extraction']
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const SCENARIO = new RegExp(`\\*\\*Scenario: (${SCENARIOS.map(escapeRegex).join('|')})\\.?\\*\\*`)
const EVIDENCE = /\*\*(Production logs show|Developers report|Production data shows):\*\*/
const GUESS = /\*\*Your guess:\*\*/
const REVEAL_FIELDS = ['Fix', 'Mechanism', 'The one thing that matters most']
const READING_LINE = /^Raw reading:[^\n]*?(?=\. With|$)/m
const FENCE = /^(`{3,}|~{3,})/
const NOT_READ = /<!--[\s\S]*?-->|<\/?(?:details|summary)>/g

class PackError extends Error {}

function readingMinutes(words) {
  const exact = words / WORDS_PER_MINUTE
  const floor = Math.floor(exact)
  const rounded = exact - floor === 0.5 ? (floor % 2 === 0 ? floor : floor + 1) : Math.round(exact)
  return Math.max(1, rounded)
}

function shuffled(items) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index--) {
    const other = randomInt(index + 1)
    ;[copy[index], copy[other]] = [copy[other], copy[index]]
  }
  return copy
}

function checkCase(text, where) {
  const parts = [["'**Scenario: <exact guide name>**'", SCENARIO], ['an evidence label', EVIDENCE],
    ["'**Your guess:**'", GUESS]]
  for (const [name, pattern] of parts) {
    if (!pattern.test(text)) throw new PackError(`${where}: missing ${name}`)
  }
}

function section(body, start, end) {
  const match = body.match(new RegExp(`${escapeRegex(start)}([\\s\\S]*?)${escapeRegex(end)}`))
  if (!match) throw new PackError(`body.md: no section from '${start}' to '${end}'`)
  return match[1]
}

function closes(line, fence) {
  const mark = line.trim()
  return mark.length >= fence.length && [...mark].every((character) => character === fence[0])
}

function codeBlocks(body) {
  const blocks = []
  let current = []
  let fence = null
  for (const line of body.split('\n')) {
    if (fence === null) {
      const match = line.match(FENCE)
      if (match) {
        fence = match[1]
        current = []
      }
    } else if (closes(line, fence)) {
      blocks.push(current)
      fence = null
    } else {
      current.push(line)
    }
  }
  if (fence !== null) throw new PackError('body.md: a code block is never closed')
  return blocks
}

function checkBody(body) {
  if (!body.includes('{{QUESTIONS}}')) throw new PackError('body.md has no {{QUESTIONS}} placeholder')
  if (!READING_LINE.test(body)) throw new PackError("body.md has no 'Raw reading:' line")
  checkCase(section(body, '## 1.', '### Reveal'), 'teaching case')
  const fields = [...section(body, '### Reveal', '## 2.').matchAll(/^\*\*([^*]+?):\*\*/gm)].map((match) => match[1])
  if (JSON.stringify(fields) !== JSON.stringify(REVEAL_FIELDS)) {
    throw new PackError(`reveal fields are ${JSON.stringify(fields)}, expected ${JSON.stringify(REVEAL_FIELDS)}`)
  }
  for (const lines of codeBlocks(body)) {
    const separator = lines.indexOf('---')
    if (separator > 0 && lines.slice(0, separator).every((line) => !line.trim())) {
      throw new PackError("a code block has blank lines before its frontmatter; '---' must be on line 1")
    }
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function checkQuestion(question) {
  if (!isRecord(question)) throw new PackError(`each question must be an object, got ${JSON.stringify(question)}`)
  const qid = question.id ?? '?'
  for (const field of ['id', 'stem', 'explanation']) {
    if (typeof question[field] !== 'string' || !question[field].trim()) {
      throw new PackError(`${qid}: '${field}' must be a non-empty string`)
    }
  }
  const multi = question.multi
  if (!Number.isInteger(multi) || multi === 1 || multi < 0) {
    throw new PackError(`${qid}: 'multi' must be the integer 0 or the number to pick (2 or more), got ${JSON.stringify(multi)}`)
  }
  const options = question.options
  if (!Array.isArray(options) || !options.every(isRecord)) throw new PackError(`${qid}: 'options' must be a list of objects`)
  for (const option of options) {
    if (typeof option.id !== 'string' || typeof option.text !== 'string' || typeof option.correct !== 'boolean') {
      throw new PackError(`${qid}: each option needs a string 'id' and 'text' and a true/false 'correct': ${JSON.stringify(option)}`)
    }
  }
  const ids = options.map((option) => option.id)
  if (new Set(ids).size !== ids.length || !ids.every((id) => OPTION_ID.test(id))) {
    throw new PackError(`${qid}: option ids must be unique and match [a-z0-9_]+: ${JSON.stringify(ids)}`)
  }
  const correct = options.filter((option) => option.correct).length
  const expectedCorrect = multi || 1
  if (correct !== expectedCorrect) throw new PackError(`${qid}: ${correct} correct options, expected ${expectedCorrect}`)
  const expectedOptions = multi ? 5 : 4
  if (options.length !== expectedOptions) {
    throw new PackError(`${qid}: ${options.length} options, expected ${expectedOptions}`)
  }
  const shortestCorrect = Math.min(...options.filter((option) => option.correct).map((option) => option.text.length))
  const longestWrong = Math.max(...options.filter((option) => !option.correct).map((option) => option.text.length))
  if (shortestCorrect > LENGTH_MARGIN * longestWrong) {
    throw new PackError(`${qid}: the correct options are the longest by a clear margin `
      + `(${shortestCorrect} vs ${longestWrong} characters); even out the option lengths`)
  }
  checkCase(question.stem, qid)
  if (/pick \d/i.test(question.stem)) throw new PackError(`${qid}: the stem says 'pick N'; the script adds it`)
  const unknown = [...(question.stem + question.explanation).matchAll(OPTION_REF)]
    .map((match) => match[1]).filter((ref) => !ids.includes(ref))
  if (unknown.length) throw new PackError(`${qid}: unknown option ids ${JSON.stringify(unknown)}`)
}

function renderQuestion(number, question) {
  const options = shuffled(question.options)
  const letterOf = Object.fromEntries(options.map((option, index) => [option.id, LETTERS[index]]))
  const correct = options.filter((option) => option.correct).map((option) => letterOf[option.id])
  const letters = (text) => text.replace(OPTION_REF, (_, id) => letterOf[id])
  const pick = question.multi ? ` (multiple response, pick ${question.multi})` : ''
  const lines = [`**Q${number}.**${pick} ${letters(question.stem)}`, '',
    ...options.map((option) => `${letterOf[option.id]}) ${option.text}`),
    '', '<details><summary>Answer</summary>', '',
    `**${correct.join(' and ')}.** ${letters(question.explanation)}`, '</details>', '']
  return [lines.join('\n'), correct]
}

function build(body, questions) {
  checkBody(body)
  if (!Array.isArray(questions) || questions.length !== 3) throw new PackError('questions.json must be a list of 3 questions')
  questions.forEach(checkQuestion)
  if (!questions.some((question) => question.multi)) throw new PackError('no multiple-response question')
  const blocks = []
  const key = []
  shuffled(questions).forEach((question, index) => {
    const [block, correct] = renderQuestion(index + 1, question)
    blocks.push(block)
    key.push(`Q${index + 1}=${correct.join('+')}(${question.id})`)
  })
  let pack = body.replace('{{QUESTIONS}}', () => blocks.join('\n').trimEnd())
  if (/\{opt:|\{\{/.test(pack)) throw new PackError('a placeholder is left in the pack')
  pack += `\n\n---\n\n${FOOTER}\n`
  const words = pack.replace(NOT_READ, ' ').split(/\s+/).filter(Boolean).length
  if (words > MAX_WORDS) throw new PackError(`${words} words, the limit is about ${MAX_WORDS}`)
  pack = pack.replace(READING_LINE, `Raw reading: about ${readingMinutes(words)} min`)
  pack += `\n<!-- answer key, shuffled with crypto.randomInt: ${key.join(' ')} -->\n`
  return { pack, key, words }
}

function main([bodyPath, questionsPath, outPath]) {
  let result
  try {
    const body = readFileSync(bodyPath, 'utf8')
    const text = readFileSync(questionsPath, 'utf8')
    let questions
    try {
      questions = JSON.parse(text)
    } catch (error) {
      throw new PackError(`questions.json is not valid JSON: ${error.message}`)
    }
    result = build(body, questions)
  } catch (error) {
    if (!(error instanceof PackError) && !error.code) throw error
    console.error(`Pack check failed: ${error.message}`)
    process.exit(1)
  }
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, result.pack)
  console.log(`key: ${result.key.join(' ')}`)
  console.log(`words: ${result.words}, raw reading: about ${readingMinutes(result.words)} min`)
}

const argv = process.argv.slice(2)
if (argv.length !== 3) {
  console.error('Usage: node shuffle_pack.mjs <body.md> <questions.json> <out.md>')
  process.exit(1)
}
main(argv)
