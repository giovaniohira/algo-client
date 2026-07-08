import { outcomeFromResult } from '../src/main/leetcode/adapter'

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg)
}

assert(outcomeFromResult({ state: 'SUCCESS', statusMsg: 'Accepted', runSuccess: true }) === 'accepted', 'accepted')
assert(outcomeFromResult({ state: 'SUCCESS', statusMsg: 'Time Limit Exceeded', runSuccess: false }) === 'tle', 'tle')
assert(outcomeFromResult({ state: 'SUCCESS', statusMsg: 'Wrong Answer', runSuccess: false }) === 'wrong', 'wrong')

console.log('adapter self-check ok')
