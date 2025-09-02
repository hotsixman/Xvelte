# Xvelte
<div style="text-align:center;"><img src="./docs/img/logo.svg"></div>

```ts
import XvelteApp from '@hotsixman/xvelte';
import template from './app.html?raw';
import MainLayout from './layout/MainLayout.svelte';
import Index from './page/Index.svelte';
import About from './page/About.svelte';

const app = new XvelteApp(template);

app.page('/', () => {
    return {
        layouts: [{
            component: MainLayout
        }],
        component: Index
    }
});
app.page('/about', () => {
    return {
        layouts: [{
            component: MainLayout
        }],
        component: About
    }
});

export default app.handler;

if(import.meta.env.PROD){
    app.listen(3000, () => console.log('listening on 3000'));
}
```

Xvelte is a modern web framework based on Svelte, offering server-side rendering (SSR) with optional client-side hydration. It aims to provide a fast-by-default experience by hydrating only the interactive parts of a page, a concept often referred to as 'islands' or partial hydration. It uses Vite to provide a fast and modern development environment and offers a smooth user experience like a single-page application through client-side navigation. It can be easily integrated with Node.js http, Express, and more.

# Project Setup
`npx @hotsixman/xvelte {project path}`

The main file is `src/app.ts`.

# Documentation
Please refer to [here](./docs/en/10.%20Introduction.md).