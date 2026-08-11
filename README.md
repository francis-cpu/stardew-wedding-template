# Stardew Wedding H5 Template

星露谷像素长卷风格的手机婚礼邀请函模板。仓库中的姓名、日期、地点和导航地址均为占位信息。

## 本地运行

```bash
npm install
npm run dev
```

终端会显示本地地址。在同一 Wi-Fi 下，可用手机打开 `Network` 地址预览。

## 构建发布

```bash
npm run build
```

发布 `dist/` 目录即可，可部署到 Vercel、Cloudflare Pages、Netlify 或任意静态网站服务器。

## 替换占位信息

在 `app.js` 顶部的 `weddingConfig` 中修改：

- `groom`、`bride`：中文姓名。
- `groomLatin`、`brideLatin`：首屏英文名。
- `weddingDate`：带时区的倒计时目标，例如 `2030-10-01T00:00:00+08:00`。
- `dateDot`、`dateCn`、`calendarMonth`、`calendarDay`、`calendarYear`：页面日期展示。
- `venue`、`venueShort`：完整地址与地图图钉短名。
- `navigationUrl`：地图导航链接。
- `schedule`：婚礼日程。

还需手动替换 `index.html` 中的页面标题、description 和 Open Graph 分享文案，以及 `assets/share-cover.svg` 中的分享封面文字。发布前可用全局搜索再检查一遍自己的姓名、手机号、地址和账号。

## 背景音乐

将已获得使用授权的音乐放到：

```text
assets/wedding-bgm.mp3
```

建议压缩至约 2MB、使用 96–128kbps MP3，并制作自然循环。文件不存在、格式错误或浏览器不支持时，页面会自动改用内置的合成像素旋律。

iOS、Android 和微信内置浏览器通常禁止网页自动播放带声音的音频，访客需要主动点击右下角音乐按钮。

## 授权与素材

- 仓库中的 HTML、CSS 和 JavaScript 代码使用 MIT 许可证，见 `LICENSE`。
- 中文像素字体 Fusion Pixel Font 使用 OFL-1.1，见 `assets/fonts/OFL-Fusion-Pixel.txt`。
- `assets/` 中的游戏图像、角色、地图与其他 Stardew Valley 相关素材不属于 MIT 授权范围，相关权利归 ConcernedApe 及各自权利人所有。本项目为非官方粉丝创作，请使用者自行确认公开发布、再分发和商业使用的授权边界。
- 背景音乐不随仓库提供；使用者需自行提供已授权的 `wedding-bgm.mp3`。

## 微信分享

普通链接可以直接在微信中打开和转发。若需稳定自定义分享卡片的标题、描述和缩略图，需要备案域名、微信公众平台能力及 JS-SDK 签名服务。
