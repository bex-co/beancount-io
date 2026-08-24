FROM docker.io/cloudflare/sandbox:0.6.7
# pnpm is used by the AI SDK harness bridge's bootstrap recipe to install its
# in-container dependencies (m17). Without it the harness createSession fails
# with "pnpm: command not found" (exit 127).
RUN npm install -g pnpm @anthropic-ai/claude-code
RUN apt-get update && apt-get install -y python3 python3-pip && pip3 install beancount
ENV COMMAND_TIMEOUT_MS=300000
# The container runs Claude Code as root; its `--dangerously-skip-permissions`
# mode (used by the harness for auto-approved, non-interactive tool execution)
# refuses to run as root unless IS_SANDBOX is set. This image IS an isolated,
# ephemeral sandbox, which is exactly what that flag is for.
ENV IS_SANDBOX=1
EXPOSE 3000
