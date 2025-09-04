/// <reference types="vite/client" />

import { createServer, type ServerResponse } from "node:http";
import { HTMLElement, parse as parseHtml } from 'node-html-parser'
import { render } from "svelte/server";
import type { Component } from "svelte";
import fs, { ReadStream } from 'node:fs';
import path from "node:path";
import mime from 'mime-types'
import pathToRegexp from "path-to-regexp";
import cookie from 'cookie';
import type { PageHandler, IncomingMessage, PageHandleData, EndpointHandler, AnyPageHandler, AnyEndpointHandler, RouteParams, XvelteResponse, AnyRequestEvent, RequestMethod, XvelteHook, MaybePromise } from "./types.js";
import { hash, randomUUID } from "node:crypto";
import type { NavigationResponse, RenderingData } from "../types.js";
import * as devalue from 'devalue';
import Busboy from 'busboy';

const pageRoutesMap = new Map<string, AnyPageHandler>();
const endpointRoutes: [string, 'get' | 'post' | 'put' | 'delete' | 'all', AnyEndpointHandler][] = [];

if (import.meta.env?.PROD) {
    const routesDirPath = path.resolve(process.argv[1] ? path.dirname(process.argv[1]) : process.cwd(), 'routes').replaceAll('\\', '/');
    const entries = fs.globSync(path.resolve(routesDirPath, '*.js'));

    const rootRouterPath = path.resolve(routesDirPath, '..js');
    if (fs.existsSync(rootRouterPath)) {
        entries.unshift(path.resolve(routesDirPath, '..js'));
    }

    for (let entry of entries) {
        entry = entry.replaceAll('\\', '/');
        try {
            const basename = path.basename(entry).replace(/\.(.*)js$/, '');
            const module = await import(/* @vite-ignore */`file://${path.resolve(routesDirPath, `${encodeURIComponent(basename) || '.'}.js`)}`);
            const route = toRoutePath('/' + decodeURIComponent(basename));
            if ("page" in module) {
                pageRoutesMap.set(route, module.page);
            }
            (['get', 'post', 'put', 'delete', 'all'] as const).forEach((method) => {
                if (method in module) {
                    endpointRoutes.push([route, method, module.get])
                }
            })
        }
        catch (err) {
            console.log(`${entry} is not a javascript module.`);
        }
    }

    function toRoutePath(basename: string) {
        return basename
            .replace(/index$/, '')        // index는 생략
            .replace(/\[\.{3}.+\]/, '*')  // [...all] -> *
            .replace(/\[(.+?)\]/g, ':$1') // [id] -> :id
            .replace(/\/+/g, '/');
    }
}

export class XvelteApp {
    private template: string;

    private pageHandlerMap = new Map<string, AnyPageHandler>();
    private pagePatternHandlerMap = new Map<pathToRegexp.MatchFunction<pathToRegexp.ParamData> | RegExp, AnyPageHandler>();
    private endpointHandlerManager = new EndpointHandlerManager();
    allHandlers: (['page', string | RegExp, AnyPageHandler] | ['endpoint', string | RegExp, 'get' | 'post' | 'put' | 'delete' | 'all', AnyEndpointHandler])[] = [];

    private componentIdMap = new ComponentIdMap();

    private hookFunction?: XvelteHook;

    constructor(template: string) {
        this.template = template;
        pageRoutesMap.forEach((handler, route) => {
            this.page(route, handler);
        });
        endpointRoutes.forEach(([route, method, handler]) => {
            this[method](route, handler);
        })
    }

    /**
     * 페이지 핸들러 추가
     * @param route 
     * @param handler 
     */
    page<Route extends string | RegExp, Props extends Record<string, any>, LayoutProps extends Record<string, any>[]>(route: Route, handler: PageHandler<Route, Props, LayoutProps>) {
        this.allHandlers.push(['page', route, handler]);
        if (typeof (route) === "string") {
            const route_ = pathify(route)

            const pathRegexp = pathToRegexp.pathToRegexp(route_);
            if (pathRegexp.keys.length === 0) {
                this.pageHandlerMap.set(route_, handler);
            }
            else {
                this.pagePatternHandlerMap.set(pathToRegexp.match(route_), handler);
            }
        }
        else {
            this.pagePatternHandlerMap.set(route, handler);
        }
    }

    /** Get 엔드포인트 핸들러 추가 */
    get<Route extends string | RegExp>(route: Route, handler: EndpointHandler<Route>) {
        this.allHandlers.push(['endpoint', route, 'get', handler]);
        this.endpointHandlerManager.set(route, 'get', handler);
    }
    /** Post 엔드포인트 핸들러 추가 */
    post<Route extends string | RegExp>(route: Route, handler: EndpointHandler<Route>) {
        this.allHandlers.push(['endpoint', route, 'post', handler])
        this.endpointHandlerManager.set(route, 'post', handler);
    }
    /** Put 엔드포인트 핸들러 추가 */
    put<Route extends string | RegExp>(route: Route, handler: EndpointHandler<Route>) {
        this.allHandlers.push(['endpoint', route, 'put', handler])
        this.endpointHandlerManager.set(route, 'put', handler);
    }
    /** Delete 엔드포인트 핸들러 추가 */
    delete<Route extends string | RegExp>(route: Route, handler: EndpointHandler<Route>) {
        this.allHandlers.push(['endpoint', route, 'delete', handler])
        this.endpointHandlerManager.set(route, 'delete', handler);
    }
    /** 엔드포인트 핸들러 추가 */
    all<Route extends string | RegExp>(route: Route, handler: EndpointHandler<Route>) {
        this.allHandlers.push(['endpoint', route, 'all', handler])
        this.endpointHandlerManager.set(route, 'all', handler);
    }

    /**
     * hook 설정
     */
    hook(xvelteHook: XvelteHook) {
        this.hookFunction = xvelteHook;
    }

    get handler() {
        const THIS = this;
        const handler = THIS.handle.bind(THIS);
        Object.defineProperty(handler, "app", { value: THIS, writable: false });
        return handler as (XvelteApp['handle'] & { app: XvelteApp });
    }

    /**
     * HTTP 요청 핸들러. Node http 모듈, Express 등에서 사용 가능.
     * @param req 
     * @param res 
     * @returns 
     */
    private async handle(req: IncomingMessage, res: ServerResponse) {
        try {
            let event = new RequestEvent(req, res);
            if (this.hookFunction) {
                const r = await this.hookFunction(event);
                if (r instanceof RequestEvent) {
                    event = r;
                }
                else {
                    return await this.sendResponse(event, r, res);
                }
            }

            if (await this.sendResponse(event, await this.getXvelteClientFileResponse(event), res)) return;
            if (await this.sendResponse(event, await this.getNavigationResponse(event), res)) return;

            const { handler, params, isPageHandler } = this.getHandler(event.url.pathname);
            RequestEvent.setParams(event, params);

            if (handler) {
                let response: XvelteResponse;
                if (isPageHandler) {
                    response = await this.getPageResponse(event, handler)
                }
                else {
                    response = await handler(event);
                }

                if (await this.sendResponse(event, response, res)) return;
            }

            const staticPath = path.join(process.env.dev ? process.cwd() : (process.argv[1] ? path.dirname(process.argv[1]) : process.cwd()), 'static');
            const filePath = path.join(staticPath, event.url.pathname);

            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                const mimeType = mime.contentType(path.basename(filePath));
                if (mimeType) {
                    event.setHeader('content-type', mimeType);
                }
                const fileStream = fs.createReadStream(filePath);
                return await this.sendResponse(event, fileStream, res);
            }

            res.statusCode = 404;
            return res.end('404 Error');
        }
        catch (err) {
            console.error(err);
            res.statusCode = 500;
            return res.end();
        }
    }

    listen(port: number, callback?: (error?: Error) => any) {
        const app = createServer((req, res) => {
            this.handle(req as IncomingMessage, res);
        });
        app.listen(port, callback);
    }

    /**
     * 특정 경로에 해당하는 핸들러, url 파라미터, 페이지 핸들러 여부를 반환
     * @param path 
     * @returns 
     */
    private getHandler(path: string) {
        let handler: AnyPageHandler | AnyEndpointHandler | null = null;
        let params: Record<string, string> = {};

        let c: { handler: AnyPageHandler | AnyEndpointHandler | null, params: Record<string, string> } = this.getPageHandler(path);
        handler = c.handler;
        params = c.params;
        if (handler) {
            return { handler, params, isPageHandler: true } as { handler: AnyPageHandler, params: Record<string, string>, isPageHandler: true };
        }

        c = this.getEndpointHandler(path);
        handler = c.handler;
        params = c.params;
        if (handler) {
            return { handler, params, isPageHandler: false } as { handler: AnyEndpointHandler, params: Record<string, string>, isPageHandler: false };
        }

        return { handler, params, isPageHandler: false } as { handler: null, params: Record<string, string>, isPageHandler: false };
    }

    /**
     * 페이지 핸들러, url 파라미터를 반환
     * @param path 
     * @returns 
     */
    private getPageHandler(path: string) {
        let handler: AnyPageHandler | null = null;
        let params: Record<string, any> = {};

        handler = this.pageHandlerMap.get(path) ?? null;
        if (handler) return { handler, params };

        for (const [pattern, handler_] of this.pagePatternHandlerMap.entries()) {
            if (typeof (pattern) === "function") {
                const matched = pattern(path);
                if (matched) {
                    params = matched.params;
                    handler = handler_;
                }
            }
            else {
                if (pattern.test(path)) {
                    handler = handler_;
                }
            }
        }
        return { handler, params };
    }

    /**
     * 요청 핸들러, url 파리미터를 반환
     * @param path 
     * @returns 
     */
    private getEndpointHandler(path: string) {
        return this.endpointHandlerManager.getSingleTypeHandler(path)
    }

    /**
     * `XvelteResponse`를 전송합니다. 전송이 완료되면 true, 그렇지 않으면 false를 반환합니다.
     * false를 반환할 경우 handle 메소드에서 다음 단계로 넘어갑니다.
     */
    private async sendResponse(event: AnyRequestEvent, response: XvelteResponse, res: ServerResponse) {
        if (response === false) {
            return false;
        }

        res.writeHead(event.status, {
            ...RequestEvent.getResponseHeader(event),
            'set-cookie': Object.values(RequestEvent.getResponseCookie(event))
        });

        if (response instanceof ArrayBuffer) {
            res.end(Buffer.from(response));
            return true;
        }
        if (response instanceof Blob) {
            res.end(Buffer.from(await response.arrayBuffer()));
            return true;
        }
        if (response instanceof Buffer) {
            res.end(response);
            return true;
        }
        if (response instanceof FormData) {
            res.end(response);
            return true;
        }
        if (response === null) {
            return true;
        }
        if (response instanceof ReadStream) {
            response.pipe(res);
            await new Promise((resolve, reject) => {
                res.on('finish', resolve);
                res.on('error', reject);
            });
            return true;
        }
        if (typeof (response) === "string") {
            res.end(response);
            return true;
        }
        if (response instanceof URLSearchParams) {
            res.end(response.toString());
            return true;
        }

        for await (const chunk of (response as AsyncIterable<Uint8Array> | Iterable<Uint8Array>)) {
            res.write(Buffer.from(chunk));
        }
        res.end();
        return true;
    }

    /**
    * 클라이언트 스크립트와 클라이언트 컴포넌트 파일 전송
    */
    private async getXvelteClientFileResponse(event: AnyRequestEvent): Promise<XvelteResponse> {
        if (event.url.pathname === '/__xvelte__/client' || event.url.pathname.startsWith('/__xvelte__/client/')) {
            const filePath = path.join(process.env.dev ? process.cwd() : (process.argv[1] ? path.dirname(process.argv[1]) : process.cwd()), event.url.pathname);
            if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
                event.status = 404;
                return null;
            }

            const mimeType = mime.contentType(path.basename(filePath));
            if (mimeType) {
                event.setHeader('content-type', mimeType);
            }
            const fileStream = fs.createReadStream(filePath);
            return fileStream;
        }
        return false;
    }

    /**
     * 페이지 핸들러로 렌더링
     */
    private async renderPage(data: PageHandleData<any, any>): Promise<RenderingData> {
        const context = new Map<string, any>();

        const layouts = await asyncMap(data.layouts ?? [], async (l) => {
            const cssModulePath = path.join(process.env.dev ? process.cwd() : (process.argv[1] ? path.dirname(process.argv[1]) : process.cwd()), '__xvelte__', 'server', 'css', `${l.component.name}_css.js`);
            let cssData: string[] = [];
            if (fs.existsSync(cssModulePath)) {
                await import(/* @vite-ignore */ cssModulePath)
                    .then((module) => {
                        cssData = module.default as string[]
                    })
                    .catch(() => { });
            }

            const id = this.componentIdMap.register(l.component);
            const rendered = render(l.component, {
                props: l.props,
                context
            });
            const dom = parseHtml(rendered.body, { comment: true });
            dom.querySelectorAll('xvelte-island').forEach((island) => {
                island.setAttribute('data-frag-id', id);
            })

            let head = rendered.head;
            for (const href of cssData) {
                head += `<link href="/__xvelte__/client/css/${href}.css" rel="stylesheet" />`;
            }

            return {
                id,
                head,
                body: dom.innerHTML
            }
        });

        const cssModulePath = path.join(process.env.dev ? process.cwd() : (process.argv[1] ? path.dirname(process.argv[1]) : process.cwd()), '__xvelte__', 'server', 'css', `${data.component.name}_css.js`);
        let cssData: string[] = [];
        if (fs.existsSync(cssModulePath)) {
            await import(/* @vite-ignore */ cssModulePath)
                .then((module) => {
                    cssData = module.default as string[]
                })
                .catch(() => { });
        }
        const id = this.componentIdMap.register(data.component);
        const rendered = render(data.component, {
            props: data.props,
            context
        });
        const dom = parseHtml(rendered.body, { comment: true });
        dom.querySelectorAll('xvelte-island').forEach((island) => {
            island.setAttribute('data-frag-id', id);
        });
        let head = rendered.head;
        for (const href of cssData) {
            head += `<link href="/__xvelte__/client/css/${href}.css" rel="stylesheet" />`;
        }
        const page = {
            id: this.componentIdMap.register(data.component),
            head,
            body: dom.innerHTML
        };

        return { layouts, page }
    }

    /**
     * 페이지 전송(html)
     */
    private async getPageResponse(event: AnyRequestEvent, handler: AnyPageHandler): Promise<XvelteResponse> {
        const pageHandleData = await handler(event);
        if (!pageHandleData) {
            return null;
        }

        const renderingData =
            ("head" in pageHandleData && "body" in pageHandleData) ?
                { layouts: [], page: { id: `random-${randomUUID()}`, head: pageHandleData.head, body: pageHandleData.body } } as RenderingData :
                await this.renderPage(pageHandleData);
        const dom = parseHtml(this.template, { comment: true });

        const xvelteHead = dom.querySelector('xvelte-head');
        if (xvelteHead) {
            const newXvelteHead = parseHtml('<!--xvelte-head-->', { comment: true });
            if (process.env.dev) {
                newXvelteHead.innerHTML += '<script type="module" src="/@vite/client"></script>';
            }
            newXvelteHead.innerHTML += `<style>${XvelteApp.css}</style>`;
            newXvelteHead.innerHTML += '<script type="module" src="/__xvelte__/client/xvelte.js"></script>';
            [...renderingData.layouts, renderingData.page].forEach((layout) => {
                const frag = parseHtml(`<!--xvelte-headfrag-${layout.id}-->`, { comment: true });
                frag.innerHTML += layout.head;
                frag.innerHTML += `<!--/xvelte-headfrag-${layout.id}-->`;
                newXvelteHead.innerHTML += frag.innerHTML;
            });
            // RenderingData를 넘기기
            newXvelteHead.innerHTML += `
            <script>
            window.__xvelte_temp__ = {
                renderingData: ${devalue.stringify(renderingData)}
            };
            document.currentScript?.remove();
            </script>
            `
            newXvelteHead.innerHTML += '<!--/xvelte-head-->';
            xvelteHead.replaceWith(newXvelteHead);
        }

        const xvelteBody = dom.querySelector('xvelte-body');
        if (xvelteBody) {
            if (renderingData.layouts.length > 0) {
                const topLayoutFrag = parseHtml(`<xvelte-frag data-frag-id="${renderingData.layouts[0].id}">${renderingData.layouts[0].body}</xvelte-frag>`).children[0] as HTMLElement;
                let frag = topLayoutFrag;

                for (let i = 1; i < renderingData.layouts.length; i++) {
                    const layout = renderingData.layouts[i];

                    const slot = frag.getElementsByTagName('xvelte-slot')[0];
                    if (slot) {
                        frag = parseHtml(`<xvelte-frag data-frag-id="${layout.id}">${layout.body}</xvelte-frag>`).children[0] as HTMLElement;
                        slot.replaceWith(frag);
                    }
                }

                const slot = frag.getElementsByTagName('xvelte-slot')[0];
                if (slot) {
                    frag = parseHtml(`<xvelte-frag data-frag-id="${renderingData.page.id}">${renderingData.page.body}</xvelte-frag>`).children[0] as HTMLElement;
                    slot.replaceWith(frag);
                };
                xvelteBody.innerHTML = topLayoutFrag.outerHTML;
            }
            else {
                const frag = parseHtml(`<xvelte-frag data-frag-id="${renderingData.page.id}">${renderingData.page.body}</xvelte-frag>`);
                xvelteBody.innerHTML = frag.innerHTML;
            }
        }

        event.setHeader('content-type', 'text/html');
        return dom.innerHTML;
    }

    /**
     * `/__xvelte__/navigation`으로 요청을 받았을 때 렌더링 데이터 반환
     * @param event 
     * @returns 
     */
    private async getNavigationResponse(event: AnyRequestEvent): Promise<XvelteResponse> {
        if (event.url.pathname !== "/__xvelte__/navigation") return false;
        const to_ = event.url.searchParams.get('to');
        if (!to_) return false;
        const baseUrl =
            event.requestHeaders.origin ? event.requestHeaders.origin :
                event.requestHeaders.host ? `http://${event.requestHeaders.host}` : 'http://localhost';
        const to = new URL(to_, baseUrl);

        const { handler, params } = this.getPageHandler(to.pathname);
        if (!handler){
            event.status = 404;
            return JSON.stringify({ layouts: [], page: { id: `random-${randomUUID()}`, head: '', body: '<h1>404 Error</h1>' } });
        };

        event.url = to;
        RequestEvent.setParams(event, params);
        const pageHandleData = await handler(event);
        if (!pageHandleData) return null;

        if(300 <= event.status && event.status < 400){
            event.status = 200;
            return JSON.stringify({
                type: 'redirect',
                location: RequestEvent.getResponseHeader(event).location ?? ''
            } as NavigationResponse)
        }

        const renderingData =
            ("head" in pageHandleData && "body" in pageHandleData) ?
                { layouts: [], page: { id: `random-${randomUUID()}`, head: pageHandleData.head, body: pageHandleData.body } } as RenderingData :
                await this.renderPage(pageHandleData);
        return JSON.stringify({
            type: 'page',
            renderingData
        } as NavigationResponse);
    }
}

export namespace XvelteApp {
    export const css = `xvelte-body, xvelte-island, xvelte-frag{display:contents;}`;
    export function sequence(...hooks: XvelteHook[]): XvelteHook {
        return async (event) => {
            for (const hook of hooks) {
                const maybeEvent = await hook(event);
                if (maybeEvent instanceof RequestEvent) {
                    event = maybeEvent;
                }
                else {
                    return maybeEvent;
                }
            }
            return event;
        }
    }
}

class ComponentIdMap {
    private map = new Map<Component, string>();
    private reverseMap = new Map<string, Component>();

    register(component: Component) {
        if (this.map.has(component)) {
            return this.map.get(component) as string;
        }

        const id = hash('md5', component.toString(), 'hex');

        this.map.set(component, id);
        this.reverseMap.set(id, component);
        return id;
    }

    getId(component: Component) {
        return this.map.get(component);
    }

    getComponent(id: string) {
        return this.reverseMap.get(id);
    }
}

export class RequestEvent<Route extends string | RegExp> {
    url: URL;
    //@ts-expect-error
    params: Route extends string ? RouteParams<Route> : Record<string, string>;
    requestHeaders: Record<string, string>;
    locals: Record<string, any> = {};
    method: string;
    status: number = 200;
    cookie = {
        get: (key: string) => {
            return this.requestCookie[key] ?? null;
        },
        set: (key: string, value: string, option: cookie.SerializeOptions & { path: string }) => {
            this.responseCookie[key] = cookie.serialize(key, value, option);
        },
        delete: (key: string, option: { path: string }) => {
            delete this.responseCookie[key];
            this.responseCookie[key] = cookie.serialize(key, "", { path: option.path, maxAge: 0 });
        }
    }

    request;
    response;
    private requestCookie;
    private requestData: Promise<Buffer<ArrayBuffer>>;
    private responseHeader: Record<string, string | number | string[]> = {};
    private responseCookie: Record<string, string> = {};

    constructor(req: IncomingMessage, res: ServerResponse) {
        const baseUrl =
            req.headers.origin ? req.headers.origin :
                req.headers.host ? `http://${req.headers.host}` : 'http://localhost';
        const url = new URL(req.url ?? '', baseUrl);

        this.url = url;
        this.method = (req.method ?? 'get').toLowerCase();
        this.request = req;
        this.response = res;
        this.requestHeaders = req.headers as unknown as Record<string, string>;
        this.requestData = new Promise((resolve, reject) => {
            const body: Uint8Array[] = [];
            this.request.on('data', (chunk) => {
                body.push(chunk);
            });
            this.request.on('end', () => {
                resolve(Buffer.concat(body))
            })
            this.request.on('error', reject);
        })
        this.requestCookie = cookie.parse(this.requestHeaders.cookie ?? '');
    }

    setHeader(key: string, value: string | number | string[]) {
        this.responseHeader[key] = value;
    }
    getClientAddress() {
        return this.requestHeaders['x-forwarded-for'] ?? this.request.socket.remoteAddress ?? '';
    }
    /**
     * 리다이렉트 설정. `status`를 설정하지 않으면 302로 설정됩니다.
     * @param location 
     * @param status 
     */
    redirect(location: string | URL, status?: number){
        this.status = status ?? 302;
        this.setHeader('location', location instanceof URL ? location.href : location);
    }
    async text() {
        return (await this.requestData).toString();
    }
    async json() {
        return JSON.parse(await this.text());
    }
    async blob() {
        return new Blob([await this.requestData])
    }
    async buffer() {
        return await this.requestData;
    }
    async form() {
        return await new Promise<{ fields: Record<string, string>, files: Record<string, { filename: string; mimeType: string; buffer: Buffer; }> }>(async (resolve, reject) => {
            if (!("content-type" in this.requestHeaders)) {
                return reject('Missing Content-Type header.');
            }
            const busboy = Busboy({ headers: this.requestHeaders });
            const fields: Record<string, string> = {};
            const files: Record<string, { filename: string; mimeType: string; buffer: Buffer; }> = {};

            busboy.on("file", (fieldname, file, info) => {
                const chunks: Buffer[] = [];
                file.on("data", chunk => chunks.push(chunk));
                file.on("end", () => {
                    files[fieldname] = {
                        filename: info.filename,
                        mimeType: info.mimeType,
                        buffer: Buffer.concat(chunks), // ✅ 파일 Buffer
                    };
                });
            });

            busboy.on("field", (fieldname, val) => {
                fields[fieldname] = val;
            });

            busboy.on("finish", () => resolve({ fields, files }));
            busboy.on("error", reject);

            // ✅ 이미 모인 Buffer를 스트림처럼 밀어넣기
            busboy.end(await this.requestData);
        })
    }
}
export namespace RequestEvent {
    export function setParams(event: AnyRequestEvent, params: Record<string, string>) {
        event.params = params
    }
    export function getResponseHeader(event: AnyRequestEvent) {
        //@ts-expect-error
        return event.responseHeader;
    }
    export function getResponseCookie(event: AnyRequestEvent) {
        //@ts-expect-error
        return event.responseCookie;
    }
}

class EndpointHandlerManager {
    map = new Map<string, Record<string, AnyEndpointHandler>>();
    patternMap = new Map<pathToRegexp.MatchFunction<pathToRegexp.ParamData> | RegExp, Record<string, AnyEndpointHandler>>();

    set<Route extends string | RegExp>(route: Route, method: RequestMethod, handler: AnyEndpointHandler) {
        method = method.toLowerCase();
        let handlerObject;
        if (typeof (route) === "string") {
            const route_ = pathify(route);

            const pathRegexp = pathToRegexp.pathToRegexp(route_);
            if (pathRegexp.keys.length === 0) { // 절대 경로
                handlerObject = this.map.get(route_);
                if (!handlerObject) {
                    handlerObject = {};
                    this.map.set(route_, handlerObject);
                }
            }
            else {
                const pattern = pathToRegexp.match(route_);
                handlerObject = this.patternMap.get(pattern);
                if (!handlerObject) {
                    handlerObject = {};
                    this.patternMap.set(pattern, handlerObject);
                }
            }
        }
        else {
            handlerObject = this.patternMap.get(route);
            if (!handlerObject) {
                handlerObject = {};
                this.patternMap.set(route, handlerObject);
            }
        }
        handlerObject[method] = handler;
    }

    getSingleTypeHandler(path: string) {
        let handlerObject = this.map.get(path);
        let params = {};
        if (!handlerObject) {
            for (const [pattern, handlerObject_] of this.patternMap.entries()) {
                if (typeof (pattern) === "function") {
                    const matched = pattern(path);
                    if (matched) {
                        params = matched.params;
                        handlerObject = handlerObject_;
                    }
                }
                else {
                    if (pattern.test(path)) {
                        handlerObject = handlerObject_;
                    }
                }
            }
        }

        return {
            handler: handlerObject ? ((event) => {
                for (const method of Object.keys(handlerObject)) {
                    if (method === "all") continue;
                    if (method === event.method) {
                        return handlerObject[method](event);
                    }
                }

                if ("all" in handlerObject) {
                    return handlerObject.all(event);
                }

                return false;
            }) as AnyEndpointHandler : null,
            params
        }
    }
}

function pathify(path_: string) {
    return new URL(path_, 'http://void').pathname;
}

async function asyncMap<T extends any, U>(array: T[], callback: (element: T, index: number, array: T[]) => MaybePromise<U>) {
    const results: U[] = [];
    for (let index = 0; index < array.length; index++) {
        const element = array[index];
        results.push(await callback.call(array, element, index, array));
    }
    return results;
}