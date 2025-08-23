import './islandElement.js';
import { fragManager } from './fragManager.js'
import { mount, unmount } from 'svelte';
import { addAnchorClickHandler, addPopstateHandler, stealHistoryApi } from './navigation.js';
import { navigating, page } from './store.js';

addAnchorClickHandler();
addPopstateHandler();
const { historyApi, originalHistoryApi } = stealHistoryApi();

window.__xvelte__ = {
    fragManager,
    mount,
    unmount,
    context: new Map(),
    navigating,
    page,
    history: {
        replaceState: historyApi.replaceState,
        pushState: historyApi.pushState,
        original: originalHistoryApi
    }
}