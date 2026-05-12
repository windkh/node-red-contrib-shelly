# Architecture documentation

This folder contains a structured analysis of `node-red-contrib-shelly`. Start with the [Overview](01-overview.md) for the big picture, then drill into the specific chapter that answers your question.

| # | Chapter | What it answers |
|---|---|---|
| 01 | [Overview](01-overview.md) | What is this package, who is it for, what does it do at a glance? |
| 02 | [Structural Design](02-structural-design.md) | How is the code organised? What depends on what? |
| 03 | [Behavioural Design](03-behavioural-design.md) | What happens at runtime — lifecycle, message flow, state? |
| 04 | [Architecture Decisions](04-architecture-decisions.md) | Why is it built the way it is? (Index of [ADRs](adrs/)) |
| 05 | [Errors and Weaknesses](05-errors-and-weaknesses.md) | What's broken or fragile today? |
| 06 | [Recommendations for Refactoring](06-recommendations-for-refactoring.md) | What should we change and how? |
| 07 | [Future Improvements](07-future-improvements.md) | What features / capabilities are worth pursuing? |
| 08 | [Statistics](08-statistics.md) | LOC, coverage, quality index. |

Audience: contributors and reviewers who need to understand the codebase beyond what reading a single file tells you. The chapters cross-reference source files using clickable links — works in any Markdown viewer that resolves relative paths (GitHub, VS Code preview, IDE markdown renderers).

Last regenerated: 2026-05-11 against [`V11.10.1`](https://github.com/windkh/node-red-contrib-shelly/releases/tag/V11.10.1).
