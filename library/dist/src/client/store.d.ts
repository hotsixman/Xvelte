import type { PageData, NavigatingData } from "./types.js";
export declare const navigating: import("svelte/store").Writable<NavigatingData | null>;
export declare const page: import("svelte/store").Writable<PageData>;
export declare function loadPageData(): PageData;
