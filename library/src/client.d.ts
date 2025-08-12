import { ComponentType, SvelteComponent, Component, MountOptions } from 'svelte'

declare global {
    interface Window {
        __mount__: <Props extends Record<string, any>, Exports extends Record<string, any>>(component: ComponentType<SvelteComponent<Props>> | Component<Props, Exports, any>, options: MountOptions<Props>) => Exports
    }
}

export {}