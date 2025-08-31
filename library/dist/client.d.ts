export { goto } from './src/client/navigation.js';
export declare const replaceState: (data: Record<string, any>, url?: string | URL | null) => void;
export declare const pushState: (data: Record<string, any>, url?: string | URL | null) => void;
export declare const page: import("svelte/store").Writable<import("./src/types.js").PageData>;
export declare const navigating: import("svelte/store").Writable<import("./src/types.js").NavigatingData | null>;
export declare const globalContext: Map<string, any>;
