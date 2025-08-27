import type { Plugin } from "vite";
import path from 'node:path';
import { compile, compileModule, preprocess, type Preprocessor } from "svelte/compiler";
import { createHash } from "node:crypto";
import { build, type Plugin as EsbuildPlugin, type Loader, type PluginBuild } from "esbuild";
import fs, { read } from "node:fs";
import { XvelteApp } from "./XvelteApp.js";
import * as sass from 'sass';

/**
 * @todo 개발서버 일 때, client 컴포넌트들을 별도의 폴더에 번들링하여 저장해놓기
 * @returns 
 */
export default function xveltePlugin(): Plugin {
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
            if (isDev) {
                process.env.dev = "true"
                delete process.env.prod;
            }

            if (!isDev) {
                return {
                    ...config,
                    build: {
                        ssr: fs.existsSync('src/app.js') ? 'src/app.js' : 'src/app.ts',
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
                            external: [/^node\:/, '@hotsixman/xvelte'],
                            preserveEntrySignatures: 'strict'
                        },
                        outDir: 'build',
                    },
                }
            }
        },
        async resolveId(id) {
            if (id.startsWith('/__xvelte__/client')) {
                return {
                    id,
                    external: true
                }
            }
        },
        async load(id) {
            if (id.startsWith('/__xvelte__/client')) {
                return {
                    code: ''
                }
            }
        },
        async transform(code, id) {
            if (id.endsWith('.svelte')) {
                const compiled = compile(code, { generate: 'server', css: 'injected', name: generateHash(id) });
                return compiled.js;
            }
            else if (id.endsWith('.svelte?client')) {
                const realId = id.replace(/\?client$/, '');
                if (isDev) {
                    await buildSingleClientComponent(code, realId);
                }
                else {
                    clientSvelteFilePaths.add(realId);
                }
                return `const path = "/__xvelte__/client/${generateHash(realId)}.js"; export default path;`
            }
            if (id.endsWith('.svelte.js')) {
                return compileModule(code, {}).js
            }
            if (id.endsWith('.svelte.ts')) {
                return compileModule(code, {})
            }
            else {
                return null;
            }
        },
        async writeBundle(options) {
            await buildClientComponents(path.resolve(path.join(options.dir || '', '__xvelte__')));
        },
        async configureServer(server) {
            await buildXvelteClientScripts();
            server.middlewares.use(async (req, res, next) => {
                try {
                    if (req.url?.startsWith('/@vite') || req.url?.startsWith('/node_modules') || req.url?.startsWith('/.well-known')) {
                        return next();
                    }
                    else {
                        const handler = await server.ssrLoadModule(path.resolve(process.cwd(), 'src/app')).then((module) => module.default as XvelteApp['handler']);
                        if (devFileChanged && clientSvelteFilePaths.size > 0) {
                            //await buildClientComponents(path.resolve(process.cwd(), '__xvelte__'));
                        }
                        return await handler(req as any, res);
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

    /**
     * production build에서 사용
     * @param dir 
     */
    async function buildClientComponents(dir: string) {
        const { default: esbuildSvelte } = await import('esbuild-svelte') as unknown as { default: (...args: any[]) => EsbuildPlugin };
        let xvelteClientScriptPath = path.resolve(import.meta.dirname, '..', 'client', 'xvelte.ts');
        if (!fs.existsSync(xvelteClientScriptPath)) {
            xvelteClientScriptPath = path.resolve(import.meta.dirname, '..', 'client', 'xvelte.js')
        }
        /*
        if (!fs.existsSync(path.resolve(dir, 'client'))) {
            fs.mkdirSync(path.resolve(dir, 'client'), { recursive: true });
        }
        fs.writeFileSync(path.resolve(dir, 'client', '_svelte.js'), "import {mount} from 'svelte'; window.__mount__ = mount;", 'utf-8');
        */
        const entryPoints: Record<string, string> = {
            [path.resolve(dir, 'client', 'xvelte')]: xvelteClientScriptPath
        };
        clientSvelteFilePaths.forEach((original) => {
            entryPoints[path.resolve(dir, 'client', generateHash(original))] = original;
        });
        await build({
            format: 'esm' as const,
            platform: 'browser' as const,
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
                        cssLoader(build);
                    }
                }
            ],
            loader: esbuildLoader()
        });
        devFileChanged = false;
    }

    /**
     * dev 에서 사용
     */
    async function buildXvelteClientScripts() {
        let xvelteClientScriptPath = path.resolve(import.meta.dirname, '..', 'client', 'xvelte.ts');
        let svelteInternalClientScriptPath = path.resolve(import.meta.dirname, '..', 'client', 'svelteInternalClient.ts');
        if (!fs.existsSync(xvelteClientScriptPath)) {
            xvelteClientScriptPath = path.resolve(import.meta.dirname, '..', 'client', 'xvelte.js');
            xvelteClientScriptPath = path.resolve(import.meta.dirname, '..', 'client', 'svelteInternalClient.js');
        }
        const entryPoints: Record<string, string> = {
            [path.resolve(process.cwd(), '__xvelte__', 'client', 'xvelte')]: xvelteClientScriptPath,
            [path.resolve(process.cwd(), '__xvelte__', 'client', 'svelteInternalClient')]: svelteInternalClientScriptPath,
        };
        await build({
            format: 'esm' as const,
            platform: 'browser' as const,
            bundle: true,
            splitting: true,
            entryPoints,
            outdir: path.resolve(process.cwd(), '__xvelte__', 'client')
        });
    }

    /**
     * dev에서 사용
     * @returns 
     */
    async function buildSingleClientComponent(code: string, id: string) {
        const compiled = compile(code, { generate: 'client', css: 'injected', name: generateHash(id) });
        await build({
            stdin: {
                contents: compiled.js.code,
                resolveDir: path.dirname(id),
                sourcefile: id,
                loader: 'js'
            },
            outfile: path.resolve(process.cwd(), '__xvelte__', 'client', `${generateHash(id)}.js`),
            format: 'esm' as const,
            platform: 'browser' as const,
            bundle: true,
            plugins: [{
                name: 'change-import',
                setup(build) {
                    build.onResolve({ filter: /svelte\/internal\/client/ }, () => {
                        return {
                            path: '/__xvelte__/client/svelteInternalClient.js',
                            external: true
                        }
                    });
                    cssLoader(build);
                }
            }],
            loader: esbuildLoader()
        });
    }

    function esbuildLoader(): Record<string, Loader> {
        return {
            '.png': 'dataurl',
            '.jpg': 'dataurl',
            '.jpeg': 'dataurl',
            '.gif': 'dataurl',
            '.webp': 'dataurl',
            '.avif': 'dataurl',
            '.ico': 'dataurl',
            '.ttf': 'dataurl',
            '.woff': 'dataurl',
            '.woff2': 'dataurl',
            '.eot': 'dataurl',
            '.svg': 'dataurl'
        }
    }

    function cssLoader(build: PluginBuild) {
        build.onLoad({ filter: /\.css$/ }, (args) => {
            const css = fs.readFileSync(args.path, 'utf-8');
            const contents = `
                if (typeof document !== 'undefined') {
                    const style = document.createElement('style');
                    style.textContent = ${JSON.stringify(css)};
                    document.head.appendChild(style);
                }
                `;
            return { contents, loader: "js" };
        });

        build.onLoad({ filter: /\.scss$/ }, (args) => {
            const scss = fs.readFileSync(args.path, 'utf-8');
            const css = sass.compileString(scss, { style: "compressed" }).css;
            const contents = `
                if (typeof document !== 'undefined') {
                    const style = document.createElement('style');
                    style.textContent = ${JSON.stringify(css)};
                    document.head.appendChild(style);
                }
                `;
            return { contents, loader: "js" };
        });

        build.onLoad({ filter: /\.sass$/ }, (args) => {
            const sassString = fs.readFileSync(args.path, 'utf-8');
            const css = sass.compileString(sassString, { style: "compressed" }).css;
            const contents = `
                if (typeof document !== 'undefined') {
                    const style = document.createElement('style');
                    style.textContent = ${JSON.stringify(css)};
                    document.head.appendChild(style);
                }
                `;
            return { contents, loader: "js" };
        });
    }

    function viteLikeAssets(): EsbuildPlugin {
        return {
            name: 'vite-like-assets',
            setup(build) {
                //const textFileRegex = /\.(txt|glsl|md|svg|css|json)$/i

                // --- ?raw → 파일 내용을 문자열로 import ---
                build.onLoad({ filter: /\?raw$/ }, async (args) => {
                    const filePath = args.path.replace(/\?raw$/, '')
                    const contents = fs.readFileSync(filePath, 'utf8')
                    return {
                        contents: `export default ${JSON.stringify(contents)}`,
                        loader: 'js',
                    }
                })

                // --- ?inline → base64 data URL ---
                build.onLoad({ filter: /\?inline$/ }, async (args) => {
                    const filePath = args.path.replace(/\?inline$/, '')
                    const data = fs.readFileSync(filePath)
                    const ext = path.extname(filePath).slice(1)
                    const mime =
                        ext === 'svg'
                            ? 'image/svg+xml'
                            : ext === 'css'
                                ? 'text/css'
                                : `image/${ext}`
                    const base64 = data.toString('base64')
                    return {
                        contents: `export default "data:${mime};base64,${base64}"`,
                        loader: 'js',
                    }
                })

                // --- 기본 이미지/폰트 → file loader 흉내 ---
                build.onResolve({
                    filter: /\.(png|jpe?g|gif|webp|avif|ico|ttf|woff2?|eot|svg)$/i,
                }, (args) => {
                    return { path: path.resolve(args.importer, args.path), namespace: 'file-inline' }
                });
                build.onLoad({ filter: /.*/, namespace: 'file-inline' }, async (args) => {
                    const data = fs.readFileSync(args.path)
                    const ext = path.extname(args.path).slice(1)
                    let mime

                    // 이미지 MIME
                    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'ico'].includes(ext)) {
                        mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
                    }
                    // 폰트 MIME
                    else if (['ttf', 'woff', 'woff2', 'eot'].includes(ext)) {
                        mime = ext === 'ttf' ? 'font/ttf' :
                            ext === 'woff' ? 'font/woff' :
                                ext === 'woff2' ? 'font/woff2' : 'application/octet-stream'
                    }
                    else if (ext === 'svg') {
                        mime = 'image/svg+xml'
                    } else {
                        mime = 'application/octet-stream'
                    }

                    const base64 = data.toString('base64')
                    return {
                        contents: `export default "data:${mime};base64,${base64}"`,
                        loader: 'js',
                    }
                });

                // --- JSON → ESM (esbuild는 기본 loader로도 가능하지만 일관성을 위해 추가) ---
                build.onLoad({ filter: /\.json$/ }, async (args) => {
                    const json = fs.readFileSync(args.path, 'utf8')
                    return {
                        contents: `export default ${json}`,
                        loader: 'js',
                    }
                })
            },
        }
    }
}