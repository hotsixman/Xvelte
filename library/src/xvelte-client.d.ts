import type { ComponentType, SvelteComponent, Component, MountOptions } from 'svelte'
import type { FragManager } from './client/fragManager.js'
import type { Writable } from 'svelte/store';
import type { NavigatingData, PageData } from './types.ts';

declare global {
    interface Window {
        __xvelte__: {
            mount: <Props extends Record<string, any>, Exports extends Record<string, any>>(component: ComponentType<SvelteComponent<Props>> | Component<Props, Exports, any>, options: MountOptions<Props>) => Exports;
            unmount: (component: Record<string, any>, options?: { outro?: boolean; }) => Promise<void>;
            fragManager: FragManager;
            context: Map<string, any>;
            navigating: Writable<null | NavigatingData>;
            page: Writable<PageData>;
            history: {
                replaceState: (data: Record<string, any>, url?: string | URL | null) => void;
                pushState: (data: Record<string, any>, url?: string | URL | null) => void;
                original: {
                    replaceState: (data: any, unused: string, url?: string | URL | null) => void;
                    pushState: (data: any, unused: string, url?: string | URL | null) => void;
                }
            }
        }
    }
}

export { }