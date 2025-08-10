import type { IncomingMessage as IncomingMessage_, ServerResponse } from "node:http";
import { parse as parseHtml } from 'node-html-parser'
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

    private async sendXvelteClientFile(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
        if (req.url?.startsWith('/__client__')) {
            const filePath = process.env.isDev ? path.join(process.cwd(), '.xvelte', req.url) : path.join(import.meta.dirname, req.url);
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

    private async sendPage(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
        let handler: PageHandler<any, any, any> | null = this.pageHandlerMap.get(req.url) ?? null;
        let params: Record<string, any> | null = null;
        if (!handler) {
            for (const [pattern, handler_] of this.pagePatternHandlerMap.entries()) {
                if (typeof (pattern) === "function") {
                    const matched = pattern(req.url);
                    if (matched) {
                        params = matched.params;
                        handler = handler_;
                    }
                }
                else {
                    if (pattern.test(req.url)) {
                        handler = handler_;
                    }
                }
            }
        }

        if (!handler) return false;

        const pageHandleData = await handler({
            params: params ?? undefined
        });

        if (!pageHandleData) {
            return res.writableEnded;
        }

        const dom = parseHtml(this.template);
        const renderedComponent = render(pageHandleData.component, { props: pageHandleData.props });

        const xvelteHead = dom.querySelector('xvelte-head');
        if (xvelteHead) {
            if (process.env.isDev) {
                xvelteHead.innerHTML += '<script type="module" src="/@vite/client"></script>';
            }
            xvelteHead.innerHTML = `
            <script type="module" src="/@vite/client"></script>
            ${renderedComponent.head}
            <script type="module" src="/__client__/svelte.js"></script>
            `
        }
        const xvelteBody = dom.querySelector('xvelte-body');
        if (xvelteBody) {
            xvelteBody.replaceWith(parseHtml(renderedComponent.body));
        }

        res.setHeader('content-type', 'text/html');
        res.end(dom.innerHTML);
        return true;
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
        } & ({} extends LayoutProps[Key] ? {props?: LayoutProps[Key]} : {props: LayoutProps[Key]})
    },
    component: Component<Props>,
} & ({} extends Props ? {props?: Props} : {props: Props})

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