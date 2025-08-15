import type { ServerResponse } from "node:http";
import cookie from 'cookie';
import type { PageHandler, IncomingMessage, RequestHandler, RouteParams } from "./types.js";
export declare class XvelteApp {
    private template;
    private pageHandlerMap;
    private pagePatternHandlerMap;
    private requestHandlerMap;
    private requestPatternHandlerMap;
    private componentIdMap;
    constructor(template: string);
    page<Route extends string | RegExp, Props extends Record<string, any>, LayoutProps extends Record<string, any>[]>(route: Route, handler: PageHandler<Route, Props, LayoutProps>): void;
    get<Route extends string | RegExp>(route: Route, handler: RequestHandler<Route>): void;
    post<Route extends string | RegExp>(route: Route, handler: RequestHandler<Route>): void;
    put<Route extends string | RegExp>(route: Route, handler: RequestHandler<Route>): void;
    delete<Route extends string | RegExp>(route: Route, handler: RequestHandler<Route>): void;
    all<Route extends string | RegExp>(route: Route, handler: RequestHandler<Route>): void;
    handle(req: IncomingMessage, res: ServerResponse): Promise<ServerResponse<import("http").IncomingMessage> | undefined>;
    listen(): void;
    private getHandler;
    private getPageHandler;
    private getRequestHandler;
    /**
     * `XvelteResponse`를 전송합니다. 전송이 완료되면 true, 그렇지 않으면 false를 반환합니다.
     * false를 반환할 경우 handle 메소드에서 다음 단계로 넘어갑니다.
     */
    private sendResponse;
    /**
    * 클라이언트 스크립트와 클라이언트 컴포넌트 파일 전송
    */
    private getXvelteClientFileResponse;
    /**
     * 페이지 핸들러로 렌더링
     */
    private renderPage;
    /**
     * 페이지 전송(html)
     */
    private getPageResponse;
    private getNavigationResponse;
    private registerRequestHandler;
}
export declare namespace XvelteApp {
    const css = "xvelte-body, xvelte-island, xvelte-frag{display:contents;}";
}
export declare class RequestEvent<Route extends string | RegExp> {
    url: URL;
    params: Route extends string ? RouteParams<Route> : Record<string, string>;
    requestHeaders: Record<string, string>;
    locals: Record<string, any>;
    method: string;
    private request;
    private requestCookie;
    private requestData;
    private responseHeader;
    private responseStatus;
    private responseCookie;
    constructor(req: IncomingMessage);
    setHeader(key: string, value: string | number | string[]): void;
    setStatus(status: number): void;
    getStatus(): number;
    getCookie(key: string): string | null;
    setCookie(key: string, value: string, option: cookie.SerializeOptions & {
        path: string;
    }): void;
    getClientAddress(): string;
    text(): Promise<string>;
    json(): Promise<any>;
    blob(): Promise<Blob>;
    buffer(): Promise<Buffer<ArrayBuffer>>;
}
