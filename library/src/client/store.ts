import { writable } from "svelte/store";
import type { PageData, NavigatingData } from "./types.js";

export const navigating = writable<NavigatingData | null>(null);
export const page = writable<PageData>(loadPageData());

export function loadPageData(): PageData{
    return {
        url: new URL(window.location.href),
        state: history.state?.pageState ?? {}
    }
}