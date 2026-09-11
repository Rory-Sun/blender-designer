import {build} from '../node_modules/esbuild/lib/main.js';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
await build({entryPoints:[path.join(root,'src.js')],bundle:true,format:'esm',minify:true,outfile:path.join(root,'app.js'),target:'es2022'});
console.log('Human atlas built.');
