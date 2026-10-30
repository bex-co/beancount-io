---
name: unblock
description: Guide the owner in Chinese through concrete actions and decisions that unblock a .pm worker queue. Use for /unblock wN or requests to help a worker move forward. Recommend what the owner can do next, use a wizard for quick choices or focused discussion for complex tradeoffs, and record outcomes through /pm; leave implementation to the worker.
metadata: {"internal": true}
---

# Task: Help the reader unblock a worker

Usage: `/unblock <wN>` (for example, `/unblock w4`).

Help the reader answer **“我现在做什么，能让 worker 继续？”** in plain Chinese, even when the board is in English. The deliverable is a practical way forward and a conversation that helps the reader take it. Success means the reader can make an informed choice, perform a concrete action, or hand a specific request to the right person. Investigating and cleaning stale records supports that outcome; a blocker inventory or status survey alone does not fulfill the command.

Investigate discoverable facts yourself, batch easy decisions, and give complex tradeoffs room for conversation. This is an interactive coordination skill; it does not implement code, deploy changes, operate external settings, send messages to others, ship, or start `/loopx`.

## 1. Prepare in the background

- Read [the `/pm` canon](../pm/SKILL.md) and `.pm/DO_NOT_DO.md`. `/pm` owns board conventions and is the **only** workflow that writes `.pm/`; use it for every board update below rather than introducing another writer or format.
- Parse `$ARGUMENTS` as one workstream. Accept `w4`, literal `<w4>`, and `.pm/w4` (optionally with a trailing slash), all resolving to `.pm/w4`. Do not interpolate unvalidated arguments into shell commands. If absent, ask which queue; if malformed or nonexistent, explain briefly and show available workstreams. Do not create one, guess a substitute, or scan all queues' contents.
- Read that workstream's README, its `blocked/` notes and milestone READMEs, and blocked task files. Also scan open milestones for task frontmatter `status: blocked` and milestone `**Status:** blocked` or a current `## Blocked` section. A task can be blocked outside `blocked/`. Exclude every nested `done/` from discovery; read completed history only to verify a specific dependency or stale blocker.
- Use README links as context, not as the inventory: find unlisted blocked files too. Distinguish current blocking conditions from historical resolved sections; report conflicting status/path records instead of silently trusting one source. Include pending children of a parked milestone when interpreting what can resume, without counting every child as another independent blocker.
- For each blocked item, establish its stable ID and actual path, intended outcome, exact blocker, who can clear it, written **Unblock:** condition, remaining work, and relevant evidence. Follow only the linked dependencies needed to understand it, including other queues when necessary; do not turn this into a repository-wide audit.
- Verify targeted claims against current code, records, or available read-only sources before asking the reader to investigate. Distinguish **已确认**, **记录所述，尚未核实**, and **待决定**. Missing access or deployment evidence is an unknown, not proof of success. If the condition or responsible person is missing, say so and propose a concrete condition to confirm.

Keep this investigation proportional to the next useful owner action. Once there is enough evidence to recommend a path, start helping the reader; do not delay for an exhaustive audit of unrelated groups. Clear verified stale items through `/pm` as below and mention those results briefly. Board housekeeping must not become the main user-facing output.

If there are no current blocked items, say so in Chinese and stop. Report relevant record inconsistencies separately without manufacturing decisions or editing the board.

## 2. Recommend what the reader can do

Group items sharing the same underlying blocker into one discussion, while retaining each item's own conditions. Prioritize decisions that release useful work quickly and prerequisites that unlock other decisions. Do not ask downstream questions before their prerequisite is settled.

Lead with the **recommended next owner action**, why it is worth doing first, and exactly which work it would release. Prefer useful work released for little owner effort, while accounting for urgency and prerequisites. Give a brief map of the other choices only if it helps the reader choose where to spend their time; counts and a full blocker table are optional background, not the default opening.

Turn the selected blocker into a doable intervention:

- **A decision:** explain the feasible choices, recommend one with its main tradeoff, and ask the reader to choose. Explain what that answer lets the worker start; do not make the reader design the solution from scratch.
- **An external setting or access:** explain what the change achieves, give the exact page/control or access request from current documentation, and say which small confirmation the reader should return. Offer to walk through the steps in this chat. When the reader cannot act, help identify the owner and draft a short handoff they can send; do not send it yourself.
- **A manual check:** give a bounded checklist with the screens or journey, expected result, and what to report. Explain what the worker will verify or repair afterward; “do an accessibility audit” is not enough guidance.
- **A technical dependency:** explain the missing capability through a concrete example, compare feasible ways to supply it, and help the reader settle the scope or owner. Separate the decision that lets upstream work begin from the deployed evidence needed to release the downstream item.
- **An unproven or obsolete candidate:** explain whether further investigation is worth the owner's effort and recommend a next step. If retirement or deferral would change the wanted scope, discuss that choice explicitly rather than leaving the reader with “find a new reproducer.”

Explain each group using the following information, without forcing a long template onto a simple choice:

- **要做什么：** the user-visible outcome, in one sentence.
- **为什么卡住：** the missing decision, data, permission, dependency, or verification, and why the worker cannot proceed.
- **需要你做什么：** one specific choice or action, who owns it, and a recommendation with its main consequence.
- **怎样算解除：** observable evidence that satisfies the condition, plus what the worker can do afterward. Link the original board record; unfold technical background only when it affects the decision.

Use familiar words, explain necessary terms once, and describe consequences before implementation details. Avoid dumping task files, commit histories, or a wall of questions. Never ask for passwords, keys, or private ledger data. For an external action, give the responsible person concrete steps from the relevant documentation and the smallest non-sensitive confirmation or evidence needed; do not claim the action was performed.

For example: “建议先处理 GA4：代码侧已完成，你能帮上的一步是用有编辑权限的账号，进入数据流的增强型衡量设置，关闭 Site search 和历史页面浏览自动采集。我可以带你逐步操作；设置后只需告诉我已改哪些选项，后续再按现有清单核对采集内容。设置和验证都完成，这条就能关闭。” A decision to do this is not evidence that the setting changed. By contrast, merely asking “已处理／未处理／不确定？” and then repeating that it remains blocked does not help the reader act.

## Phrasing a decision so the reader can answer it

The reader is deciding product behavior, not reading code. Board notes are written for workers, in file paths, internal IDs and mechanism names; a question lifted from them is unanswerable. Before asking, restate every decision with the steps below. A reader who answers "没听懂" or "我不知道你在说什么" was not given a question they could answer; that is the skill's failure. Re-explain with a fresh concrete example, never the same wording again, and offer to defer or skip.

1. **Open with a concrete scenario with numbers and a name, in the user's own terms.** "月预算 300 元,今天 10 月 21 日,已花 250 元" and "你输入商家 A,App 自动填好 Visa 和杂货;再改成一个新商家" are answerable. "a payee with no history keeps the previous fill" and "the period in progress is prorated" are not. Walk it step by step, as the user would see it on screen.
2. **Show what each option does to that same scenario.** Put the outcome beside each option: "手机显示超标 47 元(红)/ 网页显示达标(绿)". Options are described by what the user sees, never by a function, file, flag or note ID.
3. **State the choice as one plain question about behavior**, then the recommendation with its reason in one sentence ("我建议 A,因为月中就能看出花得太快").
4. **Say the price of each option in one line** in user terms: what changes for people who use the app today, what extra work or risk it carries. Name the other screen or app it changes, if any.
5. **Keep the wizard text short and the explanation in the chat text before it.** The question tool's option labels are headlines; put the scenario and examples in the message above the question, then ask. Do not use internal IDs, code names, or "reverses w21/411" as the explanation; mention them only as a trailing reference.
6. **Give a deferral that costs nothing**: "暂不决定" and "跳过" are real answers and leave the item blocked.
7. **When the reader states a preference in their own words** ("跟 fava 一致", "两个面板本来就独立"), do not force it into your options. Restate your understanding in one line and check it against the consequence ("所以虚线要画在期初并扩大 y 轴,这会让所有图变平,你仍然要吗?"). If their statement shows the item is not wanted (the behavior is by design), propose `/pm drop` with that reason rather than an implementation.
8. **Test before sending:** could a person who has never opened the code answer this in ten seconds? If a term needs a definition, replace the term with an example.

## 3. Choose the conversation shape

### Quick decisions

<<<<<<< Updated upstream
Use a short wizard for independent, well-understood choices with concise consequences. Ask at most **three questions per round**, fewer when fewer are needed. Each question should advance an intervention: decision, meaningful options, recommended option when justified, main tradeoff, and what the worker can do with the answer. Ask about existing completion or access only when that answer changes the next step, and pair it with an actionable route. Do not spend the first round merely collecting statuses across unrelated blockers. Offer “暂不决定” when deferral is meaningful; support free-text answers and requests for more context.
=======
Use a short wizard for independent, well-understood choices with concise consequences. Ask at most **three questions per round**, fewer when fewer are needed. Each question should stand on its own: decision, meaningful options, recommended option when justified, and the main tradeoff, phrased as described in "Phrasing a decision so the reader can answer it". Offer “暂不决定” when deferral is meaningful; support free-text answers and requests for more context.
>>>>>>> Stashed changes

Prefer the host's structured question tool when available in the active mode; otherwise use numbered questions and options in chat. Wait for actual answers before dependent updates. A preselected recommendation, silence, or an unanswered question is not a decision. Record clear answers, leave skipped items blocked, and avoid asking for a second confirmation unless the reply is ambiguous or new consequences change the choice.

### Complex situations

Use a focused conversation in the **current chat** when choices depend on one another, the goal is unclear, or tradeoffs need explanation. Summarize the situation, why it matters, the feasible alternatives and your recommendation; then ask the single most useful question. Explain enough for the reader to answer without researching the implementation. Address concerns and narrow the decision before moving on. Do not squeeze a complex situation into arbitrary yes/no choices or automatically create another chat.

For a mixed queue, handle independent easy decisions first, then take complex groups one at a time. Allow the reader to reorder or skip. If they want to continue elsewhere, provide a short Chinese handoff with facts, open question, relevant links, and what would let the worker resume.

## 4. Record decisions and return eligible work

Invocation authorizes the `/pm` board updates needed to record explicit answers and verified outcomes. Load and follow `/pm` in this agent if the host cannot invoke a sibling skill directly; slash commands are workflows, not shell executables. Do not request blanket approval again.

- **A decision is clear, but other conditions remain:** use `/pm block <item-id> <updated reason>` to update the existing block in place. Include the dated confirmed decision and rationale, remaining condition, responsible person, and next verification step. Keep the item blocked and preserve earlier decisions and evidence. Do not substitute “approved” for a required deployed capability or real-world check.
- **All unblock conditions hold and work remains:** use `/pm unblock <item-id>`. A clear user choice can itself satisfy a decision-only blocker; retain that choice, its date and rationale in the resolution record so the worker can act without asking again. For other conditions, record the evidence actually checked. Release each item only when its own conditions hold, even if it shares a blocker with others.
- **The item's acceptance criteria already hold:** use `/pm done <item-id>` directly, following its evidence and archival requirements; do not restore already completed work to `todo` first or invent a shipped SHA. Resolving a blocker does not by itself complete an implementation task.
- **A parked milestone has some children still blocked:** follow `/pm`'s path, ID, status and link conventions. Do not mark those children ready or describe the whole milestone as unblocked. Record partial progress and retain remaining blockers; check the actual next actionable task and its dependencies before claiming the worker can resume.
- **The answer is deferred, ambiguous, or evidence is unavailable:** keep it blocked. Clarify only what matters or give the exact external action/evidence needed. Do not weaken acceptance criteria, drop work, or modify unrelated queues to make the summary look successful.

Re-read affected records after `/pm` updates to verify the applicable move/status/link exit conditions. Preserve public-board privacy: write only non-sensitive decisions and evidence, not raw conversation, credentials, private URLs, or private-repository details. Do not commit or push as part of this command.

After an answer, help the reader take the next step or move to the next useful decision. While a choice is pending, keep the conversation centered on that choice; do not replace it with a final audit summary saying nothing was unblocked. End a completed or explicitly deferred pass with a concise Chinese handoff: what the reader chose or can do next, **已解除／已完成**, **仍在等待什么、由谁处理**, and **worker 接下来可以做什么** with item IDs. Distinguish decisions merely recorded from blockers actually cleared. If actionable work exists, provide the relevant `/loopx wN` invocation as a next step without launching it.

## Arguments

$ARGUMENTS
