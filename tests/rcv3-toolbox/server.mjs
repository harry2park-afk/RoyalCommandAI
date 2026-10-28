import {createServer} from 'vite';
import {resolve} from 'node:path';
const server=await createServer({configFile:false,root:process.cwd(),publicDir:'public',resolve:{alias:{'@':resolve('src')}},esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:4317,strictPort:true}});
await server.listen();
console.log('Isolated toolbox harness: http://127.0.0.1:4317/tests/rcv3-toolbox/index.html');
