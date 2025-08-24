/// <reference types="svelte" />
/// <reference types="vite/client" />
/// <reference types="../src/xvelte-server.d.ts"/>

declare module '*.svelte?client' {
    const content: import('svelte').Component;
    export default content;
}