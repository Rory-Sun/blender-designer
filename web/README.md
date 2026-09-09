# 溪畔秋日 · 实时三维展示

运行 `python -m http.server 8765 --directory web`，在浏览器打开 http://localhost:8765 。需要通过 HTTP 服务打开；直接双击 HTML 无法加载三维资源。

## 操作

- 鼠标拖动环绕、滚轮缩放；触屏单指旋转、双指缩放。
- 点击石桥、小狗、农舍标记或对应模型聚焦；底部按钮切换全景、石桥、稻田、小狗。
- 聚焦小狗后点击「让小狗跑起来」，小狗沿小路跑动，镜头跟随；「让它歇一会」逐渐减速并在当前位置停下。暂停动效也会暂停步态。
- 点击溪水产生涟漪；右上角切换暖夕、晴日、晨雾，控制动效、自然声音与全屏。
- R 重置视角；1–4 切换视角；空格暂停动效；Esc 返回全景。
- 系统开启减少动态效果时默认暂停植物和水面动效。

## 构建与资源

`npm install --prefix web` 安装依赖，`npm run build --prefix web` 重建网页。发布时复制整个 web 文件夹，至少保留 index.html、exhibit.js、exhibit.css 和 assets。

src/main.js 管理相机、光照与交互；vegetation.js 生成实例化草木；water.js 实现水面反射和点击涟漪；audio.js 合成自然环境音。assets/countryside.glb 来自 Blender 场景，puppy-fluffy.glb 为根据蓬松金毛参考图生成的小狗模型，puppy-original.glb 保留为早期版本。扫描材质来源见 assets/sources.json 和 assets/realism-sources.json。叶片和远景树木贴图为生成素材。

这是实时三维版本；远景树林使用透明贴片降低开销，近景草木与建筑使用三维几何。普通电脑建议使用启用硬件加速的浏览器。移动端会降低植被数量、反射和阴影精度。

preview-desktop.png、preview-puppy.png、preview-mobile.png 是早期版本浏览器实拍；verification.json 记录当时的交互检查结果。旧的二维动态画卷保存在 painting.html。

房屋由 village.js 重新构建，包含窗洞、窗框、门、檐廊、石基和独立弧面瓦片。稻田近景采用弯曲叶片与分叉下垂稻穗，远景采用简化几何。puppy.js 为生成小狗网格配置四肢与尾部骨骼权重，；puppy-motion.js 按实际移动距离驱动步幅，以双关节逆运动学保持脚掌落点，处理转弯补步、加速和减速。

独立演示视频工程在相邻的 countryside-film 目录，与网页分开构建和输出。
