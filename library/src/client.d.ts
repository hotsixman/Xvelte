import type { ComponentType, SvelteComponent, Component, MountOptions } from 'svelte'
import type { xvelteFragManager } from './client/xvelteFragManager'

declare global {
    interface Window {
        __xvelte__: {
            mount: <Props extends Record<string, any>, Exports extends Record<string, any>>(component: ComponentType<SvelteComponent<Props>> | Component<Props, Exports, any>, options: MountOptions<Props>) => Exports,
            unmount: (component: Record<string, any>, options?: {outro?: boolean;}) => Promise<void>,
            fragManager: XvelteFragManager
        }
    }
}

export { }