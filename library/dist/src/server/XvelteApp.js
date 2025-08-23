import { createServer } from "node:http";
import { HTMLElement, parse as parseHtml } from 'node-html-parser';
import { render } from "svelte/server";
import fs, { ReadStream } from 'node:fs';
import path from "node:path";
import mime from 'mime-types';
import pathToRegexp from "path-to-regexp";
import cookie from 'cookie';
import { hash } from "node:crypto";
import * as devalue from 'devalue';
if (typeof (process.env.isDev) === "undefined") {
    process.env.isDev = false;
}
export class XvelteApp {
    template;
    pageHandlerMap = new Map();
    pagePatternHandlerMap = new Map();
    requestHandlerMap = new Map();
    requestPatternHandlerMap = new Map();
    componentIdMap = new ComponentIdMap();
    constructor(template) {
        this.template = template;
    }
    page(route, handler) {
        if (typeof (route) === "string") {
            const route_ = pathify(route);
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
    get(route, handler) {
        this.registerRequestHandler(route, handler, 'get');
    }
    post(route, handler) {
        this.registerRequestHandler(route, handler, 'post');
    }
    put(route, handler) {
        this.registerRequestHandler(route, handler, 'put');
    }
    delete(route, handler) {
        this.registerRequestHandler(route, handler, 'delete');
    }
    all(route, handler) {
        this.registerRequestHandler(route, handler, 'all');
    }
    /**
     * HTTP 요청 핸들러. Node http 모듈, Express 등에서 사용 가능.
     * @param req
     * @param res
     * @returns
     */
    async handle(req, res) {
        try {
            const event = new RequestEvent(req, res);
            if (await this.sendResponse(event, await this.getXvelteClientFileResponse(event), res))
                return;
            if (await this.sendResponse(event, await this.getNavigationResponse(event), res))
                return;
            const { handler, params, isPageHandler } = this.getHandler(event.url.pathname);
            RequestEvent.setParams(event, params);
            if (handler) {
                let response;
                if (isPageHandler) {
                    response = await this.getPageResponse(event, handler);
                }
                else {
                    response = await handler(event);
                }
                if (await this.sendResponse(event, response, res))
                    return;
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
    listen(port, callback) {
        const app = createServer((req, res) => {
            this.handle(req, res);
        });
        app.listen(port, callback);
    }
    /**
     * 특정 경로에 해당하는 핸들러, url 파라미터, 페이지 핸들러 여부를 반환
     * @param path
     * @returns
     */
    getHandler(path) {
        let handler = null;
        let params = {};
        let c = this.getPageHandler(path);
        handler = c.handler;
        params = c.params;
        if (handler) {
            return { handler, params, isPageHandler: true };
        }
        c = this.getRequestHandler(path);
        handler = c.handler;
        params = c.params;
        if (handler) {
            return { handler, params, isPageHandler: false };
        }
        return { handler, params, isPageHandler: false };
    }
    /**
     * 페이지 핸들러, url 파라미터를 반환
     * @param path
     * @returns
     */
    getPageHandler(path) {
        let handler = null;
        let params = {};
        handler = this.pageHandlerMap.get(path) ?? null;
        if (handler)
            return { handler, params };
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
    getRequestHandler(path) {
        let handler = null;
        let params = {};
        handler = this.requestHandlerMap.get(path) ?? null;
        if (handler)
            return { handler, params };
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
        return { handler, params };
    }
    /**
     * `XvelteResponse`를 전송합니다. 전송이 완료되면 true, 그렇지 않으면 false를 반환합니다.
     * false를 반환할 경우 handle 메소드에서 다음 단계로 넘어갑니다.
     */
    async sendResponse(event_, response, res) {
        if (response === false) {
            return false;
        }
        const event = event_;
        res.writeHead(event.responseStatus, {
            ...event.responseHeader,
            'set-cookie': Object.values(event.responseCookie)
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
        for await (const chunk of response) {
            res.write(Buffer.from(chunk));
        }
        res.end();
        return true;
    }
    /**
    * 클라이언트 스크립트와 클라이언트 컴포넌트 파일 전송
    */
    async getXvelteClientFileResponse(event) {
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
    renderPage(data) {
        const context = new Map();
        const layouts = (data.layouts ?? []).map((l) => {
            const id = this.componentIdMap.register(l.component);
            const rendered = render(l.component, {
                props: l.props,
                context
            });
            const dom = parseHtml(rendered.body, { comment: true });
            dom.querySelectorAll('xvelte-island').forEach((island) => {
                island.setAttribute('data-frag-id', id);
            });
            return {
                id,
                head: rendered.head,
                body: dom.innerHTML
            };
        });
        const id = this.componentIdMap.register(data.component);
        const rendered = render(data.component, {
            props: data.props,
            context
        });
        const dom = parseHtml(rendered.body, { comment: true });
        dom.querySelectorAll('xvelte-island').forEach((island) => {
            island.setAttribute('data-frag-id', id);
        });
        const page = {
            id: this.componentIdMap.register(data.component),
            head: rendered.head,
            body: dom.innerHTML
        };
        return { layouts, page };
    }
    /**
     * 페이지 전송(html)
     */
    async getPageResponse(event, handler) {
        const pageHandleData = await handler(event);
        if (!pageHandleData) {
            return null;
        }
        const renderingData = this.renderPage(pageHandleData);
        const dom = parseHtml(this.template, { comment: true });
        const xvelteHead = dom.querySelector('xvelte-head');
        if (xvelteHead) {
            const newXvelteHead = parseHtml('<!--xvelte-head-->', { comment: true });
            if (process.env.isDev) {
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
            `;
            newXvelteHead.innerHTML += '<!--/xvelte-head-->';
            xvelteHead.replaceWith(newXvelteHead);
        }
        const xvelteBody = dom.querySelector('xvelte-body');
        if (xvelteBody) {
            if (renderingData.layouts.length > 0) {
                const topLayoutFrag = parseHtml(`<xvelte-frag data-frag-id="${renderingData.layouts[0].id}">${renderingData.layouts[0].body}</xvelte-frag>`).children[0];
                let frag = topLayoutFrag;
                for (let i = 1; i < renderingData.layouts.length; i++) {
                    const layout = renderingData.layouts[i];
                    const slot = frag.getElementsByTagName('xvelte-slot')[0];
                    if (slot) {
                        frag = parseHtml(`<xvelte-frag data-frag-id="${layout.id}">${layout.body}</xvelte-frag>`).children[0];
                        slot.replaceWith(frag);
                    }
                }
                const slot = frag.getElementsByTagName('xvelte-slot')[0];
                if (slot) {
                    frag = parseHtml(`<xvelte-frag data-frag-id="${renderingData.page.id}">${renderingData.page.body}</xvelte-frag>`).children[0];
                    slot.replaceWith(frag);
                }
                ;
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
    async getNavigationResponse(event) {
        if (event.url.pathname !== "/__xvelte__/navigation")
            return false;
        const to_ = event.url.searchParams.get('to');
        if (!to_)
            return false;
        const baseUrl = event.requestHeaders.origin ? event.requestHeaders.origin :
            event.requestHeaders.host ? `http://${event.requestHeaders.host}` : 'http://localhost';
        const to = new URL(to_, baseUrl);
        const { handler, params } = this.getPageHandler(to.pathname);
        if (!handler)
            return false;
        event.url = to;
        RequestEvent.setParams(event, params);
        const renderingData = await handler(event);
        if (!renderingData)
            return null;
        const renderedData = this.renderPage(renderingData);
        return JSON.stringify(renderedData);
    }
    registerRequestHandler(route, handler, method) {
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
        function generateNewHandler(formerHandler) {
            if (method === "all") {
                return async (event) => {
                    if (formerHandler) {
                        const r = await formerHandler(event);
                        if (r !== false)
                            return r;
                    }
                    return await handler(event);
                };
            }
            else {
                return async (event) => {
                    if (event.method === method) {
                        return await handler(event);
                    }
                    if (formerHandler) {
                        return await formerHandler(event);
                    }
                    return false;
                };
            }
        }
    }
}
(function (XvelteApp) {
    XvelteApp.css = `xvelte-body, xvelte-island, xvelte-frag{display:contents;}`;
})(XvelteApp || (XvelteApp = {}));
class ComponentIdMap {
    map = new Map();
    reverseMap = new Map();
    register(component) {
        if (this.map.has(component)) {
            return this.map.get(component);
        }
        const id = hash('md5', component.toString(), 'hex');
        this.map.set(component, id);
        this.reverseMap.set(id, component);
        return id;
    }
    getId(component) {
        return this.map.get(component);
    }
    getComponent(id) {
        return this.reverseMap.get(id);
    }
}
export class RequestEvent {
    url;
    //@ts-expect-error
    params;
    requestHeaders;
    locals = {};
    method;
    request;
    response;
    requestCookie;
    requestData;
    responseHeader = {};
    responseStatus = 200;
    responseCookie = {};
    constructor(req, res) {
        const baseUrl = req.headers.origin ? req.headers.origin :
            req.headers.host ? `http://${req.headers.host}` : 'http://localhost';
        const url = new URL(req.url ?? '', baseUrl);
        this.url = url;
        this.method = (req.method ?? 'get').toLowerCase();
        this.request = req;
        this.response = res;
        this.requestHeaders = req.headers;
        this.requestData = new Promise((resolve, reject) => {
            const body = [];
            this.request.on('data', (chunk) => {
                body.push(chunk);
            });
            this.request.on('end', () => {
                resolve(Buffer.concat(body));
            });
            this.request.on('error', reject);
        });
        this.requestCookie = cookie.parse(this.requestHeaders.cookie ?? '');
    }
    setHeader(key, value) {
        this.responseHeader[key] = value;
    }
    setStatus(status) {
        this.responseStatus = status;
    }
    getStatus() {
        return this.responseStatus;
    }
    getCookie(key) {
        return this.requestCookie[key] ?? null;
    }
    setCookie(key, value, option) {
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
        return new Blob([await this.requestData]);
    }
    async buffer() {
        return await this.requestData;
    }
}
(function (RequestEvent) {
    function setParams(event, params) {
        event.params = params;
    }
    RequestEvent.setParams = setParams;
})(RequestEvent || (RequestEvent = {}));
function pathify(path_) {
    return new URL(path_, 'http://void').pathname;
}
//# sourceMappingURL=XvelteApp.js.map