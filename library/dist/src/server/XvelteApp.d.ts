import { type ServerResponse } from "node:http";
import cookie from 'cookie';
import type { PageHandler, IncomingMessage, RequestHandler, RouteParams, AnyRequestEvent } from "./types.js";
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
    /**
     * HTTP 요청 핸들러. Node http 모듈, Express 등에서 사용 가능.
     * @param req
     * @param res
     * @returns
     */
    handle(req: IncomingMessage, res: ServerResponse): Promise<ServerResponse<import("http").IncomingMessage> | undefined>;
    listen(port: number, callback?: (error?: Error) => any): void;
    /**
     * 특정 경로에 해당하는 핸들러, url 파라미터, 페이지 핸들러 여부를 반환
     * @param path
     * @returns
     */
    private getHandler;
    /**
     * 페이지 핸들러, url 파라미터를 반환
     * @param path
     * @returns
     */
    private getPageHandler;
    /**
     * 요청 핸들러, url 파리미터를 반환
     * @param path
     * @returns
     */
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
    /**
     * `/__xvelte__/navigation`으로 요청을 받았을 때 렌더링 데이터 반환
     * @param event
     * @returns
     */
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
    status: number;
    cookie: {
        get: (key: string) => string | null;
        set: (key: string, value: string, option: cookie.SerializeOptions & {
            path: string;
        }) => void;
        delete: (key: string, option: {
            path: string;
        }) => void;
    };
    request: IncomingMessage;
    response: ServerResponse<import("http").IncomingMessage>;
    private requestCookie;
    private requestData;
    private responseHeader;
    private responseCookie;
    constructor(req: IncomingMessage, res: ServerResponse);
    setHeader(key: string, value: string | number | string[]): void;
    getClientAddress(): string;
    text(): Promise<string>;
    json(): Promise<any>;
    blob(): Promise<Blob>;
    buffer(): Promise<Buffer<ArrayBuffer>>;
    form(): Promise<{
        fields: Record<string, string>;
        files: Record<string, {
            filename: string;
            mimeType: string;
            buffer: Buffer;
        }>;
    }>;
}
export declare namespace RequestEvent {
    function setParams(event: AnyRequestEvent, params: Record<string, string>): void;
}
