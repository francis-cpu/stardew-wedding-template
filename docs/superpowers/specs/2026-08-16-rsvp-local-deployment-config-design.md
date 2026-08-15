# RSVP 本地部署配置隔离设计

## 目标

让公开模板仓库始终保持 RSVP 默认关闭且不包含任何用户专属 D1 绑定，同时让已完成配置的网站继续通过 `npm run deploy` 发布启用 RSVP 的版本。

## 配置分层

仓库只保留通用默认配置：

- `config/rsvp.json` 的 `enabled` 固定为 `false`。
- `wrangler.jsonc` 只保留通用 Pages 配置，不包含 `d1_databases`。

配置向导在本地生成两个被 Git 忽略的文件：

- `.env.rsvp.local`：保存非敏感的 `VITE_RSVP_ENABLED=true` 开启标记。
- `wrangler.rsvp.jsonc`：保存当前 Pages 项目名和 D1 数据库绑定。

管理员密码和会话 Secret 仍只上传到 Cloudflare，不写入任何本地配置文件。

## 构建与运行

新增统一的 RSVP 配置模块，首页和管理后台都从该模块读取有效开关。普通构建只读取仓库默认值；RSVP 部署构建使用 Vite 的 `rsvp` mode 加载 `.env.rsvp.local`，将有效开关设为开启。

`npm run deploy` 自动判断本地 `wrangler.rsvp.jsonc` 是否存在：

- 存在时，以 `rsvp` mode 构建，并使用该文件部署；`.env.rsvp.local` 存在时 RSVP 开启，不存在时 RSVP 关闭但 D1 绑定继续保留。
- 不存在时，按默认关闭状态构建，并使用仓库内的通用 `wrangler.jsonc` 部署。

配置向导也使用相同的构建和部署入口，不再修改 `config/rsvp.json` 或 `wrangler.jsonc`。

## 迁移与关闭

首次实施时，把当前已提交的项目名和 D1 绑定迁移到本地 `wrangler.rsvp.jsonc`，并生成 `.env.rsvp.local`，随后将仓库配置恢复为通用默认值。这样本机后续部署仍保持 RSVP 开启。

需要关闭当前网站时，删除 `.env.rsvp.local` 后运行 `npm run deploy`；D1 数据和远端 Secret 保留。重新运行 `npm run setup:rsvp` 可以再次开启。

## 错误处理

- 只有开启标记但缺少本地 Wrangler 配置时，部署脚本应停止并给出重新运行配置向导的提示。
- 配置失败时恢复原来的本地开启标记；已创建的 D1 和远端 Secret 保留，便于重试。
- Git 自动部署不读取本地私有文件，README 明确要求启用 RSVP 后使用 `npm run deploy`。

## 测试

- 验证仓库默认配置始终关闭且没有用户专属 D1 绑定。
- 验证构建时只有 `VITE_RSVP_ENABLED=true` 才会覆盖默认关闭状态。
- 验证部署脚本能选择默认配置或本地 RSVP 配置，并拒绝不完整的本地状态。
- 验证配置向导生成本地文件而不修改仓库默认文件。
- 运行完整测试、默认构建和 RSVP mode 构建。
