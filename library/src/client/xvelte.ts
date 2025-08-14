import './islandElement';
import {fragManager} from './fragManager'
import { mount, unmount } from 'svelte';

window.__xvelte__ = {
    fragManager,
    mount,
    unmount
}