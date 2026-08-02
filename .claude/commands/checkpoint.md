# /checkpoint — mid-session save point

Save the current logical unit of work and push. Use when a piece of work is complete enough
to commit, before moving to the next thing.

Adapted from the wise-brokerage template: no test suite here, Node 22 required, and a push
triggers a deploy.

## Steps

1. Use Node 22:

   ```bash
   export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH"
   ```

2. Run verification:
   - `npm run check` (must be clean)
   - `npm run build` (must succeed)

   If either fails, STOP and report. Do not commit broken state.

3. Review changes:
   - `git status`
   - `git diff --stat`

   If nothing has changed since the last commit, report and stop.

   Watch for things that should not be committed: photo originals, `src/assets/_preview/`,
   anything under the photo library, `.dev.vars`.

4. Construct a commit message that:
   - Describes the logical unit of work in one short title line
   - Explains the WHY in the body, not just the WHAT
   - Names any non-obvious decision or departure from the brief
   - Records the reasoning behind design choices, since those get revisited

   Prefixes are not used in this repo — the existing history is plain imperative titles.
   Match it.

5. Commit as a single logical commit. If the changes span distinct concerns, commit them
   separately.

6. Push:
   - `git push origin main`

7. If the change affects what visitors see, confirm the deploy went green:
   - `gh run list --repo r3dpill/secondsummit --limit 3 --json headSha,status,conclusion`

8. Report:

```
═══ Checkpoint complete ═══

Commit: <SHA short> — <message title>
Pushed to: origin/main
Deploy: <success | running | n/a>
Working tree: clean

Continuing.
```

9. Continue with whatever was in progress.
