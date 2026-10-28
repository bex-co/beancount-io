---
name: unblock
description: Help a reader unblock a .pm worker queue in Chinese. Use for /unblock wN or requests to explain and work through a queue's blockers, using quick decision rounds for simple choices and focused conversation for complex ones. Record confirmed decisions and restore eligible work through /pm; leave implementation to the worker.
metadata: {"internal": true}
---

# Task: Help the reader unblock a worker

Usage: `/unblock <wN>` (for example, `/unblock w4`).

Explain the situation and the shortest practical path to resuming work in **plain Chinese**, even when the board is in English. Optimize for the reader's understanding and effort: investigate discoverable facts yourself, batch easy decisions, and give complex tradeoffs room for conversation. This is an interactive coordination skill; it does not implement code, deploy changes, operate external settings, send messages to others, ship, or start `/loopx`.

## 1. Find the actual blockers

- Read [the `/pm` canon](../pm/SKILL.md) and `.pm/DO_NOT_DO.md`. `/pm` owns board conventions and is the **only** workflow that writes `.pm/`; use it for every board update below rather than introducing another writer or format.
- Parse `$ARGUMENTS` as one workstream. Accept `w4`, literal `<w4>`, and `.pm/w4` (optionally with a trailing slash), all resolving to `.pm/w4`. Do not interpolate unvalidated arguments into shell commands. If absent, ask which queue; if malformed or nonexistent, explain briefly and show available workstreams. Do not create one, guess a substitute, or scan all queues' contents.
- Read that workstream's README, its `blocked/` notes and milestone READMEs, and blocked task files. Also scan open milestones for task frontmatter `status: blocked` and milestone `**Status:** blocked` or a current `## Blocked` section. A task can be blocked outside `blocked/`. Exclude every nested `done/` from discovery; read completed history only to verify a specific dependency or stale blocker.
- Use README links as context, not as the inventory: find unlisted blocked files too. Distinguish current blocking conditions from historical resolved sections; report conflicting status/path records instead of silently trusting one source. Include pending children of a parked milestone when interpreting what can resume, without counting every child as another independent blocker.
- For each blocked item, establish its stable ID and actual path, intended outcome, exact blocker, who can clear it, written **Unblock:** condition, remaining work, and relevant evidence. Follow only the linked dependencies needed to understand it, including other queues when necessary; do not turn this into a repository-wide audit.
- Verify targeted claims against current code, records, or available read-only sources before asking the reader to investigate. Distinguish **已确认**, **记录所述，尚未核实**, and **待决定**. Missing access or deployment evidence is an unknown, not proof of success. If the condition or responsible person is missing, say so and propose a concrete condition to confirm.

If there are no current blocked items, say so in Chinese and stop. Report relevant record inconsistencies separately without manufacturing decisions or editing the board.

## 2. Explain enough to make the next decision

Group items sharing the same underlying blocker into one discussion, while retaining each item's own conditions. Prioritize decisions that release useful work quickly and prerequisites that unlock other decisions. Do not ask downstream questions before their prerequisite is settled.

Open with a short orientation: blocked work items, distinct blocker groups, and the most useful first action. For a milestone, count the milestone once in this overview and mention separately blocked children only when their conditions differ. A small table helps when there are several groups; skip it for one item.

Explain each group using the following information, without forcing a long template onto a simple choice:

- **要做什么：** the user-visible outcome, in one sentence.
- **为什么卡住：** the missing decision, data, permission, dependency, or verification, and why the worker cannot proceed.
- **需要你做什么：** one specific choice or action, who owns it, and a recommendation with its main consequence.
- **怎样算解除：** observable evidence that satisfies the condition, plus what the worker can do afterward. Link the original board record; unfold technical background only when it affects the decision.

Use familiar words, explain necessary terms once, and describe consequences before implementation details. Avoid dumping task files, commit histories, or a wall of questions. Never ask for passwords, keys, or private ledger data. For an external action, give the responsible person concrete steps from the relevant documentation and the smallest non-sensitive confirmation or evidence needed; do not claim the action was performed.

For example: “代码部分已经完成，现在还需要有 GA4 编辑权限的人关闭两个自动采集选项，并验证页面查询和文件路径不再上报。完成设置和验证后，这条记录才能关闭。” A decision to do this is not evidence that the setting changed.

## 3. Choose the conversation shape

### Quick decisions

Use a short wizard for independent, well-understood choices with concise consequences. Ask at most **three questions per round**, fewer when fewer are needed. Each question should stand on its own: decision, meaningful options, recommended option when justified, and the main tradeoff. Offer “暂不决定” when deferral is meaningful; support free-text answers and requests for more context.

Prefer the host's structured question tool when available in the active mode; otherwise use numbered questions and options in chat. Wait for actual answers before dependent updates. A preselected recommendation, silence, or an unanswered question is not a decision. Record clear answers, leave skipped items blocked, and avoid asking for a second confirmation unless the reply is ambiguous or new consequences change the choice.

### Complex situations

Use a focused conversation in the **current chat** when choices depend on one another, the goal is unclear, or tradeoffs need explanation. Summarize the situation, why it matters, the feasible alternatives and your recommendation; then ask the single most useful question. Address concerns and narrow the decision before moving on. Do not squeeze a complex situation into arbitrary yes/no choices or automatically create another chat.

For a mixed queue, handle independent easy decisions first, then take complex groups one at a time. Allow the reader to reorder or skip. If they want to continue elsewhere, provide a short Chinese handoff with facts, open question, relevant links, and what would let the worker resume.

## 4. Record decisions and return eligible work

Invocation authorizes the `/pm` board updates needed to record explicit answers and verified outcomes. Load and follow `/pm` in this agent if the host cannot invoke a sibling skill directly; slash commands are workflows, not shell executables. Do not request blanket approval again.

- **A decision is clear, but other conditions remain:** use `/pm block <item-id> <updated reason>` to update the existing block in place. Include the dated confirmed decision and rationale, remaining condition, responsible person, and next verification step. Keep the item blocked and preserve earlier decisions and evidence. Do not substitute “approved” for a required deployed capability or real-world check.
- **All unblock conditions hold and work remains:** use `/pm unblock <item-id>`. A clear user choice can itself satisfy a decision-only blocker; retain that choice, its date and rationale in the resolution record so the worker can act without asking again. For other conditions, record the evidence actually checked. Release each item only when its own conditions hold, even if it shares a blocker with others.
- **The item's acceptance criteria already hold:** use `/pm done <item-id>` directly, following its evidence and archival requirements; do not restore already completed work to `todo` first or invent a shipped SHA. Resolving a blocker does not by itself complete an implementation task.
- **A parked milestone has some children still blocked:** follow `/pm`'s path, ID, status and link conventions. Do not mark those children ready or describe the whole milestone as unblocked. Record partial progress and retain remaining blockers; check the actual next actionable task and its dependencies before claiming the worker can resume.
- **The answer is deferred, ambiguous, or evidence is unavailable:** keep it blocked. Clarify only what matters or give the exact external action/evidence needed. Do not weaken acceptance criteria, drop work, or modify unrelated queues to make the summary look successful.

Re-read affected records after `/pm` updates to verify the applicable move/status/link exit conditions. Preserve public-board privacy: write only non-sensitive decisions and evidence, not raw conversation, credentials, private URLs, or private-repository details. Do not commit or push as part of this command.

End each completed pass with a concise Chinese handoff: **已解除／已完成**, **仍在等待什么、由谁处理**, and **worker 接下来可以做什么** with item IDs. Distinguish decisions merely recorded from blockers actually cleared. If actionable work exists, provide the relevant `/loopx wN` invocation as a next step without launching it.

## Arguments

$ARGUMENTS
