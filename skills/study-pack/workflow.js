export const meta = {
  name: 'ccar-f-study-pack',
  description: 'Research, judge, write, review and fix a CCAR-F study pack for one exam guide task',
  phases: [
    { title: 'Research', detail: 'exam guide and Claude docs in parallel' },
    { title: 'Judge', detail: 'keep, drop or flag each fact; plan the parts' },
    { title: 'Write', detail: 'body.md and questions.json per part' },
    { title: 'Review', detail: 'independent check against the pack format' },
    { title: 'Fix', detail: 'apply the review' },
  ],
}

const { task, skillDir, workDir, learner } = args
const stages = `${skillDir}/references/stages.md`
const format = `${skillDir}/references/pack-format.md`
const inputs = [
  `Task: ${task}`,
  `Work folder: ${workDir}`,
  `Guide text: ${workDir}/guide.txt`,
  `Pack format: ${format}`,
  `Learner context: ${learner || 'none'}`,
].join('\n')

function stage(name, extra) {
  return `Read ${stages}, section "${name}", and follow it.\n\n${inputs}${extra ? `\n\n${extra}` : ''}`
}

const FACTS = {
  type: 'object',
  properties: {
    facts: {
      type: 'array',
      items: {
        type: 'object',
        properties: { claim: { type: 'string' }, source: { type: 'string' } },
        required: ['claim', 'source'],
      },
    },
    notes: { type: 'string' },
  },
  required: ['facts'],
}

const PLAN = {
  type: 'object',
  properties: {
    kept: { type: 'array', items: { type: 'string' } },
    flagged: { type: 'array', items: { type: 'string' } },
    parts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          plan: { type: 'string' },
          wordEstimate: { type: 'number' },
        },
        required: ['id', 'title', 'plan'],
      },
    },
  },
  required: ['kept', 'parts'],
}

const REVIEW = {
  type: 'object',
  properties: {
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: { where: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' } },
        required: ['where', 'problem', 'fix'],
      },
    },
  },
  required: ['issues'],
}

phase('Research')
const [guide, docs] = await parallel([
  () => agent(stage('Research: guide'), { label: 'research:guide', schema: FACTS }),
  () => agent(stage('Research: docs'), { label: 'research:docs', schema: FACTS }),
])
if (!guide) throw new Error('The guide research returned nothing; check that guide.txt holds the task.')

phase('Judge')
const plan = await agent(
  stage('Judge', `Guide research:\n${JSON.stringify(guide)}\n\nDocs research:\n${JSON.stringify(docs || { facts: [], notes: 'docs research failed' })}`),
  { label: 'judge', schema: PLAN },
)
log(`Parts: ${plan.parts.map(p => p.id).join(', ')}`)
const facts = `Kept facts:\n${plan.kept.join('\n')}\n\nFlagged:\n${(plan.flagged || []).join('\n') || 'none'}`

const parts = await pipeline(
  plan.parts,
  part => agent(
    stage('Write', `Part id: ${part.id}\nPart folder: ${workDir}/${part.id}\nPart title: ${part.title}\nPart plan:\n${part.plan}\n\n${facts}`),
    { label: `write:${part.id}`, phase: 'Write' },
  ),
  (_, part) => agent(
    stage('Review', `Part folder: ${workDir}/${part.id}\n\n${facts}`),
    { label: `review:${part.id}`, phase: 'Review', schema: REVIEW },
  ),
  (review, part) => review.issues.length === 0
    ? `No issues for ${part.id}`
    : agent(
      stage('Fix', `Part folder: ${workDir}/${part.id}\n\nReview issues:\n${JSON.stringify(review.issues, null, 2)}`),
      { label: `fix:${part.id}`, phase: 'Fix' },
    ),
)

return plan.parts.map((part, index) => ({
  id: part.id,
  title: part.title,
  folder: `${workDir}/${part.id}`,
  result: parts[index],
}))
