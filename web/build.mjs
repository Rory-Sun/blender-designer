import {build} from 'esbuild';
import {copyFile,readFile,writeFile} from 'node:fs/promises';
await build({entryPoints:['src/main.js'],bundle:true,minify:true,format:'iife',target:['es2022'],outfile:'exhibit.js',logLevel:'info'});
await copyFile('src/exhibit.css','exhibit.css');
await copyFile('index3d.template.html','index.html');
console.log('Built real-time 3D countryside. Serve this folder over HTTP.');
