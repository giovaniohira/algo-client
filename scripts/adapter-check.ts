import { outcomeFromResult } from '../src/main/platform/adapter'
import { formatSolutionContent } from '../src/main/platform/solution-content'

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg)
}

assert(outcomeFromResult({ state: 'SUCCESS', statusMsg: 'Accepted', runSuccess: true }) === 'accepted', 'accepted')
assert(outcomeFromResult({ state: 'SUCCESS', statusMsg: 'Time Limit Exceeded', runSuccess: false }) === 'tle', 'tle')
assert(outcomeFromResult({ state: 'SUCCESS', statusMsg: 'Wrong Answer', runSuccess: false }) === 'wrong', 'wrong')

const sample = '# Intuition\\n\\nUse a **hash table**.\\n\\n```python\\nreturn [0, 1]\\n```'
const html = formatSolutionContent(sample)
assert(html.includes('<h1>Intuition</h1>'), 'solution heading')
assert(html.includes('<strong>hash table</strong>'), 'solution bold')
assert(html.includes('solution-code-single'), 'solution code block')

const escaped = "Let\\'s use $$O(n^2)$$ and \\u2191 arrow\\n---\\n![thumb](https://example.com/a.png)"
const rich = formatSolutionContent(escaped)
assert(rich.includes("Let's use"), 'apostrophe')
assert(rich.includes('<sup>2</sup>'), 'math superscript')
assert(rich.includes('↑'), 'unicode arrow')
assert(rich.includes('<hr'), 'horizontal rule')
assert(rich.includes('<img'), 'image')

const multi = '```python\\nx = 1\\n```\\n```java\\nint x = 1;\\n```'
const multiHtml = formatSolutionContent(multi)
assert(multiHtml.includes('solution-code-tabs'), 'code tabs')
assert(multiHtml.includes('Python'), 'python tab')
assert(multiHtml.includes('Java'), 'java tab')

console.log('adapter self-check ok')
