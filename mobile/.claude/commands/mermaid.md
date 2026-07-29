---
description: Draw a concise, syntax-verified Mermaid architecture diagram from a description
argument-hint: "<what to diagram — a description, or a repo component/doc>"
allowed-tools: Bash(npx -y @mermaid-js/mermaid-cli:*), Write, Read
---

Draw a Mermaid architecture diagram in Markdown for: $ARGUMENTS

## Conventions

- **Boxes are services/components**: `app[mobile app]`. Use `[(...)]` for datastores. Humans (user, developer, operator) are triangles: `user@{ shape: tri, label: "user" }`.
- **A box that is not a long-running service must say so in its label** — readers assume boxes are services and ask "where is this running?". Mark scheduled/ephemeral work (`job["sync task (started on demand, exits when done)"]`) and inert config objects (`config["app config (static configuration)"]`). Draw humans as triangles: `operator@{ shape: tri, label: "operator" }`. Never draw a manual procedure as a peer box of running infrastructure: give manual flows their own subgraph whose title says they are manual and where they run (`subgraph "recovery — manual procedure, developer workstation"`), with the human actor inside.
- **Arrows are dependency direction**: `A --> B` means A depends on (calls, reads, writes, or deploys to) B — never the reverse.
- **Concise but to the point**: only load-bearing services and edges. No styling, no colors, no legend. Label an edge (`A -->|GraphQL| B`) only when the relationship is not obvious. Default to `flowchart TB`; use `LR` only if the graph is much wider than deep. Use `subgraph` only for real boundaries (process, device, network, trust zone, automated vs. manual) — subgraphs are how the diagram answers "where does this run?". An edge may target a whole subgraph by id (`subgraph mobile["mobile app"]` … `user --> mobile`).
- If $ARGUMENTS refers to this repo, read the relevant docs and code first. Start with `../CLAUDE.md` for monorepo policy and `CLAUDE.md` for the mobile architecture map; do not diagram from guesswork.

Syntax gotchas that break rendering: quote labels containing `(`, `)`, `[`, `{`, or `-->`-like text (`a["Queue (SQS)"]`); never name a node bare `end` or `graph`; subgraph titles with spaces need quotes.

## Verify (mandatory, before answering)

1. Write the diagram body (without the ` ```mermaid ` fence) to a unique `.mmd` file under `tmp/`, the repository's gitignored scratch directory.
2. Run `npx -y @mermaid-js/mermaid-cli -i <file>.mmd -o <file>.svg` — exit 0 means the syntax is valid. The first run may download a headless browser; that is expected.
3. On failure, read the parse error, fix the diagram, and re-verify. Never output a diagram that has not passed.

## Output

Return a single ` ```mermaid ` fenced block, followed by at most two sentences explaining the key dependency flow. If the user asked to put the diagram into a file, insert the verified block there instead.
