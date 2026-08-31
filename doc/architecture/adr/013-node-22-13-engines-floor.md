# 013 — Node 22.13 is the engines floor; Node 20 is dropped in 12.0.0

- **Status:** Accepted
- **Date:** 2026-08-31

## Context

`engines.node` said `>=20.0.0` from before this repo adopted `node-red-standards`. The standard
has since raised its own floor to `>=22.13.0` and its `standards-check` audit enforces it as a
hard rule, so every pull request in this repo went red at once — including four that had nothing
to do with Node versions. The audit is deliberately unpinned
(`npx --yes github:windkh/node-red-standards audit`, which its own "Unpinned reference to the
standard" rule requires), so the failure arrived without any commit here.

The floor is not arbitrary. 22.13.0 is ESLint 10's own floor on the 22 line
(`^20.19.0 || ^22.13.0 || >=24`), and this repo mandates ESLint 10. Keeping `>=20.0.0` therefore
advertised a range the toolchain would not actually install on: a contributor on Node 20.0–20.18
got an `EBADENGINE` warning from a floor we had set ourselves. 22.13 also clears `node-red@5`,
which needs `>=22.9`.

The audit offers no waiver for this rule. `package.json["node-red-standards"].allowDrift` is a
set of **file paths** consumed only by the files-drift check, and `severity: 'warn'` is set in
the standard's source on that one check alone — there is no repo-side setting that downgrades
the engines rule. Pinning the workflow to an older revision of the standard only trades this
failure for the unpinned-reference failure. So the choices were to change the shared standard
for every repo that uses it, or to move this repo's floor.

## Decision

Raise `engines.node` to `>=22.13.0` and release it as **12.0.0**.

Dropping a supported runtime is a breaking change for consumers, and this repo's rules require a
major bump with an ADR rather than folding it into a patch. It is therefore released on its own
rather than riding along with the dependency bumps that surfaced it.

The CI matrix moves from `[20.x, 22.x]` to `[22.x, 24.x]` in both `node.js.yml` and the `verify`
job of `npm-publish.yml`, matching the standard's templates. The publish job stays pinned to
`22.x`: it satisfies the new floor, and the template's comment warns that resolving a `>=` range
would put releases on whatever Node major exists that day.

## Consequences

- Node-RED installations on Node 20 cannot upgrade past 11.12.3. Node 20 entered maintenance and
  some users are still on it, so this is a real cut, not a formality — that is what makes it a
  major.
- Manage Palette will not offer 12.x to those users, because npm respects `engines` on install;
  they stay on 11.12.3, which continues to work.
- The `EBADENGINE` mismatch between the declared range and what ESLint 10 installs on is gone.
- `standards-check` goes green, and future pull requests are judged on their own content again.
- Nothing in the runtime code changes. No API, message contract, or device behaviour is affected;
  a flow that works on 11.12.3 works unchanged on 12.0.0 given a supported Node.
