# Stardew Wedding H5 Template

一个星露谷像素风格的手机婚礼邀请函模板。你只需要修改一份配置，就能替换新人、日期、地点、日程和地图导航。
仓库中的姓名、日期、地点和导航地址全部是占位示例，可以安全作为新项目起点。

不想自己改代码？可直接使用 [交给 AI 的一键定制提示词](AI_SETUP_PROMPT.md)。

## 快速开始

建议使用 Node.js 22 或更高版本；可选的 Cloudflare RSVP 配置向导也要求这一版本。

```bash
git clone https://github.com/<你的账号>/stardew-wedding-template.git
cd stardew-wedding-template
npm install
npm run dev
```

终端会显示本地预览地址。在同一 Wi-Fi 下，也可以用手机打开终端中的 `Network` 地址进行预览。

## 配置你的邀请函

打开 [app.js](app.js)，修改文件最开头的 `weddingConfig`。页面中的姓名、地点、倒计时和日程都会自动同步。

```js
const weddingConfig = {
  groom: '新郎姓名',
  bride: '新娘姓名',
  groomLatin: 'GROOM',
  brideLatin: 'BRIDE',
  weddingDate: '2030-10-01T00:00:00+08:00',
  dateDot: '2030 · 10 · 01',
  dateCn: '2030年10月1日 · 星期二',
  calendarMonth: 'OCT',
  calendarDay: '01',
  calendarYear: '2030',
  venue: '示例市幸福区星露谷宴会厅',
  venueShort: '星露谷宴会厅',
  navigationUrl: 'https://uri.amap.com/search?keyword=...',
  schedule: [
    { label: '签到', time: '14:00', description: '领取今日任务，与老朋友相见' },
    { label: '仪式', time: '15:00', description: '见证拥抱、誓言与交换戒指' },
    { label: '喜宴', time: '18:00', description: '共享一场丰盛的秋日宴席' },
    { label: '合影', time: '待确认', description: '保存这一份快乐存档' },
  ],
}
```

### 字段说明

| 字段 | 用途 |
| --- | --- |
| `groom` / `bride` | 新人的中文姓名 |
| `groomLatin` / `brideLatin` | 首屏大标题的英文名或拼音 |
| `weddingDate` | 倒计时目标日期，请保留 `+08:00` 以使用中国时区 |
| `dateDot` / `dateCn` | 页面上的数字与中文日期 |
| `calendarMonth` / `calendarDay` / `calendarYear` | 日历卡片上的月、日、年 |
| `venue` / `venueShort` | 完整地址和地图上显示的短名 |
| `navigationUrl` | “打开地图导航”按钮的跳转地址 |
| `schedule` | 当天日程，每项均包含 `label`、`time`、`description` |

### 配置地图导航

可在高德地图搜索实际地点，复制分享链接后粘贴到 `navigationUrl`。也可使用下列格式，把 `<地点>` 换成 URL 编码后的地址或地点名：

```text
https://uri.amap.com/search?keyword=<地点>&src=stardew-wedding&callnative=1
```

`callnative=1` 会在支持的手机上优先尝试打开高德地图 App；未安装时会回退到网页地图。

## 修改分享信息

这些信息不在 `weddingConfig` 中，为了避免发布后分享卡片仍显示占位文案，请一并替换：

1. 在 [index.html](index.html) 修改 `<title>`、`description`、`og:title` 和 `og:description`。
2. 在 [assets/share-cover.svg](assets/share-cover.svg) 修改分享封面的姓名和日期。
3. 发布前全局搜索一遍自己的姓名、手机号、地址、账号等信息。

## 背景音乐

项目已提供一首默认背景音乐。若你有已授权的音乐，可将其命名为 `wedding-bgm.mp3` 并替换以下文件：

```text
assets/wedding-bgm.mp3
```

建议使用 96–192kbps MP3 并控制在约 2MB。文件不存在、格式错误或浏览器不支持时，点击右下角音乐按钮会尝试播放内置的合成像素旋律。iOS、Android 和微信通常禁止自动播放，访客需点击该按钮开始播放。

## 可选功能：宾客登记（默认关闭）

宾客登记、住宿需求和管理后台默认关闭。不需要收集宾客信息时，不要执行本节的开启命令：普通访客看不到表单或管理入口，浏览器不会加载 RSVP 客户端，也不会请求 API；项目不需要 D1、Secret 或额外配置。

启用后，邀请函、表单、管理后台和接口仍全部运行在同一个 Cloudflare Pages 项目中，不会把接口单独发布到 `workers.dev`。

### 开启前准备

- 安装 Node.js 22 或更高版本，并先在项目目录运行 `npm install`。
- 准备一个可登录的 Cloudflare 账号，以及至少 6 个字符的独立管理员密码。
- 确定 Pages 项目名。若网站地址是 `https://example.pages.dev`，项目名就是 `example`；已有项目会直接复用，不会再创建同名项目。
- 确认账号可以使用 Pages、Pages Functions 和 D1，并了解它们会计入 Cloudflare 对应额度。

### 一条命令开启

在项目根目录运行：

```bash
npm run setup:rsvp
```

向导会依次询问 Pages 项目名和管理员密码。密码输入时终端只显示星号，不会写入仓库或普通日志。若尚未登录 Cloudflare，向导会打开浏览器完成授权。

随后向导会自动完成这些工作：

1. 创建或复用 Pages 项目，并把项目名写入本地 `wrangler.rsvp.jsonc`。
2. 创建或复用名为 `<Pages项目名>-rsvp` 的 D1 数据库，并把绑定名 `DB` 写入该本地配置。
3. 执行 `migrations/` 中的数据库迁移。
4. 生成 `SESSION_SECRET`，并把它和管理员密码作为 Pages Secret 上传。
5. 生成本地 `.env.rsvp.local` 开启标记。
6. 运行测试和构建，部署到 Pages，再检查首页、管理页和 `/api/rsvp-status`。

成功时终端会输出 `RSVP 已开启：https://<Pages项目名>.pages.dev/`。如果部署或健康检查失败，向导会恢复原来的本地开启标记；若启用版本已经上线，还会重新部署关闭版本。远端已创建的 D1 和 Secret 会保留，方便排障后重复运行同一命令。

`.env.rsvp.local` 和 `wrangler.rsvp.jsonc` 都不会提交到 Git。前者只保存非敏感的开启标记，后者保存当前 Cloudflare Pages 项目和 D1 绑定；管理员密码与会话 Secret 仍只保存在 Cloudflare。

### 启用后验证

1. 打开向导输出的邀请函地址，确认右下角出现赴约入口。
2. 提交一条名为“测试宾客”的登记，并确认页面显示登记成功。
3. 打开同一域名下的 `/admin/`，使用配置时输入的管理员密码登录。
4. 确认列表中出现测试宾客，并检查人数、住宿时间和 CSV 导出。

### 日常更新部署

向导会把 Pages 项目名和 D1 绑定写入本地 `wrangler.rsvp.jsonc`。以后修改邀请函后，在项目根目录运行：

```bash
npm run deploy
```

该命令会先运行全部测试，以 `rsvp` mode 构建，再使用本地 Wrangler 配置部署到已经绑定的 Pages 项目。不要为同一份邀请函另建第二个 Pages 项目。启用 RSVP 后请固定使用 `npm run deploy`；Git 自动部署读取不到本机的忽略文件，会按模板默认关闭状态构建。

### 关闭 RSVP

删除 `.env.rsvp.local`，然后运行 `npm run deploy`。部署命令仍使用 `wrangler.rsvp.jsonc` 保留 D1 绑定，但会按模板默认关闭状态构建。关闭后普通页面不再显示或加载 RSVP，`/admin/` 只显示关闭说明。关闭页面入口不会删除 D1 中的宾客数据，也不会删除 Pages Secret；重新运行 `npm run setup:rsvp` 可以再次开启。

### 彻底清理 RSVP 数据

1. 在 `/admin/` 导出 CSV，并确认备份可以正常打开。
2. 先按上一节关闭 RSVP 并重新部署。
3. 在 Cloudflare 控制台进入 **Storage & Databases → D1**，删除 `<Pages项目名>-rsvp` 数据库。
4. 进入对应 Pages 项目的 **Settings → Variables and Secrets**，删除 `ADMIN_PASSWORD` 和 `SESSION_SECRET`。
5. 删除本机的 `wrangler.rsvp.jsonc`；它已被 Git 忽略，不影响模板默认配置。

删除数据库后无法恢复。只想临时停止收集时不要执行彻底清理，关闭前端入口即可。

### 故障排查

- `wrangler` 提示 Node.js 版本过低：升级到 Node.js 22 或更高版本，重新运行 `npm install`。
- 登录失败：运行 `npx wrangler login`，浏览器授权完成后重新执行向导。
- 页面提示 RSVP 尚未配置：检查 `wrangler.rsvp.jsonc` 中绑定名是否严格为 `DB`，并确认部署的是向导选择的 Pages 项目。
- 页面提示表不存在：运行 `npx wrangler d1 migrations apply DB --remote --config wrangler.rsvp.jsonc`，再执行 `npm run deploy`。
- 管理后台尚未配置：重新运行 `npm run setup:rsvp`，输入新的管理员密码以刷新两个 Secret。
- 部署后入口仍隐藏：确认 `.env.rsvp.local` 存在且内容为 `VITE_RSVP_ENABLED=true`，然后重新执行 `npm run deploy`。
- 同名数据库已经存在：直接重新运行向导；它会查询并复用 `<Pages项目名>-rsvp`，不会重复创建。
- 自定义域名或 `pages.dev` 在某个网络不可达：先分别用手机流量和 Wi-Fi 验证。网络可达性因地区和运营商而异，不代表 RSVP 代码本身异常。

### 隐私与安全

只收集婚礼筹备真正需要的信息，并在邀请函中告知用途。联系电话、住宿时间、留言和导出的 CSV 不应提交到公开仓库或发送到无关群聊。管理员密码应使用独立强密码，不要与 Cloudflare 或其他账号共用；婚礼结束后及时导出并删除不再需要的数据。

## 构建与发布

```bash
npm run build
```

构建后的静态文件位于 `dist/`。RSVP 保持关闭时，可部署到 GitHub Pages、Vercel、Cloudflare Pages、Netlify 或任意静态网站服务；启用 RSVP 后必须使用已经配置 Pages Functions 和 D1 的 Cloudflare Pages 项目。每次修改后建议在 375px 到 430px 宽的手机视口预览一次。

## 发布前检查

- 新人、日期、地点、日程和地图链接是否都已替换。
- 分享标题、描述和封面是否与婚礼信息一致。
- 手机上的地图按钮、音乐按钮、倒计时和首屏入口是否正常。
- `npm run build` 是否成功。
- 是否已为所使用的音乐和素材取得适当授权。

## 授权与素材

- 仓库中的 HTML、CSS 和 JavaScript 代码使用 MIT 许可证，见 [LICENSE](LICENSE)。
- 中文像素字体 Fusion Pixel Font 使用 OFL-1.1，见 [assets/fonts/OFL-Fusion-Pixel.txt](assets/fonts/OFL-Fusion-Pixel.txt)。
- `assets/` 中的 Stardew Valley 相关素材不属于 MIT 授权范围，相关权利归 ConcernedApe 及各自权利人所有。本项目为非官方粉丝创作，请自行确认公开发布、再分发和商业使用的授权边界。
- 仓库提供默认的 `assets/wedding-bgm.mp3`；替换音乐前请确认拥有相应使用授权。
