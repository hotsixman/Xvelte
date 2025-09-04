import type { Component } from "svelte";
import type { IncomingMessage as IncomingMessage_ } from "node:http";
import type { RequestEvent } from './XvelteApp.js';
import type { ReadStream } from "node:fs";

export type EndpointHandler<Route extends string | RegExp> = (event: RequestEvent<Route>) => MaybePromise<XvelteResponse | null>;
export type AnyEndpointHandler = EndpointHandler<any>;

export type AnyRequestEvent = RequestEvent<any>;

export type PageHandler<Route extends string | RegExp = any, Props extends Record<string, any> = any, LayoutProps extends Record<string, any>[] = any> = (event: RequestEvent<Route>) => MaybePromise<PageHandleData<Props, LayoutProps> | null | HTML>;
export type AnyPageHandler = PageHandler<any, any, any>;
export type PageHandleData<Props extends Record<string, any>, LayoutProps extends Record<string, any>[]> = {
    layouts?: {
        [Key in keyof LayoutProps]: {
            component: Component<LayoutProps[Key]>,
        } & ({} extends LayoutProps[Key] ? { props?: LayoutProps[Key] } : { props: LayoutProps[Key] })
    },
    component: Component<Props>,
} & ({} extends Props ? { props?: Props } : { props: Props });

export type RequestMethod = 'get' | 'post' | 'put' | 'delete' | 'all' | (string & {});

export type XvelteResponse =
    | ArrayBuffer
    | AsyncIterable<Uint8Array>
    | Blob
    | Buffer
    | FormData
    | Iterable<Uint8Array>
    | null
    | ReadStream
    | string
    | URLSearchParams
    | false;

export type RouteParams<T extends string> =
    string extends T
    ? Record<string, string>
    : T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof RouteParams<`/${Rest}`>]: string }
    : T extends `${string}:${infer Param}`
    ? { [K in Param]: string }
    : {};
export type IncomingMessage = IncomingMessage_ & { url: string };
export type MaybePromise<T> = T | Promise<T>;

export type XvelteHook = (event: AnyRequestEvent) => MaybePromise<AnyRequestEvent | XvelteResponse>;

export type HTML = {head: string, body: string};