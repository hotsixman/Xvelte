import './islandElement';
import {fragManager} from './fragManager'
import { mount, unmount } from 'svelte';
import { goto } from './navigation';

document.addEventListener('click', (event) => {
    if(event.target && event.target instanceof HTMLAnchorElement && event.target.origin === location.origin && (!event.target.target || event.target.target === "_self")){
        event.preventDefault();
        goto(event.target.href);
    }
})

window.__xvelte__ = {
    fragManager,
    mount,
    unmount
}