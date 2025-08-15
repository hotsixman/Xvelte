/// <reference types="svelte" />
/// <reference types="vite/client" />

declare module '*.svelte?client' {
    const content: import('svelte').Component;
    export default content;
}

declare namespace NodeJS {
    interface ProcessEnv {
        isDev: boolean;
    }
}