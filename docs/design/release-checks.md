# Release checks

The release CI job packs this checkout and installs the tarball into a fresh
Focuster checkout. It runs the actual `imports/schedule/domain/freelist` Vitest
specs, using Focuster's own configuration and Meteor stubs. The check covers
the generic collection API used by the scheduler; it does not exercise the
Meteor server or browser.

Focuster is private. Configure `FOCUSTER_READ_TOKEN` with read-only contents
access to `hexsprite/focuster`. Until that token is supplied, checkout uses the
existing `RELEASE_PLEASE_TOKEN`, which must also be allowed to read Focuster.
An authentication failure fails the job. The private checkout runs only for
release-please branches in this repository, and checkout does not persist
credentials. Dependency and test steps receive neither token in their env.

For a local check, install Focuster's normal dependencies, pack intervaltree,
then run:

```bash
pnpm pack --pack-destination /tmp/intervaltree-candidate
bash scripts/check-focuster-compat.sh /absolute/path/to/focuster /tmp/intervaltree-candidate/intervaltree-2.1.0.tgz
```

The script overrides the installed package without changing the consumer's
manifest or lockfile. Use a disposable checkout for candidate checks.

The separate release-health workflow checks all PR pages, including merged
PRs. A pending release whose `v<version>` tag exists fails with its PR URL.
Closed PRs that were never merged are abandoned and do not block releases.
Unknown release titles and GitHub permission/network errors also fail; only
a tag lookup returning HTTP 404 counts as a tag that does not exist. It runs
on PR label/close events, branch/tag pushes, hourly, and on manual dispatch.
It reports stale state without editing labels or triggering publication.
