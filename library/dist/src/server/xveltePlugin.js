import path from 'node:path';
import { compile, compileModule } from "svelte/compiler";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import fs from "node:fs";
import { XvelteApp } from "./XvelteApp.js";
/**
 * @todo 개발서버 일 때, client 컴포넌트들을 별도의 폴더에 번들링하여 저장해놓기
 * @returns
 */
export default function xveltePlugin() {
    function generateHash(text) {
        return createHash('sha-256').update(text).digest('hex');
    }
    const clientSvelteFilePaths = new Set();
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
                };
            }
        },
        async resolveId(id) {
            if (id.startsWith('/__xvelte__/client')) {
                return {
                    id,
                    external: true
                };
            }
        },
        async load(id) {
            if (id.startsWith('/__xvelte__/client')) {
                return {
                    code: ''
                };
            }
        },
        async transform(code, id) {
            if (id.endsWith('.svelte')) {
                const compiled = compile(code, { generate: 'server', css: 'injected', name: generateHash(id) });
                return compiled.js;
            }
            else if (id.endsWith('.svelte?client')) {
                clientSvelteFilePaths.add(id);
                return `const path = "/__xvelte__/client/${generateHash(id)}.js"; export default path;`;
            }
            if (id.endsWith('.svelte.js')) {
                return compileModule(code, {}).js;
            }
            if (id.endsWith('.svelte.ts')) {
                return compileModule(code, {});
            }
            else {
                return null;
            }
        },
        async writeBundle(options) {
            await buildClientComponents(path.resolve(path.join(options.dir || '', '__xvelte__')));
        },
        async configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                try {
                    if (req.url?.startsWith('/@vite') || req.url?.startsWith('/node_modules') || req.url?.startsWith('/.well-known')) {
                        return next();
                    }
                    else {
                        const app = await server.ssrLoadModule(path.resolve(process.cwd(), 'src/app')).then((module) => module.default);
                        if (devFileChanged && clientSvelteFilePaths.size > 0) {
                            await buildClientComponents(path.resolve(process.cwd(), '.xvelte'));
                        }
                        return await app.handle(req, res);
                    }
                }
                catch (err) {
                    server.ssrFixStacktrace(err);
                    next(err);
                }
            });
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
    };
    async function buildClientComponents(dir) {
        const { default: esbuildSvelte } = await import('esbuild-svelte');
        let xvelteClientScriptPath = path.resolve(import.meta.dirname, '..', 'client', 'xvelte.ts');
        if (!fs.existsSync(xvelteClientScriptPath)) {
            xvelteClientScriptPath = path.resolve(import.meta.dirname, '..', 'client', 'xvelte.js');
        }
        if (!fs.existsSync(path.resolve(dir, 'client'))) {
            fs.mkdirSync(path.resolve(dir, 'client'), { recursive: true });
        }
        fs.writeFileSync(path.resolve(dir, 'client', '_svelte.js'), "import {mount} from 'svelte'; window.__mount__ = mount;", 'utf-8');
        const entryPoints = {
            [path.resolve(dir, 'client', 'svelte')]: xvelteClientScriptPath
        };
        clientSvelteFilePaths.forEach((original) => {
            entryPoints[path.resolve(dir, 'client', generateHash(original))] = original;
        });
        await build({
            format: 'esm',
            platform: 'browser',
            bundle: true,
            splitting: true,
            entryPoints,
            outdir: path.resolve(dir, 'client'),
            plugins: [
                esbuildSvelte({
                    compilerOptions: {
                        css: 'injected'
                    }
                }),
                {
                    name: 'xvelte',
                    setup(build) {
                        build.onResolve({ filter: /.*/ }, (args) => {
                            if (args.importer && args.importer === xvelteClientScriptPath) {
                                if (args.path === "svelte") {
                                    return { path: path.resolve(process.cwd(), 'node_modules', 'svelte', 'src', 'index-client.js') };
                                }
                            }
                        });
                    }
                }
            ]
        });
        devFileChanged = false;
        clientSvelteFilePaths.clear();
    }
}
//# sourceMappingURL=xveltePlugin.js.map