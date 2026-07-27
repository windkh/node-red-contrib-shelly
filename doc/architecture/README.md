# Architecture documentation

This folder contains a structured analysis of `node-red-contrib-shelly`. Start with the [Overview](overview.md) for the big picture, then drill into the specific chapter that answers your question.

| #   | Chapter                                                               | What it answers                                                   |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 01  | [Overview](overview.md)                                               | What is this package, who is it for, what does it do at a glance? |
| 02  | [Structural Design](structural-design.md)                             | How is the code organised? What depends on what?                  |
| 03  | [Behavioural Design](behavioural-design.md)                           | What happens at runtime — lifecycle, message flow, state?         |
| 04  | [Architecture Decisions](architecture-decisions.md)                   | Why is it built the way it is? (Index of [ADRs](adr/))            |
| 05  | [Errors and Weaknesses](errors-and-weaknesses.md)                     | What's broken or fragile today?                                   |
| 06  | [Recommendations for Refactoring](recommendations-for-refactoring.md) | What should we change and how?                                    |
| 07  | [Future Improvements](future-improvements.md)                         | What features / capabilities are worth pursuing?                  |
| 08  | [Statistics](statistics.md)                                           | LOC, coverage, quality index.                                     |

Audience: contributors and reviewers who need to understand the codebase beyond what reading a single file tells you. The chapters cross-reference source files using clickable links — works in any Markdown viewer that resolves relative paths (GitHub, VS Code preview, IDE markdown renderers).

Last regenerated: 2026-05-11 against [`V11.10.1`](https://github.com/windkh/node-red-contrib-shelly/releases/tag/V11.10.1).
