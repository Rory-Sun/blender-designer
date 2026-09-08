from pathlib import Path
import base64
folder=Path(__file__).resolve().parent
html=(folder/'index.template.html').read_text(encoding='utf-8')
for token,path in [('__SCENE_DATA__',folder.parent/'countryside_final.png'),('__MASK_DATA__',folder/'motion-mask.png')]:
    html=html.replace(token,'data:image/png;base64,'+base64.b64encode(path.read_bytes()).decode())
(folder/'index.html').write_text(html,encoding='utf-8')
print('Built standalone HTML:',folder/'index.html')
print('Bytes:',(folder/'index.html').stat().st_size)
