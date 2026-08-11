# Stardew Wedding H5 Template

一个星露谷像素风格的手机婚礼邀请函模板。你只需要修改一份配置，就能替换新人、日期、地点、日程和地图导航。
仓库中的姓名、日期、地点和导航地址全部是占位示例，可以安全作为新项目起点。

不想自己改代码？可直接使用 [交给 AI 的一键定制提示词](AI_SETUP_PROMPT.md)。

## 快速开始

需要 Node.js 18 或更高版本。

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

如果你有已授权的背景音乐，将它命名为 `wedding-bgm.mp3`，放到以下路径：

```text
assets/wedding-bgm.mp3
```

建议使用 96–128kbps MP3 并控制在约 2MB。文件不存在、格式错误或浏览器不支持时，页面会自动改用内置的合成像素旋律。iOS、Android 和微信通常禁止自动播放，访客需点击右下角音乐按钮。

## 构建与发布

```bash
npm run build
```

构建后的静态文件位于 `dist/`，可部署到 GitHub Pages、Vercel、Cloudflare Pages、Netlify 或任意静态网站服务。每次修改后建议在 375px 到 430px 宽的手机视口预览一次。

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
- 背景音乐不随仓库提供；请自行提供已授权的 `wedding-bgm.mp3`。
