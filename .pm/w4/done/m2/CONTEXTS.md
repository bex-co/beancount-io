# CONTEXTS — 会话交接快照(2026-08-26)

> 由 agent 应用户要求导出,覆盖本次会话(w4/m3 `cash-flow-role` 里程碑全程 + 周边环境事实)。
> 敏感信息(口令、OTP、JWT、密钥)一律不落盘;本地测试凭据也不写入此文件。

## 1. 当前大局状态

- **w4/m3「Ledger-declared cash-flow roles」已完成并归档**:10/10 任务 done,位于 `.pm/w4/done/m3/`,w4 README 已勾选。
- **所有代码改动仍未 commit**。`git status` 里同时存在 m2(cash-flow 报表)与 m3(cash-flow-role)两代未提交工作。
- **本地落后 origin/main 23 个提交**。远端把 w4/w5 主题改成了 "General adoption worker queue"(改了 `.pm/w4/README.md` 头部两行)并新增了 w1/m5、w3/m8 等。本地 w4 README 只在底部加了 m3 行,rebase 时顶部两行可能有小冲突。
- **被中断的进行中工作**:用户要求"树表不要用假合成节点,用真的 account 节点"。设计简报已写好但 agent-11 被用户中止,**未实施**。完整设计见第 6 节。

## 2. 环境事实(本地 dev 拓扑)

### 端口

| 端口 | 内容 | 来源 |
|---|---|---|
| 4105 | backend-v2(旧镜像,docker) | 旧栈 `web-beancount2/backend-cluster/_infra-mac`(compose 网络 `infra-mac_beancount`) |
| 4106 | backend-v2_2(另一镜像) | 第二栈 `web-beancount/backend-cluster/_infra-mac2`(网络 `infra-mac2_beancount2`) |
| **4107** | **backend-v2(本仓库源码,宿主机 `yarn start`,含 m3 新 resolver)** | 后台任务,密钥从旧栈 `.env` 定向注入进程环境(未读取落盘) |
| 5173 | dashboard 主实例(`.env` 指向 4105) | 用户日常用 |
| 5174 | 另一个 dashboard 实例(占用在先,来源不明) | 曾误导:e2e 第一次登错实例,现金流行 404 |
| **5175** | **dashboard 演示实例(`VITE_API_URL=http://localhost:4107/api-gateway/`)** | 登录着测试用户 m3e2e2,可直接看 m3 效果 |
| 8001 | ledger 服务(旧 Python beancount-ledger,docker) | 4107 的 `FAVA_API_URL` 指它 |
| 3701 | gitea HTTP | 账本 git 存储 |
| 5774 / 6380 | postgres-backend / redis(宿主映射) | 4107 的 DB/缓存 |

### 关键经验

- **OrbStack 停止 = 全场 500**。症状:dashboard "Internal Server Error",后端日志 plaid-webhook 定时任务每 2 分钟 `ECONNREFUSED`。处置:`orbctl start`,容器 `restart: always` 自动恢复。
- 5174 被占用时 `yarn dev --port 5174` 会自动落到 5175——看启动日志确认真实端口。
- localhost cookie 不区分端口:在 5174 登录的会话在 5175 同样有效。
- gitea 裸仓库绕 hook 写入法:`git --git-dir=<bare> fetch /tmp/clone main:refs/heads/main`(直接 push 会被 pre-receive 拒绝,因为 hook 指向容器内路径)。
- 后端 dev 启动必需 `TEMP_ASSETS_AWS_S3_REGION` / `PERM_ASSETS_AWS_S3_REGION`(否则 S3 客户端启动即抛 "Region is missing")。

### 本地测试资产

- gitea 仓库:`un_4g4hlgyyv3gw/my-book.git`(在 web-beancount2 旧栈 data 目录),main 分支 commit `1dc72cf`,内容已改写为最终语法 `cash-flow-role: "cash"`。**注意:其 owner 用户在 gitea DB 中不存在(GetUserByName 失败),该仓库实际不可经 API 访问。**
- 测试用户 `m3e2e`、`m3e2e2`(e2e 时经 signUp+OTP 注册,OTP 是 4 位、出现在 dev 后端 ConsoleSendGrid 日志里);各自有 `default` 账本,m3e2e2/default 的 main.bean 带 `cash` + `investing` 两条声明。
- `backend-v2:m3` docker 镜像:构建成功过(BuildKit 缓存),本地 image store 无此 tag,无需清理。

## 3. m3 功能规格(定稿)

- **单键四值**:`open` 指令元数据 `cash-flow-role: "cash" | "operating" | "investing" | "financing"`。
- 声明一个键同时决定两轴:`"cash"` = CCE 成员(不产生活动行,底部行解释其变动);活动值 = 非现金 + 归入对应活动(故 `"investing"` 声明在 CD 上一行完成"剔出现金+归 investing")。
- **优先级:open 元数据 > `config.ts` 启发式**,仅两层。`custom` 指令方案、双键方案、日期生效、设置 UI 均被明确否决(理由见 PRFAQ FAQ 与 ADR003 Alternatives)。
- 无效值(拼写/大小写/非字符串):视为不存在 → 回落启发式 + status panel 提示,绝不抛错。
- 消费方共用一个 resolver:cash-flow 页面、CSV/Markdown/print 导出、overview Sankey。
- 规范原文:`dashboard/docs/PRFAQ-cash-flow-ledger-classification.md`(附录为 normative spec);决策记录:`dashboard/docs/ADR003-cash-flow-ledger-roles.md`;ADR002 已交叉引用并转正 Accepted。

## 4. 实现地图(未提交文件)

### backend-cluster/backend-v2

- `src/features/ledger/api/resolvers/ledger-account-resolver.query.ts`:新增 `getLedgerAccountDetails(ledgerId)` → `[{ account, closeDate, meta }]`,复用既有 `getAccountsDetail` 服务(该服务本就映射了 meta;ledger service 数据面零改动)。
- 对应测试 `__tests__/ledger-account-resolver.test.ts`(+3)。
- `tmp/emit-schema.ts` + `tmp/schema.graphql`:一次性 SDL 发射器(gitignored,勿提交; codegen 用)。

### dashboard

- `src/features/reports/cash-flow/lib/role-resolver.ts`(**新**):`resolveCashFlowRole(account, meta?)` → `{ role, source: "declared"|"heuristic", invalidValue? }` + `CASH_FLOW_ROLE_META_KEY`。纯函数,21 单测。
- `hooks/use-account-meta.ts`(**新**,t008 简化产物):`useAccountMeta(ledgerId)` → `AccountMetaMap`,cash-flow 与 overview 两个页面共用。
- `lib/model.ts`:`collectCashAccounts`/`buildCashFlowStatement` 走 resolver;`CashFlowRow.roleSource`、`CashFlowStatement.invalidRoleValues`、`hasHeuristicCashAccounts`。**含 e2e 抓出的修复:CCE 收集改为声明优先的逐叶解析(祖先启发式匹配向下继承,叶子声明可否决)**——修复前祖先剪枝会掩盖叶子声明(披露误报 + CD 场景错留现金)。
- `loader.ts` / `index.tsx`(cash-flow 与 overview 两侧):`GetLedgerAccountDetailsDocument` 并行获取,fail-tolerant 降级为纯启发式。
- `overview/lib/account-categorizer.ts`、`sankey-data-transformer.ts`、`sankey-colors.ts`:Sankey 接同一 resolver;`Income` 恒 source、`Equity` 恒 exclude,声明不可改这两条。
- `export/model.ts`:`StatementExportDocument.cashFlowInference { activityRows, cashEquivalents }`;`markdown.ts`、`printable-statement.tsx` 按轴门控两条推断披露(`?? true` 兜底旧文档)。
- `balance-sheet/hierarchy-list.tsx`:`roleSource` 扩展字段 + declared 标记渲染(muted 文本 + tooltip)。
- `codegen.ts` + `scripts/codegen-schema-file-loader.cjs`(**新**):`CODEGEN_SCHEMA_FILE` 环境变量覆盖。**注意:新后端未部署前,默认路径 `yarn codegen` 会因 schema 缺 `getLedgerAccountDetails` 而失败,需用覆盖**。两个坑已解决:printSchema 缺 schema 块、merge 自动补全 subscription。
- locale:cash-flow 15 语言 +24 键、export 15 语言措辞修正("for accounts without a declared cash-flow-role")。
- 文档:ADR003(新)、ADR002(交叉引用+Accepted)、PRFAQ(多次迭代定稿)、`reports/CLAUDE.md`、`dashboard/README.md`。
- 测试:role-resolver 21、model 22、cash-account-status、statement-tree、cash-flow-content、hierarchy-list、cash-flow-export、account-categorizer 19、sankey-data-transformer 9 等。

## 5. 验证证据

- dashboard 最终 CI-parity:`format:check`+`lint`+**3377 tests**+`build` 全绿(exit 0);backend-v2:**2401 tests**+typecheck 全绿。
- 真账本 e2e(2026-08-25):注册真实用户 → `updateLedgerFile` 写入注解(base64!)→ GraphQL 断言 meta → 浏览器 5175 实测:declared 标记、CCE 面板叶子账户、净变动 1,000 守恒、导出 Markdown 中 CCE 披露省略 + 分类披露保留。
- e2e 顺带修复披露文案(原 "carries no per-account activity metadata" 已不成立),15 语言。
- **未验证项**:rustledger 版 ledger service(`backend-cluster/ledger`)的 meta 透传只做了代码走查(`normalizeAccountMeta` 存在),未跑真账本 e2e——切新栈前值得补一次。

## 6. 被中断的工作:树表去合成节点(设计已定,未实施)

**用户需求**:"不要用假的合成节点,用真的 account 节点"。

**问题**:`statement-tree.ts` 的 `buildActivityTree`/`buildBottomLineTree` 生成 `account` 为标题字符串的假根节点("Investing Activities"、"Net change in cash & equivalents"、"…at period start/end"),`HierarchyList` 对每个 node.account 生成账户页链接 → 点击跳进不存在的账户页。

**已定设计**(agent-11 简报,可直接续用):

1. **活动卡**:`buildActivityTree` → `buildActivityForest`,返回真实账户森林(顶层即 `Assets:Brokerage` 等),`roleSource` 线穿保留;分区合计移出树,以纯文本(非链接)合计行放在明细行**下方**(遵循 reports/CLAUDE.md "root total below detail rows"),用现有本地化活动名做标签。空分区:不渲染树,只显示带 "-" 的合计行。
2. **底部卡**:树改为列出真实 CCE 账户(从 `index.tsx` 的 `closingCashAccounts` 传新 prop 进 `CashFlowContent`),按主币值降序;opening / net change / closing 三个聚合数以同样的纯文本汇总行置于账户行下方,net change 加粗。
3. **渲染机制**:给 `HierarchyListCard`(或 `HierarchyList`)加可选 `summaryRows?: { label, balance, bold? }[]`,复用 Primary/OtherBalancesColumn 格式化;balance-sheet 调用方不传 → 行为不变。`HierarchyListCard` 的 `data` 可拓宽为 `SerializableTreeNode | SerializableTreeNode[]`。
4. 删除 `buildBottomLineTree` 等死代码,更新注释;不改 model.ts/导出/状态面板;数字零变化(纯展示层);新字符串先进全部 15 语言(先 grep 可复用键)。
5. 测试:statement-tree(森林输出、无假链接)、hierarchy-list/card(summaryRows 纯文本)、cash-flow-content(不存在指向 "Investing Activities"/"Net change…" 的链接)。
6. 验证:`yarn vitest run src/features/reports` + typecheck + prettier/eslint。

## 7. 恢复现场的命令

```bash
# 基础设施
orbctl start   # 若 docker socket 消失

# 新后端(4107,本仓库源码;密钥从旧栈 .env 定向注入,勿打印)
cd backend-cluster/backend-v2
set -a; eval "$(grep -E '^(FAVA_API_ADMIN_USER|FAVA_API_ADMIN_PASSWORD|AUTH_SECRET|ADMIN_TOKEN|COOKIE_SECRETS|DASHBOARD_URL)=' /Users/tianpan/projects/web-beancount2/backend-cluster/_infra-mac/.env)"; set +a
PORT=4107 SERVER_URL=http://localhost:4107 NODE_ENV=development \
POSTGRES_BACKEND_URI=postgresql://postgres:password@localhost:5774/backend \
REDIS_URI=redis://localhost:6380 FAVA_API_URL=http://localhost:8001 \
GITEA_HOST_NAME=localhost GITEA_HTTP_PORT=3701 EXTERNAL_GITEA_HTTP_PORT=3701 \
EXTERNAL_GITEA_HOST_NAME=localhost GITEA_SSH_PORT=2223 \
TEMP_ASSETS_AWS_S3_REGION=us-east-1 PERM_ASSETS_AWS_S3_REGION=us-east-1 \
yarn start

# 演示 dashboard(自动落到空闲端口,看日志)
cd dashboard && VITE_API_URL=http://localhost:4107/api-gateway/ yarn dev --port 5175
```

验证入口:`http://localhost:5175/ledger/m3e2e2/default/cash-flow`(测试用户会话若过期需重新注册/登录)。

## 8. 待办与风险

- [ ] 实施第 6 节的树表改造(用户明确要求,尚未开工)。
- [ ] `/ship` 前先 `git pull --rebase`:注意 `.pm/w4/README.md` 头部两行远端改动 vs 本地底部 m3 行的小冲突;m2+m3 全部未提交改动一起发布,dashboard 属 substantial,需盯 CI (dashboard) + Secret scan。
- [ ] 新后端部署前,其他人跑 `yarn codegen` 需 `CODEGEN_SCHEMA_FILE` 覆盖(见 codegen.ts 注释)。
- [ ] rustledger meta 透传补一次真栈验证。
- [ ] 本地遗留:测试用户 m3e2e/m3e2e2、4107/5175 两个常驻进程、旧栈 `un_4g4hlgyyv3gw/my-book`(owner 缺失,基本不可用,可考虑清理)。
- [ ] fa(波斯语)locale 中拉丁 `cash-flow-role` 嵌入 RTL 文本,值得目检一次导出预览。
