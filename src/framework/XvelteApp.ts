import type { IncomingMessage, ServerResponse } from "node:http";
import type { ViteDevServer } from "vite";
import { parse as parseHtml } from 'node-html-parser'
import { render } from "svelte/server";
import type { Component } from "svelte";
import express from 'express';
import fs from 'node:fs';
import path from "node:path";

export class XvelteApp {
    private template: string;
    Page: Component;

    constructor(template: string, Page: Component) {
        this.template = template;
        this.Page = Page;
    }

    get<Route extends string | RegExp>(route: Route, handler: RequestHandler<Route>) {

    }

    async handle(req: IncomingMessage, res: ServerResponse) {
        if(req.url?.startsWith('/__client__')){
            res.setHeader('content-type', 'application/javascript');
            const readStream = fs.createReadStream(path.join(import.meta.dirname, req.url));
            return readStream.pipe(res);
        }

        const dom = parseHtml(this.template);
        const renderedComponent = render(this.Page);

        const xvelteHead = dom.querySelector('xvelte-head');
        if (xvelteHead) {
            xvelteHead.replaceWith(parseHtml(renderedComponent.head), parseHtml('<script type="module" src="/__client__/svelte.js"></script>'));
        }
        const xvelteBody = dom.querySelector('xvelte-body');
        if (xvelteBody) {
            xvelteBody.replaceWith(parseHtml(renderedComponent.body));
        }

        res.setHeader('content-type', 'text/html');
        res.end(dom.innerHTML);
    }
    async handleDev(req: IncomingMessage, res: ServerResponse, server: ViteDevServer) {
        const dom = parseHtml(this.template);
        const renderedComponent = render(this.Page);

        const xvelteHead = dom.querySelector('xvelte-head');
        if (xvelteHead) {
            xvelteHead.replaceWith(parseHtml(renderedComponent.head));
        }
        const xvelteBody = dom.querySelector('xvelte-body');
        if (xvelteBody) {
            xvelteBody.replaceWith(parseHtml(renderedComponent.body));
        }

        const transformed = await server.transformIndexHtml(req.url ?? '', dom.innerHTML);

        res.setHeader('content-type', 'text/html');
        res.end(transformed);
    }
    listen(){
        const expressApp = express();
        expressApp.use((req, res) => {
            this.handle(req, res);
        });
        expressApp.listen(3000);
    }
}

type RequestEvent<Route extends string | RegExp> = {
    params: Route extends string ? RouteParams<Route> : Record<string, string>;
}
type RequestHandler<Route extends string | RegExp> = (event: RequestEvent<Route>) => MaybePromise<Response | null>;

type RouteParams<T extends string> =
    string extends T
    ? Record<string, string>
    : T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof RouteParams<`/${Rest}`>]: string }
    : T extends `${string}:${infer Param}`
    ? { [K in Param]: string }
    : {};

type MaybePromise<T> = T | Promise<T>