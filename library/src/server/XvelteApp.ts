import type { ServerResponse } from "node:http";
import { HTMLElement, parse as parseHtml } from 'node-html-parser'
import { render } from "svelte/server";
import type { Component } from "svelte";
import express, { type Handler } from 'express';
import fs, { ReadStream } from 'node:fs';
import path from "node:path";
import mime from 'mime-types'
import pathToRegexp from "path-to-regexp";
import cookie from 'cookie';
import type { PageHandler, IncomingMessage, PageHandleData, RequestHandler, AnyPageHandler, AnyRequestHandler, RouteParams, XvelteResponse, AnyRequestEvent } from "./types";
import { hash } from "node:crypto";

if (typeof (process.env.isDev) === "undefined") {
    process.env.isDev = false;
}

export class XvelteApp {
    private template: string;

    private pageHandlerMap = new Map<string, AnyPageHandler>();
    private pagePatternHandlerMap = new Map<pathToRegexp.MatchFunction<pathToRegexp.ParamData> | RegExp, AnyPageHandler>();

    private requestHandlerMap = new Map<string, AnyRequestHandler>();
    private requestPatternHandlerMap = new Map<pathToRegexp.MatchFunction<pathToRegexp.ParamData> | RegExp, AnyRequestHandler>();

    private componentIdMap = new ComponentIdMap();

    constructor(template: string) {
        this.template = template;
    }

    page<Route extends string | RegExp, Props extends Record<string, any>, LayoutProps extends Record<string, any>[]>(route: Route, handler: PageHandler<Route, Props, LayoutProps>) {
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

    get<Route extends string | RegExp>(route: Route, handler: RequestHandler<Route>) {
        this.registerRequestHandler(route, handler, 'get');
    }
    post<Route extends string | RegExp>(route: Route, handler: RequestHandler<Route>) {
        this.registerRequestHandler(route, handler, 'post');
    }
    put<Route extends string | RegExp>(route: Route, handler: RequestHandler<Route>) {
        this.registerRequestHandler(route, handler, 'put');
    }
    delete<Route extends string | RegExp>(route: Route, handler: RequestHandler<Route>) {
        this.registerRequestHandler(route, handler, 'delete');
    }
    all<Route extends string | RegExp>(route: Route, handler: RequestHandler<Route>) {
        this.registerRequestHandler(route, handler, 'all');
    }

    async handle(req: IncomingMessage, res: ServerResponse) {
        const event = new RequestEvent(req);
        if (await this.sendResponse(event, await this.getXvelteClientFileResponse(event), res)) return;
        if (await this.sendResponse(event, await this.getNavigationResponse(event), res)) return;

        const { handler, params, isPageHandler } = this.getHandler(event.url.pathname);
        event.params = params;

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

        res.statusCode = 404;
        return res.end('404 Error');
    }

    listen() {
        const expressApp = express();
        expressApp.use((req, res) => {
            this.handle(req, res);
        });
        expressApp.listen(3000);
    }

    private getHandler(path: string) {
        let handler: AnyPageHandler | AnyRequestHandler | null = null;
        let params: Record<string, string> = {};

        let c: { handler: AnyPageHandler | AnyRequestHandler | null, params: Record<string, string> } = this.getPageHandler(path);
        handler = c.handler;
        params = c.params;
        if (handler) {
            return { handler, params, isPageHandler: true } as { handler: AnyPageHandler, params: Record<string, string>, isPageHandler: true };
        }

        c = this.getRequestHandler(path);
        handler = c.handler;
        params = c.params;
        if (handler) {
            return { handler, params, isPageHandler: false } as { handler: AnyRequestHandler, params: Record<string, string>, isPageHandler: false };
        }

        return { handler, params, isPageHandler: false } as { handler: null, params: Record<string, string>, isPageHandler: false };
    }

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

    private getRequestHandler(path: string) {
        let handler: AnyPageHandler | AnyRequestHandler | null = null;
        let params: Record<string, any> = {};
        handler = this.requestHandlerMap.get(path) ?? null;
        if (handler) return { handler, params };

        for (const [pattern, handler_] of this.requestPatternHandlerMap.entries()) {
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
        return { handler, params }
    }

    /**
     * `XvelteResponse`를 전송합니다. 전송이 완료되면 true, 그렇지 않으면 false를 반환합니다.
     * false를 반환할 경우 handle 메소드에서 다음 단계로 넘어갑니다.
     */
    private async sendResponse(event_: AnyRequestEvent, response: XvelteResponse, res: ServerResponse) {
        if (response === false) {
            return false;
        }

        const event = event_ as unknown as NotPrivateRequestEvent<any>;
        res.writeHead(event.responseStatus, {
            ...event.responseHeader,
            'set-cookie': Object.values(event.responseCookie)
        })

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
            res.end();
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
        if (event.url.pathname.startsWith('/__xvelte__/client')) {
            const filePath = process.env.isDev ? path.join(process.cwd(), '.xvelte', event.url.pathname.replace(/\/__xvelte__\//, '')) : path.join(import.meta.dirname, event.url.pathname);
            if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
                event.setStatus(404);
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
    private renderPage(data: PageHandleData<any, any>) {
        const context = new Map<string, any>();

        const layouts = (data.layouts ?? []).map((l) => {
            const id = this.componentIdMap.register(l.component);
            const rendered = render(l.component, {
                props: l.props,
                context
            });
            const dom = parseHtml(rendered.body, { comment: true });
            dom.querySelectorAll('xvelte-island').forEach((island) => {
                island.setAttribute('data-frag-id', id);
            })
            return {
                id,
                head: rendered.head,
                body: dom.innerHTML
            }
        });

        const id = this.componentIdMap.register(data.component);
        const rendered = render(data.component, {
            props: data.props,
            context
        });
        const dom = parseHtml(rendered.body, { comment: true });
        dom.querySelectorAll('xvelte-island').forEach((island) => {
            island.setAttribute('data-frag-id', id);
        })
        const page = {
            id: this.componentIdMap.register(data.component),
            head: rendered.head,
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

        const rendered = this.renderPage(pageHandleData);
        const dom = parseHtml(this.template, { comment: true });

        const xvelteHead = dom.querySelector('xvelte-head');
        if (xvelteHead) {
            const newXvelteHead = parseHtml('<!--xvelte-head-->', { comment: true });
            if (process.env.isDev) {
                newXvelteHead.innerHTML += '<script type="module" src="/@vite/client"></script>';
            }
            newXvelteHead.innerHTML += `<style>${XvelteApp.css}</style>`;
            newXvelteHead.innerHTML += '<script type="module" src="/__xvelte__/client/svelte.js"></script>';
            [...rendered.layouts, rendered.page].forEach((layout) => {
                const frag = parseHtml(`<!--xvelte-headfrag-${layout.id}-->`, { comment: true });
                frag.innerHTML += layout.head;
                frag.innerHTML += `<!--/xvelte-headfrag-${layout.id}-->`;
                newXvelteHead.innerHTML += frag.innerHTML;
            });
            newXvelteHead.innerHTML += '<!--/xvelte-head-->';
            xvelteHead.replaceWith(newXvelteHead);
        }

        const xvelteBody = dom.querySelector('xvelte-body');
        if (xvelteBody) {
            if (rendered.layouts.length > 0) {
                const topLayoutFrag = parseHtml(`<xvelte-frag data-frag-id="${rendered.layouts[0].id}">${rendered.layouts[0].body}</xvelte-frag>`).children[0] as HTMLElement;
                let frag = topLayoutFrag;

                for (let i = 1; i < rendered.layouts.length; i++) {
                    const layout = rendered.layouts[i];

                    const slot = frag.getElementsByTagName('xvelte-slot')[0];
                    if (slot) {
                        frag = parseHtml(`<xvelte-frag data-frag-id="${layout.id}">${layout.body}</xvelte-frag>`).children[0] as HTMLElement;
                        slot.replaceWith(frag);
                    }
                }

                const slot = frag.getElementsByTagName('xvelte-slot')[0];
                if (slot) {
                    frag = parseHtml(`<xvelte-frag data-frag-id="${rendered.page.id}">${rendered.page.body}</xvelte-frag>`).children[0] as HTMLElement;
                    slot.replaceWith(frag);
                };
                xvelteBody.innerHTML = topLayoutFrag.outerHTML;
            }
            else {
                const frag = parseHtml(`<xvelte-frag data-frag-id="${rendered.page.id}">${rendered.page.body}</xvelte-frag>`);
                xvelteBody.innerHTML = frag.innerHTML;
            }
        }

        event.setHeader('content-type', 'text/html');
        return dom.innerHTML;
    }

    private async getNavigationResponse(event: AnyRequestEvent): Promise<XvelteResponse> {
        if (event.url.pathname !== "/__xvelte__/navigation") return false;
        const to_ = event.url.searchParams.get('to');
        if (!to_) return false;
        const baseUrl =
            event.requestHeaders.origin ? event.requestHeaders.origin :
                event.requestHeaders.host ? `http://${event.requestHeaders.host}` : 'http://localhost';
        const to = new URL(to_, baseUrl);

        const { handler, params } = this.getPageHandler(to.pathname);
        if (!handler) return false;

        event.url = to;
        event.params = params;
        const renderingData = await handler(event);
        if (!renderingData) return null;

        const renderedData = this.renderPage(renderingData);
        return JSON.stringify(renderedData);
    }

    private registerRequestHandler<Route extends string | RegExp>(route: Route, handler: RequestHandler<Route>, method: string) {
        if (typeof (route) === "string") {
            const route_ = pathify(route);

            const pathRegexp = pathToRegexp.pathToRegexp(route_);
            if (pathRegexp.keys.length === 0) {
                const formerHandler = this.requestHandlerMap.get(route_);
                this.requestHandlerMap.set(route_, generateNewHandler(formerHandler));
            }
            else {
                const formerHandler = this.requestPatternHandlerMap.get(pathToRegexp.match(route_));
                this.requestPatternHandlerMap.set(pathToRegexp.match(route_), generateNewHandler(formerHandler));
            }
        }
        else {
            const formerHandler = this.requestPatternHandlerMap.get(route);
            this.requestPatternHandlerMap.set(route, generateNewHandler(formerHandler));
        }

        function generateNewHandler(formerHandler: AnyRequestHandler | undefined): RequestHandler<Route> {
            if (method === "all") {
                return async (event: AnyRequestEvent) => {
                    if (formerHandler) {
                        const r = await formerHandler(event);
                        if (r !== false) return r;
                    }

                    return await handler(event);
                }
            }
            else {
                return async (event: AnyRequestEvent) => {
                    if (event.method === method) {
                        return await handler(event);
                    }

                    if (formerHandler) {
                        return await formerHandler(event);
                    }

                    return false;
                }
            }
        }
    }
}

export namespace XvelteApp {
    export const css = `xvelte-body, xvelte-island, xvelte-frag{display:contents;}`;
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

interface NotPrivateRequestEvent<Route extends string | RegExp> {
    url: URL;
    params: Route extends string ? RouteParams<Route> : Record<string, string>;
    requestHeaders: Record<string, string>;
    locals: Record<string, any>;
    request: IncomingMessage;
    requestCookie: Record<string, string | undefined>;
    responseHeader: Record<string, string>;
    responseStatus: number;
    responseCookie: Record<string, string>;
}
export class RequestEvent<Route extends string | RegExp> {
    url: URL;
    //@ts-expect-error
    params: Route extends string ? RouteParams<Route> : Record<string, string>;
    requestHeaders: Record<string, string>;
    locals: Record<string, any> = {};
    method: string;

    private request;
    private requestCookie;
    private requestData: Promise<Buffer<ArrayBuffer>>;
    private responseHeader: Record<string, string | number | string[]> = {};
    private responseStatus: number = 200;
    private responseCookie: Record<string, string> = {};

    constructor(req: IncomingMessage) {
        const baseUrl =
            req.headers.origin ? req.headers.origin :
                req.headers.host ? `http://${req.headers.host}` : 'http://localhost';
        const url = new URL(req.url ?? '', baseUrl);

        this.url = url;
        this.method = (req.method ?? 'get').toLowerCase();
        this.request = req;
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
    setStatus(status: number) {
        this.responseStatus = status;
    }
    getStatus() {
        return this.responseStatus;
    }
    getCookie(key: string) {
        return this.requestCookie[key] ?? null;
    }
    setCookie(key: string, value: string, option: cookie.SerializeOptions & { path: string }) {
        this.responseCookie[key] = cookie.serialize(key, value, option);
    }
    getClientAddress() {
        return this.requestHeaders['x-forwarded-for'] ?? this.request.socket.remoteAddress ?? '';
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
}

function pathify(path_: string) {
    return new URL(path_, 'http://void').pathname;
}