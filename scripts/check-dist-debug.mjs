import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

// Probe the public behavior in fresh processes with no inherited debug flags.
// This keeps working when the build's flag or local constant is renamed.
const files = process.argv.slice(2)
for (const file of files.length ? files : ['dist/index.js', 'dist/index.cjs']) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict'
    const { IntervalTree } = await import(${JSON.stringify(pathToFileURL(resolve(file)).href)})
    let checks = 0
    const verify = IntervalTree.prototype.verify
    IntervalTree.prototype.verify = function () {
      checks++
      return verify.call(this)
    }
    const tree = new IntervalTree()
    tree.addInterval(0, 10)
    tree.addInterval(5, 15)
    tree.mergeOverlaps()
    tree.chop(3, 4)
    tree.chopAll([[0, 1], [5, 6], [7, 8], [9, 10]])
    tree.removeEnveloped(0, 3)
    tree.clone()
    tree.difference(IntervalTree.fromTuples([[12, 13]]))
    assert.equal(checks, 0, 'automatic invariant checks must be off by default')
    tree.verify()
    assert.equal(checks, 1, 'explicit verification must still work')
  `], { env: {}, encoding: 'utf8' })
  if (result.error)
    throw result.error
  if (result.status !== 0)
    throw new Error(`${file}: dist debug behavior check failed\n${result.stderr}`)
}
