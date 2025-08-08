import { Plugin } from "vite";
import path from 'node:path';
import { compile } from "svelte/compiler";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { default as esbuildSvelte } from "esbuild-svelte";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { XvelteApp } from "../../XvelteApp.js";

export default function xvelte(): Plugin {
    function generateHash(text: string) {
        return createHash('sha-256').update(text).digest('hex');
    }

    const clientSvelteFilePaths: string[] = [];

    return {
        name: 'xvelte',
        enforce: 'pre',
        config(config, { command }) {
            if (command === "build") {
                return {
                    ...config,
                    build: {
                        rollupOptions: {
                            input: existsSync('app.js') ? 'app.js' : 'app.ts',
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
                            external: ['express', 'svelte/server', /^node\:/],
                            preserveEntrySignatures: 'strict'
                        },
                        outDir: 'build',
                    },
                }
            }
        },
        transform(code, id) {
            if (id.endsWith('.svelte')) {
                return compile(code, { generate: 'server', css: 'injected' }).js;
            }
            else if (id.endsWith('.svelte?client')) {
                clientSvelteFilePaths.push(id);
                return `const path = "/__client__/${generateHash(id)}.js"; export default path;`
            }
            else {
                return null;
            }
        },
        async writeBundle(options) {
            if (!existsSync(path.resolve(options.dir ?? '', '__client__'))) {
                mkdirSync(path.resolve(options.dir ?? '', '__client__'), { recursive: true });
            }
            writeFileSync(path.resolve(options.dir ?? '', '__client__', '_svelte.js'), "import {mount} from 'svelte'; window.__mount__ = mount;", 'utf-8');

            const entryPoints: Record<string, string> = {
                [path.resolve(options.dir ?? '', '__client__', 'svelte')]: path.resolve(options.dir ?? '', '__client__', '_svelte.js')
            };
            clientSvelteFilePaths.forEach((original) => {
                entryPoints[path.resolve(options.dir ?? '', '__client__', generateHash(original))] = original;
            });
            await build({
                entryPoints,
                //@ts-expect-error
                plugins: [esbuildSvelte({
                    compilerOptions: {
                        css: 'injected'
                    }
                })],
                format: 'esm',
                platform: 'browser',
                outdir: path.resolve(options.dir ?? '', '__client__'),
                bundle: true,
                splitting: true,
                loader: {
                    '.png': 'dataurl', // PNG 파일을 base64로 번들에 인라인
                    '.jpg': 'dataurl', // JPG 파일도 base64로 번들
                }
            });
        },
        configureServer(server) {
            return () => {
                server.middlewares.use(async (req, res, next) => {
                    try {
                        if (req.url?.startsWith('/@vite')) {
                            return next();
                        }
                        else {
                            const app = await server.ssrLoadModule(path.resolve(process.cwd(), 'app')).then((module) => module.default as XvelteApp);
                            return await app.handleDev(req, res, server);
                        }
                    }
                    catch (err) {
                        server.ssrFixStacktrace(err as Error);
                        next(err);
                    }
                })
            }
        },
        handleHotUpdate({ file, server }) {
            if (file === path.resolve(server.config.root, 'app.js') || file === path.resolve(server.config.root, 'app.ts')) {
                server.ws.send({
                    type: 'full-reload',
                    path: '*'
                });
                return [];
            }
        }
    }
}