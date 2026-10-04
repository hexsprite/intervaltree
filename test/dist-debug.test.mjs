import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { test as it } from 'node:test'

it('the dist guard survives renaming and rejects frozen-on builds in both formats', () => {
  const dir = mkdtempSync(join(tmpdir(), 'intervaltree-debug-'))
  try {
    for (const extension of ['js', 'cjs']) {
      const renamed = readFileSync(`dist/index.${extension}`, 'utf8')
        .replaceAll('INTERVALTREE_DEBUG', 'RENAMED_FLAG')
        .replaceAll('DEBUG', 'RENAMED_CONSTANT')
      const file = join(dir, extension === 'js' ? 'index.mjs' : 'index.cjs')
      const probe = () => spawnSync(process.execPath, ['scripts/check-dist-debug.mjs', file], { encoding: 'utf8' })
      writeFileSync(file, renamed)
      assert.equal(probe().status, 0, `renamed ${extension} build must pass`)
      assert.match(renamed, /var RENAMED_CONSTANT = .*;/)
      writeFileSync(file, renamed.replace(/var RENAMED_CONSTANT = .*;/, 'var RENAMED_CONSTANT = true;'))
      const frozen = probe()
      assert.notEqual(frozen.status, 0)
      assert.match(frozen.stderr, /automatic invariant checks must be off by default/)
    }
  }
  finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
