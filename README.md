# 溪畔秋日 · Countryside

可自由旋转、缩放和点击探索的三维乡村网页，包含溪流、石桥、稻田、瓦屋、树林与可以跑动的小狗。项目同时保留原始 Blender 场景与生成脚本。

## 本地运行

网页是静态项目，不需要后端、数据库或启动 Blender。模型与贴图需要通过 HTTP 加载，不要直接双击 HTML。

在项目根目录运行：

```sh
python -m http.server 8765 --directory web
```

浏览器访问 http://localhost:8765 。构建产物已包含在仓库中，运行时不需要安装 Node.js 依赖。

## 操作

- 拖动环绕，滚轮缩放，点击模型或热点聚焦。
- 底部切换全景、石桥、稻田和小狗视角。
- 聚焦小狗后点击「让小狗跑起来」，镜头跟随它沿小路跑动。
- 点击溪水产生涟漪；右上角切换光照、动效、声音与全屏。
- R 重置视角，1–4 切换视角，空格暂停动效。

## 修改与构建

```sh
npm ci --prefix web
npm run build --prefix web
```

- `web/src/`：Three.js 场景、植被、房屋、骨骼步态、水面与交互源码。
- `web/assets/`：模型与贴图，来源及许可见 `sources.json`。
- `web/index3d.template.html`：页面模板。
- `web/index.html`、`web/exhibit.js`、`web/exhibit.css`：构建产物。
- `web/painting.html`：保留的早期二维动态画卷。
- `溪畔秋日_Countryside.blend`：原始 Blender 场景；网页里的房屋、植被与小狗动画有后续独立实现。
- `build_countryside.py`、`refine_countryside.py`：Blender 场景生成与细化脚本。

静态部署至少需要 `web/index.html`、`web/exhibit.js`、`web/exhibit.css` 和完整 `web/assets/`。详细说明见 [web/README.md](web/README.md)。

## 验证与素材

浏览器交互检查结果见 `web/verification*.json`。场景使用生成的小狗模型、生成的叶片与远景树木贴图，以及 Poly Haven CC0 扫描材质。远景树林采用透明贴片，近景建筑和植被采用三维几何。

独立演示视频工程保存在本地相邻的 `countryside-film` 目录，不属于本仓库。
