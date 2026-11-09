one click to deploy beancount to bex
done

# 一键部署到 bex：检测的关键节点

目标：用户点一次部署，之后能在浏览器里注册并登录。每个节点都要有可复现的检测，
全部通过才算"可用"。详情见 `deploy/bex/README.md`；Blueprint 是仓库根目录的 `bex.yaml`。

## 1. 部署前（Blueprint）

- [ ] `bex.yaml` 能被 `POST /v1/blueprints` 接受，目标 workspace 明确（`ownerId`）；
      `/v1/blueprints/deploy` 默认落到 `bex` workspace，不能用。
- [ ] 只有一个托管 Postgres；Gitea 用 `gitea` schema（`GITEA__database__SCHEMA`），不要 `CREATE DATABASE`。
- [ ] 五个资源都创建：dashboard、api、ledger（私有）、gitea（带持久盘）、Key Value。
- [ ] 需要用户填的值（`sync: false`）：`ADMIN_TOKEN`（api 与 ledger 必须一致）、
      `FAVA_API_ADMIN_PASSWORD`、域名相关变量（见第 4 节）。

## 2. 服务起来（每个服务一条检测）

- [ ] api：`GET /healthz` 返回 postgres / redis / ledger / gitea 全部 healthy（深度检查，只用于验收，不做平台探针）。
- [ ] api 端口固定 `PORT=4104`；平台注入的 `PORT=3000` 会让发布一直卡住。
- [ ] 迁移在容器启动时跑（`scripts/migrate-deploy.js`），失败即崩溃重启，不会带着旧 schema 对外服务。
- [ ] dashboard 返回 200；gitea `/api/healthz` 正常，管理员账号认证返回 200。
- [ ] 服务间地址用镜像端口：api `:4104`，ledger `:8000`，gitea / dashboard `:3000`。

## 3. 注册能收尾（邮件）

- [ ] 配了 `SEND_GRID_API_KEY`（发件人 `noreply@mail.beancount.io` 已验证）→ 走真实验证码。
- [ ] 没配 → 自托管开 `SELF_HOST=true`：注册不出现验证页，也没有套餐限额（见 w22/m8）。
      邮箱不被验证；启动日志有警告；忘记密码等邮件功能仍不可用。

## 4. 登录会话（本次发现的阻断点，已解决）

- [x] 登录 cookie 的域名由 `AUTH_COOKIE_DOMAIN` 决定。不设置或留空时仍是 `.beancount.io`
      （线上与老部署不受影响）；非 beancount.io 的生产部署没设时，启动日志会有警告。
- [x] bex 保留 onbex.co 下所有名字，自定义域名绑不上（`CUSTOM_DOMAIN_RESERVED`），
      平台分配的两个主机也没有可共享的父域。
- [x] 解法：浏览器只访问 dashboard 一个主机。dashboard 在设置了 `API_PROXY_URL` 时把
      `/api-gateway/*` 转给 API（未设置则不生效）；`VITE_API_URL` 指向 dashboard 自己的
      `/api-gateway/`；`AUTH_COOKIE_DOMAIN` 设成 dashboard 主机名。
- [ ] 检测：`Set-Cookie` 的 Domain 是 dashboard 主机，不是 `.onbex.co`。
- [ ] 有自己域名的客户：不需要代理，dashboard 与 API 放在同一父域下，
      `AUTH_COOKIE_DOMAIN` 设成该父域。

## 5. 端到端验收（必须在真实浏览器里做，API 通过不算）

按顺序，全部通过：

1. 打开 `/auth/sign-up`，表单正常渲染，控制台无报错。
2. 提交后出现 "Verify your email"，没有邮件报错。
3. 输入验证码，`VerifySignUpOtp` 返回 200。
4. 响应的 `Set-Cookie` 被浏览器存下（Application → Cookies 里能看到 `authSess:beancount.io`）。
5. 跳转后是已登录状态：`GetCurrentUser` 返回非空 `userProfile`，不在 `/auth/login`。
6. 后端副作用已发生：Gitea 里有该用户和 `default` 仓库；dashboard 能打开账本页。
7. 刷新页面、退出再登录，会话仍然正常。

## 6. 已知缺口与后续

- [x] canary（`beancount-dashboard.onbex.co`）已通过第 5 节：注册、验证码、cookie 入库、刷新保持、
      新浏览器重新登录、创建第一个账本（`CreateLedger` 200）。
- [ ] 把第 5 节做成可重复运行的脚本（Playwright），作为部署后的冒烟测试。
- [ ] `bex.yaml` 对 `AUTH_COOKIE_DOMAIN` 与域名变量做成 `sync: false` 提示项，避免用户漏填。
- [ ] 测试账号（`e2e-canary-*`、`ui-canary-*`）部署验收后要清理。
- [ ] 分支 `bex-deploy` 尚未合并到 `main`。

## Blocked

**Blocked 2026-11-07** — what is blocked: this note as a board item. It is an owner-written checklist for the one-click bex deployment. It was never materialized as a milestone with tasks and had no entry in the workstream README, so it cannot be worked or closed as written.

- **Blocker:** a decision that is the owner's to make, not a gap in the repository. The checklist's open items are tracked elsewhere: mail and plan limits in [w22/m8](../../done/m8/README.md), the public-URL and deploy-form work and the end-to-end browser check in [w22/m9](../../done/m9/README.md), and the repeatable smoke script in [w22/006](../../done/006.md). m9 closed 2026-11-09, so every open item on the checklist is now covered by shipped work; the owner may close it as superseded. Dropping it would discard an owner-written note on a suspicion.
- **Unblock:** the owner confirms m7 is superseded by m8 and m9 (then it is dropped, or closed after m9 lands), or asks for it to be converted into tasks.
- **Who can clear it:** the repository owner.
- **Partial work already shipped (baseline):** the sign-up cookie fix (`AUTH_COOKIE_DOMAIN`), the same-origin `/api-gateway` proxy, and `SELF_HOST` (m8) are on `main`; the bex canary passes sections 2 to 5 of this checklist.

