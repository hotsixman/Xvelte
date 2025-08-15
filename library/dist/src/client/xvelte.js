import './islandElement.js';
import { fragManager } from './fragManager.js';
import { mount, unmount } from 'svelte';
import { addAnchorClickHandler, addPopstateHandler, goto } from './navigation.js';
addAnchorClickHandler();
addPopstateHandler();
window.__xvelte__ = {
    fragManager,
    mount,
    unmount
};
//# sourceMappingURL=xvelte.js.map