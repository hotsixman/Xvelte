/// <reference types="svelte" />
/// <reference types="vite/client" />

declare module '*.html'{
    const content: string;
    export default content;
}

declare module '*.svelte?client' {
    const content: import('svelte').Component;
    export default content;
}