import type { IncomingMessage as IncomingMessage_, ServerResponse } from "node:http";
import { HTMLElement, parse as parseHtml } from 'node-html-parser'
import { render } from "svelte/server";
import type { Component } from "svelte";
import express from 'express';
import fs from 'node:fs';
import path from "node:path";
import mime from 'mime-types'
import pathToRegexp from "path-to-regexp";

if (typeof (process.env.isDev) === "undefined") {
    process.env.isDev = false;
}

export class XvelteApp {
    private template: string;

    private pageHandlerMap = new Map<string, PageHandler<any, any, any>>();
    private pagePatternHandlerMap = new Map<pathToRegexp.MatchFunction<pathToRegexp.ParamData> | RegExp, PageHandler<any, any, any>>();

    private componentIdMap = new ComponentIdMap();

    constructor(template: string) {
        this.template = template;
    }

    page<Route extends string | RegExp, Props extends Record<string, any>, LayoutProps extends Record<string, any>[]>(route: Route, handler: PageHandler<Route, Props, LayoutProps>) {
        if (typeof (route) === "string") {
            let route_: string = route;
            while (route_.endsWith('/')) {
                route_ = route_.slice(0, -1);
            }

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

    async handle(req: IncomingMessage, res: ServerResponse) {
        if (!req.url) {
            res.statusCode = 404;
            return res.end();
        }
        else {
            while (req.url.endsWith('/')) {
                req.url = req.url?.slice(0, -1);
            }
        }

        if (await this.sendXvelteClientFile(req, res)) return;
        if (await this.sendPage(req, res)) return;

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

    /**
     * 클라이언트 스크립트와 클라이언트 컴포넌트 파일 전송
     * @param req 
     * @param res 
     * @returns 
     */
    private async sendXvelteClientFile(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
        if (req.url?.startsWith('/__xvelte__/client')) {
            const filePath = process.env.isDev ? path.join(process.cwd(), '.xvelte', req.url.replace(/\/__xvelte__\//, '')) : path.join(import.meta.dirname, req.url);
            if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
                res.statusCode = 404;
                res.end();
                return true;
            }

            const mimeType = mime.contentType(path.basename(filePath));
            if (mimeType) {
                res.setHeader('content-type', mimeType);
            }
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
            await new Promise((resolve, reject) => {
                res.on('close', resolve);
                res.on('error', reject)
            });
            return true;
        }
        return false;
    }

    /**
     * 페이지 전송(html)
     * @param req 
     * @param res 
     * @returns 
     */
    private async sendPage(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
        const { handler, params } = this.getPageHandler(req.url);

        if (!handler) return false;

        const pageHandleData = await handler({
            params: params ?? undefined
        });

        if (!pageHandleData) {
            return res.writableEnded;
        }

        const rendered = this.renderPage(pageHandleData);
        const dom = parseHtml(this.template, { comment: true });

        const xvelteHead = dom.querySelector('xvelte-head');
        if (xvelteHead) {
            const newXvelteHead = parseHtml('<!--xvelte-head-->', { comment: true })
            if (process.env.isDev) {
                newXvelteHead.innerHTML += '<script type="module" src="/@vite/client"></script>';
            }
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
                const topLayoutFrag = parseHtml(`<xvelte-frag data-component-id="${rendered.layouts[0].id}">${rendered.layouts[0].body}</xvelte-frag>`).children[0] as HTMLElement;
                let frag = topLayoutFrag;

                for (let i = 1; i < rendered.layouts.length; i++) {
                    const layout = rendered.layouts[i];

                    const slot = frag.getElementsByTagName('xvelte-slot')[0];
                    if (slot) {
                        frag = parseHtml(`<xvelte-frag data-component-id="${layout.id}">${layout.body}</xvelte-frag>`).children[0] as HTMLElement;
                        slot.replaceWith(frag);
                    }
                }

                const slot = frag.getElementsByTagName('xvelte-slot')[0];
                if (slot) {
                    frag = parseHtml(`<xvelte-frag data-component-id="${rendered.page.id}">${rendered.page.body}</xvelte-frag>`).children[0] as HTMLElement;
                    slot.replaceWith(frag);
                };
                xvelteBody.innerHTML = topLayoutFrag.outerHTML;
            }
            else {
                const frag = parseHtml(`<xvelte-frag data-component-id="${rendered.page.id}">${rendered.page.body}</xvelte-frag>`);
                xvelteBody.innerHTML = frag.innerHTML;
            }
        }

        res.setHeader('content-type', 'text/html');
        res.end(dom.innerHTML);
        return true;
    }

    /**
     * 네비게이션 시 렌더링 데이터 전송
     * @param req 
     * @param res 
     * @returns 
     */
    private async sendNavigationData(req: IncomingMessage, res: ServerResponse){
        if(!req.url.startsWith('/__xvelte__/navigation')) return;
        
        const to = new URL(req.url, req.headers.host ? `http://${req.headers.host}` : 'http://localhost');
    }

    /**
     * 페이지 핸들러
     * @param url 
     * @returns 
     */
    private getPageHandler(url: string) {
        let handler: PageHandler<any, any, any> | null = this.pageHandlerMap.get(url) ?? null;
        let params: Record<string, any> | null = null;
        if (!handler) {
            for (const [pattern, handler_] of this.pagePatternHandlerMap.entries()) {
                if (typeof (pattern) === "function") {
                    const matched = pattern(url);
                    if (matched) {
                        params = matched.params;
                        handler = handler_;
                    }
                }
                else {
                    if (pattern.test(url)) {
                        handler = handler_;
                    }
                }
            }
        }

        return { handler, params }
    }

    /**
     * 페이지 핸들러로 렌더링
     * @param data 
     * @returns 
     */
    private renderPage(data: PageHandleData<any, any>) {
        const context = new Map<string, any>();

        const layouts = (data.layouts ?? []).map((l) => {
            const rendered = render(l.component, {
                props: l.props,
                context
            });
            return {
                id: this.componentIdMap.register(l.component),
                head: rendered.head,
                body: rendered.body
            }
        });

        const rendered = render(data.component, {
            props: data.props,
            context
        })
        const page = {
            id: this.componentIdMap.register(data.component),
            head: rendered.head,
            body: rendered.body
        };

        return { layouts, page }
    }
}

class ComponentIdMap {
    private map = new Map<Component, string>();
    private reverseMap = new Map<string, Component>();

    register(component: Component) {
        if (this.map.has(component)) {
            return this.map.get(component);
        }

        let id: string;
        do {
            id = 'x' + Math.random().toString(16).replace('.', '');
        } while (this.reverseMap.has(id));

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

type RequestEvent<Route extends string | RegExp> = {
    params: Route extends string ? RouteParams<Route> : undefined;
}
type RequestHandler<Route extends string | RegExp> = (event: RequestEvent<Route>) => MaybePromise<Response | null>;

type PageHandler<Route extends string | RegExp, Props extends Record<string, any>, LayoutProps extends Record<string, any>[]> = (event: RequestEvent<Route>) => MaybePromise<PageHandleData<Props, LayoutProps> | null>;
type PageHandleData<Props extends Record<string, any>, LayoutProps extends Record<string, any>[]> = {
    layouts?: {
        [Key in keyof LayoutProps]: {
            component: Component<LayoutProps[Key]>,
        } & ({} extends LayoutProps[Key] ? { props?: LayoutProps[Key] } : { props: LayoutProps[Key] })
    },
    component: Component<Props>,
} & ({} extends Props ? { props?: Props } : { props: Props })

type RouteParams<T extends string> =
    string extends T
    ? Record<string, string>
    : T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof RouteParams<`/${Rest}`>]: string }
    : T extends `${string}:${infer Param}`
    ? { [K in Param]: string }
    : {};
type IncomingMessage = IncomingMessage_ & { url: string };
type MaybePromise<T> = T | Promise<T>