# /endofday — wrap up the working day

Verify state, write today's session summary, update PROJECT-STATUS.md, commit and push
everything, confirm it deployed, report done.

Adapted from the wise-brokerage template. Differences that matter here: there is no test
suite, the toolchain needs Node 22, and a push is not finished until Cloudflare has the
build — so this checks the deploy rather than stopping at `git push`.

## Steps

1. Use Node 22 for everything below (`.nvmrc` pins it):

   ```bash
   export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH"
   ```

2. Run verification:
   - `npm run check` — Astro check plus `tsc` over the Cloudflare functions. Must be clean.
   - `npm run build` — must succeed.

   There is no test suite; the build and typecheck are the gate. If either fails, STOP and
   report. Do not wrap a broken state.

3. Run state diagnostic:
   - `git status`
   - `git log --oneline origin/main..HEAD` (commits not yet on origin)
   - Identify any uncommitted changes.

   Check nothing untracked has crept in that should not be committed — photo originals,
   preview copies, secrets. `src/assets/photos/` is committed; the library outside the repo
   is not.

4. If there are uncommitted changes representing logical units of work, commit them as
   logical commits per the `/checkpoint` pattern. Do this BEFORE writing the session summary
   so the summary captures the final state.

5. Write today's session summary as `docs/sessions/SESSION-SUMMARY-YYYY-MM-DD.md`:

```markdown
# Session Summary — <date>

## What landed today

<bulleted list of meaningful work items, with commit SHAs>

## Decisions taken

<key decisions, with rationale — especially anything that departs from the brief>

## Bugs found and fixed

<what broke, how it was caught, what the fix was>

## Open items / pending decisions

<anything left for next session, and anything waiting on Toby>

## Tomorrow's planned work

<what's next>

## State at end of session

- Branch: <name>
- Last commit: <SHA> — <message>
- Working tree: clean
- Deployed: <deployment SHA and result>
- Live: <URL and status>
```

6. Update the "Current state" section at the top of `PROJECT-STATUS.md`. If it does not
   exist, create it:

```markdown
## Current state

Last updated: <YYYY-MM-DD>
Working branch: main
Last commit: <SHA short> — <message>
Live at: https://secondsummit.uk (<status>)
Preview: https://secondsummit.pages.dev
Deploy: GitHub Actions → Cloudflare Pages project `secondsummit`
Snowdonia page mode: <teaser | live>

Recent progress:
- <bulleted summary>

Waiting on Toby:
- <bulleted list>

Next planned work:
- <bulleted plan>
```

7. Commit the session summary and PROJECT-STATUS update as separate commits:
   - `docs: session summary <date>`
   - `docs: PROJECT-STATUS — end of day <date>`

8. Push:
   - `git push origin main`

9. Confirm the deploy, because a push here triggers a build and the day is not done until
   the site has it:
   - Wait for the Actions run for this commit to complete:
     `gh run list --repo r3dpill/secondsummit --limit 5 --json headSha,status,conclusion`
   - It must conclude `success`.
   - Check the live site responds: `curl -s -o /dev/null -w '%{http_code}' https://secondsummit.uk/`

   If DNS is being unreliable on this machine, pin to the Cloudflare edge rather than
   trusting the local resolver:
   `curl --resolve secondsummit.uk:443:<edge-ip> https://secondsummit.uk/`

10. Report:

```
═══ End of day complete ═══

Commits today: <count>
- <SHA1> — <message1>
- <SHA2> — <message2>

Session summary: SESSION-SUMMARY-<date>.md committed and pushed
PROJECT-STATUS: updated and pushed
Working tree: clean
Branch: main
On origin: yes
Deployed: <SHA> — <success | failed>
Live: <status code>

Waiting on Toby:
- <anything blocking>

Wrapping for the day.
```

11. Do not start any new work after this point.
