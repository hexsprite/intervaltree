import assert from 'node:assert/strict'
import { test as it } from 'node:test'
import { findStalledReleases } from '../scripts/release-health.mjs'

const pending = { number: 12, title: 'chore(master): release 2.1.0', html_url: 'https://github.com/hexsprite/intervaltree/pull/12', state: 'closed', merged_at: '2026-10-04', labels: [{ name: 'autorelease: pending' }] }
const response = (status, data) => ({ ok: status === 200, status, json: async () => data })

it('a merged pending PR fails when its tag already exists', async () => {
  const stalled = await findStalledReleases('hexsprite/intervaltree', 'test', async url =>
    url.includes('/pulls?') ? response(200, [pending]) : response(200, {}))
  assert.deepEqual(stalled, [{ number: 12, tag: 'v2.1.0', url: pending.html_url }])
})

it('an untagged pending release and an already tagged label are healthy', async () => {
  const tagged = { ...pending, labels: [{ name: 'autorelease: tagged' }] }
  assert.deepEqual(await findStalledReleases('r/p', 'test', async url =>
    url.includes('/pulls?') ? response(200, [pending, tagged]) : response(404)), [])
})

it('checks later pages and propagates permission failures', async () => {
  const ordinary = { ...pending, labels: [] }
  const request = async (url) => {
    if (new URL(url).searchParams.get('page') === '1')
      return response(200, Array.from({ length: 100 }, () => ordinary))
    if (new URL(url).searchParams.get('page') === '2')
      return response(200, [pending])
    return response(200, {})
  }
  assert.equal((await findStalledReleases('r/p', 'test', request)).length, 1)
  await assert.rejects(findStalledReleases('r/p', 'test', async url =>
    url.includes('/pulls?') ? response(200, [pending]) : response(403)), /HTTP 403/)
  await assert.rejects(findStalledReleases('r/p', 'test', async () => response(500)), /HTTP 500/)
})

it('a pending label with an unrecognized release title cannot pass silently', async () => {
  await assert.rejects(findStalledReleases('r/p', 'test', async () =>
    response(200, [{ ...pending, title: 'not a release' }])), /Cannot determine the version/)
})

it('ignores abandoned release PRs that were closed without merging', async () => {
  const abandoned = { ...pending, merged_at: null }
  assert.deepEqual(await findStalledReleases('r/p', 'test', async () => response(200, [abandoned])), [])
})
