import { resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

/** Includes merged PRs: release-please can stall on a label left on a merged release. */
export async function findStalledReleases(repository, token, request = fetch) {
  if (!repository || !token)
    throw new Error('GITHUB_REPOSITORY and GH_TOKEN are required')
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const base = `https://api.github.com/repos/${repository}`
  const stalled = []
  for (let page = 1; ; page++) {
    const response = await request(`${base}/pulls?state=all&per_page=100&page=${page}`, { headers })
    if (!response.ok)
      throw new Error(`Cannot inspect release PRs: HTTP ${response.status}`)
    const pulls = await response.json()
    for (const pr of pulls) {
      // An abandoned, unmerged PR cannot hold up a release.
      if (pr.state === 'closed' && !pr.merged_at)
        continue
      if (!pr.labels.some(label => label.name === 'autorelease: pending'))
        continue
      const version = pr.title.match(/\brelease\s+(\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?)(?:\s|$)/)?.[1]
      if (!version)
        throw new Error(`Cannot determine the version of pending release PR #${pr.number}`)
      const tag = `v${version}`
      const tagged = await request(`${base}/git/ref/tags/${encodeURIComponent(tag)}`, { headers })
      if (tagged.ok)
        stalled.push({ number: pr.number, tag, url: pr.html_url })
      else if (tagged.status !== 404)
        throw new Error(`Cannot inspect ${tag}: HTTP ${tagged.status}`)
    }
    if (pulls.length < 100)
      return stalled
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const stalled = await findStalledReleases(process.env.GITHUB_REPOSITORY, process.env.GH_TOKEN)
  if (stalled.length) {
    for (const pr of stalled)
      process.stderr.write(`Release PR #${pr.number} still has autorelease: pending after ${pr.tag} exists: ${pr.url}\n`)
    process.exitCode = 1
  }
  else {
    process.stdout.write('Release labels are healthy.\n')
  }
}
