import { IncomingMessage, ServerResponse } from "node:http";
import { ViteDevServer } from "vite";

export class XvelteApp {
    handlerMap = new Map<string | RegExp, Record<string, RequestHandler<any>>>();

    get<Route extends string | RegExp>(route: Route, handler: RequestHandler<Route>) {
        
    }

    async handle(req: IncomingMessage, res: ServerResponse){
        res.end('hi');
    }
    async handleDev(req: IncomingMessage, res: ServerResponse, server: ViteDevServer){
        const html = `<html>hi</html>`;
        const transformed = await server.transformIndexHtml(req.url ?? '', html);
        res.end(transformed);
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