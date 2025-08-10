import { type Plugin } from "vite";
import path from 'node:path';
import { compile } from "svelte/compiler";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { default as esbuildSvelte } from "esbuild-svelte";
import fs from "node:fs";
import { XvelteApp } from "./src/framework/XvelteApp"

/**
 * @todo 개발서버 일 때, client 컴포넌트들을 별도의 폴더에 번들링하여 저장해놓기
 * @returns 
 */
export default function xvelte(): Plugin {
    function generateHash(text: string) {
        return createHash('sha-256').update(text).digest('hex');
    }

    const clientSvelteFilePaths = new Set<string>();
    let isDev = false;
    let devFileChanged = true;

    return {
        name: 'xvelte',
        enforce: 'pre',
        async config(config, { command }) {
            isDev = command === "serve";
            process.env.isDev = isDev;

            if (!isDev) {
                return {
                    ...config,
                    build: {
                        rollupOptions: {
                            input: fs.existsSync('src/app.js') ? 'src/app.js' : 'src/app.ts',
                            output: {
                                entryFileNames: 'app.js',
                                manualChunks(id) {
                                    if (id.includes('node_modules/svelte/internal')) {
                                        return 'svelte/internal';
                                    }
                                    if (id.endsWith('.svelte')) {
                                        return generateHash(id);
                                    }
                                    if (id.endsWith('.svelte?client')) {
                                        const filePath = generateHash(id);
                                        return filePath;
                                    }
                                },
                            },
                            external: ['express', 'svelte/server', /^node\:/, 'mime-types'],
                            preserveEntrySignatures: 'strict'
                        },
                        outDir: 'build',
                    },
                }
            }
        },
        async resolveId(id) {
            if (id.startsWith('/__client__')) {
                return {
                    id,
                    external: true
                }
            }
        },
        async load(id) {
            if (id.startsWith('/__client__')) {
                return {
                    code: ''
                }
            }
        },
        async transform(code, id) {
            if (id.endsWith('.svelte')) {
                return compile(code, { generate: 'server', css: 'injected' }).js;
            }
            else if (id.endsWith('.svelte?client')) {
                clientSvelteFilePaths.add(id);
                return `const path = "/__client__/${generateHash(id)}.js"; export default path;`
            }
            else if (id.endsWith('.html')) {
                return `const html = ${JSON.stringify(code)}; export default html;`;
            }
            else {
                return null;
            }
        },
        async writeBundle(options) {
            await buildClientComponents(path.resolve(options.dir || ''));
        },
        async configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                try {
                    if (req.url?.startsWith('/@vite') || req.url?.startsWith('/node_modules') || req.url?.startsWith('/.well-known')) {
                        return next();
                    }
                    else {
                        const app = await server.ssrLoadModule(path.resolve(process.cwd(), 'src/app')).then((module) => module.default as XvelteApp);
                        if (devFileChanged && clientSvelteFilePaths.size > 0) {
                            await buildClientComponents(path.resolve(process.cwd(), '.xvelte'));
                        }
                        return await app.handle(req as any, res);
                    }
                }
                catch (err) {
                    server.ssrFixStacktrace(err as Error);
                    next(err);
                }
            })
        },
        async handleHotUpdate({ file, server }) {
            if (path.matchesGlob(file, path.resolve(process.cwd(), 'src/**/*'))) {
                devFileChanged = true;
                server.ws.send({
                    type: 'full-reload',
                    path: '*'
                });
                return [];
            }
        }
    }

    function clientComponentBuildOption() {
        return {
            plugins: [esbuildSvelte({
                compilerOptions: {
                    css: 'injected'
                }
            })],
            format: 'esm' as const,
            platform: 'browser' as const,
            bundle: true,
            splitting: true
        }
    }

    async function buildClientComponents(dir: string) {
        if (!fs.existsSync(path.resolve(dir, '__client__'))) {
            fs.mkdirSync(path.resolve(dir, '__client__'), { recursive: true });
        }
        fs.writeFileSync(path.resolve(dir, '__client__', '_svelte.js'), "import {mount} from 'svelte'; window.__mount__ = mount;", 'utf-8');

        const entryPoints: Record<string, string> = {
            [path.resolve(dir, '__client__', 'svelte')]: path.resolve(dir, '__client__', '_svelte.js')
        };
        clientSvelteFilePaths.forEach((original) => {
            entryPoints[path.resolve(dir, '__client__', generateHash(original))] = original;
        });
        await build({
            ...clientComponentBuildOption(),
            entryPoints,
            outdir: path.resolve(dir, '__client__'),
        });
        devFileChanged = false;
    }
}