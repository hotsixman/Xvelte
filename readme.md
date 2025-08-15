# Xvelte
Xvelte is an SSR framework that uses [Svelte](https://github.com/sveltejs/svelte). It allows for partial client rendering (Islands) and can be easily integrated with [Node.js http](https://nodejs.org/api/http.html), [Express](https://expressjs.com), and more.

> [!IMPORTANT]
> It is still under development, so there may be bugs and convoluted code.

## Installation
> [!NOTE]
> Please refer to the `template` folder.

### 1. Install the library
Enter the following code into your terminal to install the library.
`npm i @hotsixman/xvelte`

### 2. Project Setup
1.  Create `src/app.ts` or `src/app.js`. This is the main file for your project.
2.  Create `vite.config.ts` and write it as follows:
    ```ts
    import { defineConfig, Plugin } from "vite";
    import xveltePlugin from "@hotsixman/xvelte/vite"

    export default defineConfig({
        plugins: [xveltePlugin() as Plugin]
    })
    ```
3.  Create `src/env.d.ts` and write it as follows:
    ```ts
    /// <reference types="@hotsixman/xvelte/dts/client.d.ts" />
    /// <reference types="@hotsixman/xvelte/dts/server.d.ts" />
    ```
4.  Create `tsconfig.json` and write it as follows:
    ```json
    {
        "compilerOptions": {
            "allowJs": true,
            "checkJs": false,
            "esModuleInterop": true,
            "forceConsistentCasingInFileNames": true,
            "resolveJsonModule": true,
            "skipLibCheck": true,
            "sourceMap": true,
            "strict": true,
            "moduleResolution": "bundler",
            "module": "esnext",
            "target": "esnext",
            "isolatedModules": true,
            "moduleDetection": "force",
            "verbatimModuleSyntax": true
        },
        "include": [
            "src/**/*.js",
            "src/**/*.ts",
            "src/**/*.d.ts",
            "src/**/*.svelte"
        ]
    }
    ```

### 3. Configuring `src/app.js`/`src/app.ts`
In `src/app.js` or `src/app.ts` (hereafter, the app file), you must export a `XvelteApp` instance as the `default`. Therefore, write it as follows:
```ts
import XvelteApp from "@hotsixman/xvelte"

const app = new XvelteApp(template);

export default app;
```

Here, the `template` variable is the basic HTML template your app will use. You can import it with something like `import template from './app.html?raw'`, or load it using `fs.readFile`, etc.

If you plan to run the server by executing the app file in production, add the following code to the bottom of the app file:
```ts
if(!process.env.isDev){
    app.listen(3000, () => {console.log(`server is listening on port 3000`)}); // The port can be changed.
}
```

### 4. Routing
XvelteApp can handle requests by registering handler functions.
```ts
...
// Add a page
app.page('/', (event) => {
    // Write your server logic here.
    console.log("Request received at '/'");

    const currentTimeString = new Date().toLocaleTimeString();

    return {
        layouts: [
            {
                component: Layout // Svelte component
            }
        ],
        component: Page, // Svelte component
        props:{
            currentTimeString
        } // Props to be used by this component
    }
});

// Add an endpoint
// You can use dynamic routing in a way similar to Express.
// Not only get, but also post, put, and delete are available. Using 'all' allows the handler function to be used for all request methods.
app.get('/test/:param', (event) => { 
    console.log(`Request received at '${event.url.pathname}'`);

    const name = event.getCookie('name');
    event.setCookie('age', '20');

    event.setHeader('content-type', 'text/plain; charset=utf-8');

    return `Your name is ${name}`;
})
```

When using layouts, common layouts are not recreated and are reused when navigating between pages.

## Layouts
In SvelteKit, you use `<slot/>` or `{@render children?.()}` in a layout component to indicate where a child layout or page component should be placed. In Xvelte, you use the `<Slot/>` component or the `<xvelte-slot></xvelte-slot>` tag for this purpose. The `Slot` component can be imported from `@hotsixman/xvelte/components/Slot.svelte`.

## Partial Client Rendering
In Xvelte, you can easily use partial client rendering.
```svelte
<script>
    import Island from '@hotsixman/xvelte/components/Island.svelte';
    // To use client rendering, just append `?client` to the import path.
    import Counter from './Counter.svelte?client';
</script>

<Island component={Counter}/>
<!--or-->
<xvelte-island component={Counter}></xvelte-island>
```

When you append `?client` while importing a component, it changes the import from the component itself to a path that allows the client to load that component. In other words, in the code above, `Counter` is a string. When the browser sends a request to this path, it can import the component. By passing this as a property to the `Island` component or the `xvelte-island` element, the browser will import and then render the component.