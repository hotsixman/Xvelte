import type { Plugin } from "vite";
import path from 'node:path';
import { compile, compileModule } from "svelte/compiler";
import { build, type Plugin as EsbuildPlugin, type Loader, type PluginBuild } from "esbuild";
import fs, { read } from "node:fs";
import { XvelteApp } from "./XvelteApp.js";
import * as sass from 'sass';
import regexpEscape from 'regexp.escape'
import { generateHash } from "./utils.js";
/**
 * @todo 개발서버 일 때, client 컴포넌트들을 별도의 폴더에 번들링하여 저장해놓기
 * @returns 
 */
export default function xveltePlugin(): Plugin {
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

            const xvelteServerCssPath = path.resolve(process.cwd(), '__xvelte__', 'server', 'css');
            if (!fs.existsSync(xvelteServerCssPath)) {
                fs.mkdirSync(xvelteServerCssPath, { recursive: true });
            }
            const xvelteClientCssPath = path.resolve(process.cwd(), '__xvelte__', 'client', 'css');
            if (!fs.existsSync(xvelteClientCssPath)) {
                fs.mkdirSync(xvelteClientCssPath, { recursive: true });
            }

            if (!isDev) {
                const appJsPath = fs.existsSync('src/app.js') ? 'src/app.js' : 'src/app.ts';
                return {
                    ...config,
                    esbuild: {
                        target: 'esnext'
                    },
                    build: {
                        ssr: true,
                        target: 'esnext',
                        rollupOptions: {
                            input: {
                                'app': appJsPath,
                                ...Object.fromEntries(fs.globSync('src/routes/**/+server.{js,ts}').map((p) => [p, p]))
                            },
                            output: {
                                entryFileNames: (p) => {
                                    if (p.name === 'app') {
                                        return 'app.js';
                                    }
                                    let name = (p.facadeModuleId ?? p.moduleIds[0]).replaceAll('\\', '/');
                                    name = path.dirname(name.slice(name.indexOf('src/routes/') + 11)) + '.js';
                                    return 'routes/' + encodeURIComponent(name);
                                },
                                manualChunks(id) {
                                    /*
                                    if (id.includes('node_modules/svelte/internal')) {
                                        return 'svelte/internal';
                                    }
                                    */
                                    if (id.endsWith('.svelte')) {
                                        return '_' + generateHash(id);
                                    }
                                    if (id.endsWith('.svelte?client')) {
                                        const filePath = '_' + generateHash(id);
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
                return await buildServerComponent(code, id);
            }
            else if (id.endsWith('.svelte?client')) {
                const realId = id.replace(/\?client$/, '');
                if (isDev) {
                    await buildSingleClientComponent(code, realId);
                }
                else {
                    clientSvelteFilePaths.add(realId);
                }
                return `const path = "/__xvelte__/client/${'_' + generateHash(realId)}.js"; export default path;`
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
            copyServerComponentExternalCss(path.resolve(path.join(options.dir || '', '__xvelte__')));
            copyStaticFolder(path.resolve(options.dir || ''));
        },
        async configureServer(server) {
            await buildXvelteClientScripts();
            server.middlewares.use(async (req, res, next) => {
                try {
                    if (req.url?.startsWith('/@vite') || req.url?.startsWith('/node_modules')) {
                        return next();
                    }
                    else {
                        const app = await server.ssrLoadModule(path.resolve(process.cwd(), 'src/app')).then((module) => module.default.app as XvelteApp);
                        //@ts-expect-error
                        const devApp = new XvelteDevApp(app.template);
                        if (XvelteApp.isUsingFileBaseRouter(app)) {
                            const fileRouterDirPath = path.resolve(process.cwd(), 'src', 'routes').replaceAll('\\', '/');
                            for (let entry of fs.globSync(path.join(fileRouterDirPath, '**/+server.{js,ts}'))) {
                                entry = entry.replaceAll('\\', '/');
                                try {
                                    const module = await server.ssrLoadModule(entry);
                                    const route = XvelteApp.toRoutePath(path.dirname(entry.replace(new RegExp(`^${regexpEscape(fileRouterDirPath)}`), '')));
                                    if ("page" in module) {
                                        devApp.page(route, module.page);
                                    }
                                    (['get', 'post', 'put', 'delete', 'all'] as const).forEach((method) => {
                                        const upperCaseMethod = method.toUpperCase();
                                        if (upperCaseMethod in module) {
                                            devApp[method](route, module[upperCaseMethod]);
                                        }
                                    })
                                }
                                catch (err) {
                                    console.log(`${entry} is not a javascript module.`);
                                }
                            }
                        }

                        app.allHandlers.forEach((value) => {
                            if (value[0] === "page") {
                                devApp.page(value[1], value[2]);
                            }
                            else {
                                devApp[value[2]](value[1], value[3]);
                            }
                        })

                        return await devApp.handler(req as any, res);
                    }
                }
                catch (err) {
                    server.ssrFixStacktrace(err as Error);
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
    }

    /**
     * 서버 컴포넌트에서 js가 아닌 파일의 import 처리.
     * production과 dev에서 모두 사용.
     * @param code 
     * @param id 
     */
    async function buildServerComponent(code: string, id: string) {
        const clientDir = path.resolve(process.cwd(), '__xvelte__', 'client', 'css');
        const serverDir = path.resolve(process.cwd(), '__xvelte__', 'server', 'css');
        const name = '_' + generateHash(id);
        const compiled = compile(code, { generate: 'server', css: 'injected', name });
        const cssContents: [string, string][] = [];
        const result = await build({
            format: 'esm',
            platform: 'node',
            bundle: true,
            write: false,
            outdir: path.resolve(process.cwd(), '__xvelte__', 'server', 'css'),
            stdin: {
                contents: compiled.js.code,
                resolveDir: path.dirname(id),
                sourcefile: id,
                loader: 'js'
            },
            plugins: [{
                name: 'server-css',
                setup(build) {
                    build.onResolve({ filter: /\.(css|sass|scss)$/ }, args => ({ path: path.resolve(args.resolveDir, args.path), namespace: 'css' }));
                    build.onResolve({ filter: /.*/ }, args => ({ path: args.path, external: true }));

                    build.onLoad({ filter: /\.css$/ }, (args) => {
                        const css = fs.readFileSync(args.path, 'utf-8');
                        cssContents.push([generateHash(args.path), css]);
                        return { contents: "", loader: "js" };
                    });

                    build.onLoad({ filter: /\.scss$/ }, (args) => {
                        const scss = fs.readFileSync(args.path, 'utf-8');
                        const css = sass.compileString(scss, { style: "compressed" }).css;
                        cssContents.push([generateHash(args.path), css]);
                        return { contents: "", loader: "js" };
                    });

                    build.onLoad({ filter: /\.sass$/ }, (args) => {
                        const sassString = fs.readFileSync(args.path, 'utf-8');
                        const css = sass.compileString(sassString, { style: "compressed" }).css;
                        cssContents.push([generateHash(args.path), css]);
                        return { contents: "", loader: "js" };
                    });
                }
            }],
            keepNames: true
        });

        cssContents.forEach(([hash, content]) => {
            const cssDir = path.resolve(clientDir, `${hash}.css`);
            if (!fs.existsSync(cssDir)) {
                fs.writeFileSync(cssDir, content, 'utf-8');
            }
        });

        fs.writeFileSync(path.resolve(serverDir, `${name}_css.js`), `const cssData = ${JSON.stringify(cssContents.map(([hash, _]) => hash))}; export default cssData;`, 'utf-8');

        return result.outputFiles[0].text;
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
            entryPoints[path.resolve(dir, 'client', '_' + generateHash(original))] = original;
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
                        clientCssLoader(build);
                    }
                }
            ],
            loader: esbuildLoader(),
            keepNames: true
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
        }
        if (!fs.existsSync(svelteInternalClientScriptPath)) {
            svelteInternalClientScriptPath = path.resolve(import.meta.dirname, '..', 'client', 'svelteInternalClient.js');
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
            outdir: path.resolve(process.cwd(), '__xvelte__', 'client'),
            keepNames: true
        });
    }

    /**
     * dev에서 사용
     * @returns 
     */
    async function buildSingleClientComponent(code: string, id: string) {
        const name = '_' + generateHash(id);
        const compiled = compile(code, { generate: 'client', css: 'injected', name });
        await build({
            stdin: {
                contents: compiled.js.code,
                resolveDir: path.dirname(id),
                sourcefile: id,
                loader: 'js'
            },
            outfile: path.resolve(process.cwd(), '__xvelte__', 'client', `${name}.js`),
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
                    clientCssLoader(build);
                }
            }],
            loader: esbuildLoader(),
            keepNames: true
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

    function clientCssLoader(build: PluginBuild) {
        build.onResolve({ filter: /\.(css|sass|scss)$/ }, args => ({ path: path.resolve(args.resolveDir, args.path), namespace: 'css' }));

        build.onLoad({ filter: /\.css$/ }, (args) => {
            const css = fs.readFileSync(args.path, 'utf-8');
            const contents = generateContents(css, args.path);
            return { contents, loader: "js" };
        });

        build.onLoad({ filter: /\.scss$/ }, (args) => {
            const scss = fs.readFileSync(args.path, 'utf-8');
            const css = sass.compileString(scss, { style: "compressed" }).css;
            const contents = generateContents(css, args.path);
            return { contents, loader: "js" };
        });

        build.onLoad({ filter: /\.sass$/ }, (args) => {
            const sassString = fs.readFileSync(args.path, 'utf-8');
            const css = sass.compileString(sassString, { style: "compressed" }).css;
            const contents = generateContents(css, args.path);
            return { contents, loader: "js" };
        });

        function generateContents(css: string, path: string) {
            const hash = '_' + generateHash(path);
            return `
                if (typeof document !== 'undefined' && !document.getElementById(${JSON.stringify(hash)})) {
                    const style = document.createElement('style');
                    style.setAttribute('id', ${JSON.stringify(hash)});
                    style.textContent = ${JSON.stringify(css)};
                    document.head.appendChild(style);
                }
                `
        }
    };

    function copyServerComponentExternalCss(dir: string) {
        const clientDir = path.resolve(process.cwd(), '__xvelte__', 'client', 'css');
        const serverDir = path.resolve(process.cwd(), '__xvelte__', 'server', 'css');

        const clientDestDir = path.resolve(dir, 'client', 'css');
        const serverDestDir = path.resolve(dir, 'server', 'css');

        if (!fs.existsSync(clientDestDir)) {
            //fs.mkdirSync(clientDestDir, { recursive: true });
        }
        if (!fs.existsSync(serverDestDir)) {
            //fs.mkdirSync(serverDestDir, { recursive: true });
        }

        fs.cpSync(clientDir, clientDestDir, { recursive: true, force: true });
        fs.cpSync(serverDir, serverDestDir, { recursive: true, force: true })
    }

    function copyStaticFolder(dir: string) {
        const staticFolder = path.resolve(process.cwd(), 'static');

        if (!fs.existsSync(staticFolder)) return;

        fs.cpSync(staticFolder, path.resolve(dir, 'static'), { recursive: true, force: true });
    }
}

class XvelteDevApp extends XvelteApp {
    protected get dev(): "true" {
        return "true";
    }

    constructor(template: string) {
        super(template);
    }
}