import type { ComponentType, SvelteComponent, Component, MountOptions } from 'svelte'
import type { FragManager } from '../src/client/fragManager.js';

declare global {
    interface Window {
        __xvelte__: {
            mount: <Props extends Record<string, any>, Exports extends Record<string, any>>(component: ComponentType<SvelteComponent<Props>> | Component<Props, Exports, any>, options: MountOptions<Props>) => Exports,
            unmount: (component: Record<string, any>, options?: { outro?: boolean; }) => Promise<void>,
            fragManager: FragManager
        }
    }
}

export { }