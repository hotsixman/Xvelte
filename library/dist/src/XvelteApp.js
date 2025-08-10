import { parse as parseHtml } from 'node-html-parser';
import { render } from "svelte/server";
import express from 'express';
import fs from 'node:fs';
import path from "node:path";
import mime from 'mime-types';
import pathToRegexp from "path-to-regexp";
if (typeof (process.env.isDev) === "undefined") {
    process.env.isDev = false;
}
export class XvelteApp {
    template;
    pageHandlerMap = new Map();
    pagePatternHandlerMap = new Map();
    constructor(template) {
        this.template = template;
    }
    page(route, handler) {
        if (typeof (route) === "string") {
            let route_ = route;
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
    async handle(req, res) {
        if (!req.url) {
            res.statusCode = 404;
            return res.end();
        }
        else {
            while (req.url.endsWith('/')) {
                req.url = req.url?.slice(0, -1);
            }
        }
        if (await this.sendXvelteClientFile(req, res))
            return;
        if (await this.sendPage(req, res))
            return;
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
    async sendXvelteClientFile(req, res) {
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
                res.on('error', reject);
            });
            return true;
        }
        return false;
    }
    async sendPage(req, res) {
        let handler = this.pageHandlerMap.get(req.url) ?? null;
        let params = null;
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
        if (!handler)
            return false;
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
            `;
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
//# sourceMappingURL=XvelteApp.js.map