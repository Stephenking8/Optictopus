import {cp,writeFile} from 'node:fs/promises';
// Vercel serves the output directory directly. No runtime disk writes required.
await cp(new URL('../server/uploads',import.meta.url),new URL('../client/dist/uploads',import.meta.url),{recursive:true});
await writeFile(new URL('../client/dist/robots.txt',import.meta.url),'User-agent: *\nAllow: /\nDisallow: /admin\n');
console.log('Original images copied to the Vercel static output.');
