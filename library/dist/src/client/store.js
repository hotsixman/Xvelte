import { writable } from "svelte/store";
export const navigating = writable(null);
export const page = writable(loadPageData());
export function loadPageData() {
    return {
        url: new URL(window.location.href),
        state: history.state?.pageState ?? {}
    };
}
//# sourceMappingURL=store.js.map