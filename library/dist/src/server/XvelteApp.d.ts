import { type ServerResponse } from "node:http";
import cookie from 'cookie';
import type { PageHandler, IncomingMessage, EndpointHandler, RouteParams, AnyRequestEvent, XvelteHook } from "./types.js";
export declare class XvelteApp {
    private template;
    private pageHandlerMap;
    private pagePatternHandlerMap;
    private endpointHandlerManager;
    private componentIdMap;
    private staticPath?;
    private hookFunction?;
    constructor(template: string);
    /**
     * 페이지 핸들러 추가
     * @param route
     * @param handler
     */
    page<Route extends string | RegExp, Props extends Record<string, any>, LayoutProps extends Record<string, any>[]>(route: Route, handler: PageHandler<Route, Props, LayoutProps>): void;
    /** Get 엔드포인트 핸들러 추가 */
    get<Route extends string | RegExp>(route: Route, handler: EndpointHandler<Route>): void;
    /** Post 엔드포인트 핸들러 추가 */
    post<Route extends string | RegExp>(route: Route, handler: EndpointHandler<Route>): void;
    /** Put 엔드포인트 핸들러 추가 */
    put<Route extends string | RegExp>(route: Route, handler: EndpointHandler<Route>): void;
    /** Delete 엔드포인트 핸들러 추가 */
    delete<Route extends string | RegExp>(route: Route, handler: EndpointHandler<Route>): void;
    /** 엔드포인트 핸들러 추가 */
    all<Route extends string | RegExp>(route: Route, handler: EndpointHandler<Route>): void;
    /**
     * static 파일 경로 설정
     * @param pathname
     */
    static(pathname: string): void;
    /**
     * hook 설정
     */
    hook(xvelteHook: XvelteHook): void;
    get handler(): (req: IncomingMessage, res: ServerResponse) => Promise<boolean | ServerResponse<import("http").IncomingMessage> | undefined>;
    /**
     * HTTP 요청 핸들러. Node http 모듈, Express 등에서 사용 가능.
     * @param req
     * @param res
     * @returns
     */
    private handle;
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
    private getEndpointHandler;
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
    function getResponseHeader(event: AnyRequestEvent): Record<string, string | number | string[]>;
    function getResponseCookie(event: AnyRequestEvent): Record<string, string>;
}
