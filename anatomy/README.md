# 人体 · 一日

暗色数字人体交互样机。解剖资产来自 Z-Anatomy / BodyParts3D，使用本机 Blender 5.2.1 处理真实解剖网格与血管曲线；人体不是用球体、胶囊或其他程序化基本体拼装。

## 打开体验

在仓库根目录运行：

```powershell
python -m http.server 8899 --bind 127.0.0.1 --directory web
```

浏览器打开 http://127.0.0.1:8899/anatomy/ 。需要支持 WebGL 的现代浏览器。页面与模型保存在本地，不依赖在线模型 CDN。不要通过 `file://` 直接打开 HTML。

## 交互

- 拖动旋转，滚轮缩放；也可使用正面、背面、侧面和重置视角按钮。
- 点击器官或使用结构下拉菜单选择；“聚焦所选结构”放大，“单独观察”隐藏其他网格。
- 循环、呼吸、消化、泌尿、骨骼、神经、肌肉系统独立显隐。肌肉默认关闭，以便观察内脏。
- 调整外壳透明度查看内部；100% 时完全隐藏外壳。
- 拖动一天时间轴或切换睡眠、进食、日常和运动事件。播放一整天约 120 秒。
- 心脏收缩、肺部扩张和消化高亮是教育性动画；器官节律与一天快进分开控制。
- 动画可暂停；系统的减少动态效果偏好会使器官动画默认暂停。

## 文件

- `Human_Atlas.blend`：完整精度的可编辑 Blender 场景，按系统分组，含数字人体材质、灯光与相机。文件约 140 MB，超过 GitHub 单文件限制，不入库；按下文命令本地重新生成，两步约 20 分钟。
- `source/Z-Anatomy.zip`：原始模型归档；原始 `.blend` 位于 `source/unpacked/Z-Anatomy/Startup.blend`。
- `source/ORIGINAL_README.md`：原始作者与授权说明。
- `build_atlas.py`：从源文件提取、整理及导出，保留真实解剖位置。
- `optimize_web.py`：完善 Blender 场景并单独生成网页 LOD；不将网页简化写回完整模型。
- `../web/anatomy/`：独立的网页入口、样式、交互源码和已构建脚本。
- `../web/anatomy/assets/manifest.json`：结构组清单。
- `../web/anatomy/assets/web-lod.json`：完整模型与网页版本的三角面数量。
- `../web/anatomy/verification.json`：浏览器交互检查结果，通过页面暴露的只读 `atlasStatus()` 读取状态。
- `interface-concept-dark.png`：依据用户参考生成的暗色界面方向。

## 修改与重新构建

网页沿用仓库已有的 Three.js + esbuild，不改动现有乡村场景。

```powershell
node web/anatomy/build.mjs
```

重新整理模型（耗时明显长于网页构建）：

```powershell
& 'D:/install/blender/blender.exe' --background --factory-startup --disable-autoexec 'anatomy/source/unpacked/Z-Anatomy/Startup.blend' --python anatomy/build_atlas.py
& 'D:/install/blender/blender.exe' --background --factory-startup --disable-autoexec 'anatomy/Human_Atlas.blend' --python anatomy/optimize_web.py
```

## 渲染说明

网页里的材质在运行时重新指定，不使用 GLB 内的 Blender 材质。外壳是叠加式边缘光；骨骼、肺和肌肉使用随视角变化的透视材质，正对镜头处更透明、轮廓处更实，叠在一起时呈 X 光轮廓而不是白雾。后处理链使用 4 倍多重采样，避免细血管和骨缘出现锯齿。心脏收缩、肺扩张和消化高亮都是网格缩放与自发光的变化。

## 内容边界

这是一版精细解剖展示与教育动画样机，不是人体生理数字孪生计算系统，不包含全部微观结构、实时个体数据、精确血流、真实消化运输或细胞活动。心率、呼吸数值是用于视觉演示的预设，不代表正常范围判断或医学测量。

解剖模型保留源数据限制，器官之间的比例、位置和完整性尚未经过独立医学专家审查。当前主要交互面向结构组，尚未开放全部原始命名部件的单独检索。源文件中的集合标题文字网格（如 “Skeletal system.g”）、标注辅助对象和肌肉起止点贴片已在提取时排除；脑膜、泪器、巩膜、虹膜、鼓膜等孤立的眼耳与脑膜碎片也不导出，它们缺少相邻结构时只会让头部显得杂乱。

## 署名

请保留 `../web/anatomy/assets/ATTRIBUTION.txt`。Z-Anatomy 及 BodyParts3D 的作者与许可、源文件提到的特定组件许可均在该文件与原始 README 中列出。

科普内容参考 NIH 的 NHLBI 心肺说明和 NIDDK 消化、肾脏说明，链接可在页面“模型来源与说明”中打开。
