import { mkdir, copyFile, writeFile } from 'node:fs/promises';

const workerDirectory = 'dist/server';
await mkdir(workerDirectory, { recursive: true });
await mkdir('dist/.openai', { recursive: true });

await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');

const worker = `export default {\n  async fetch(request, env) {\n    const url = new URL(request.url);\n    const assetRequest = url.pathname === '/'\n      ? new Request(new URL('/index.html', request.url), request)\n      : request;\n    return env.ASSETS.fetch(assetRequest);\n  },\n};\n`;

await writeFile(`${workerDirectory}/index.js`, worker, 'utf8');
