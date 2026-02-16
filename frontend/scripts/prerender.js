import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '../dist');

// Read the client-built index.html as template
const template = readFileSync(resolve(distDir, 'index.html'), 'utf-8');

// Import the SSR entry built by Vite (pathToFileURL needed on Windows)
const { render } = await import(pathToFileURL(resolve(distDir, 'server/entry-server.js')).href);

// Routes to prerender (static pages + home)
const routes = ['/', '/confidentialite', '/cgu', '/a-propos', '/contact'];

for (const route of routes) {
  const appHtml = render(route);
  const html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

  if (route === '/') {
    writeFileSync(resolve(distDir, 'index.html'), html);
  } else {
    const dir = resolve(distDir, route.slice(1));
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'index.html'), html);
  }

  console.log(`Prerendered: ${route}`);
}

// Clean up server build (not needed in prod)
rmSync(resolve(distDir, 'server'), { recursive: true, force: true });
console.log('Prerendering complete!');
