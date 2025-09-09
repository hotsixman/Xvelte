import template from './app.html?raw';
import XvelteApp from "@hotsixman/xvelte";
import Index from './page/index.svelte';

const app = new XvelteApp(template);

// File-based routing must be enabled
await app.useFileBaseRouter();

app.page('/', () => ({component: Index}));

export default app.handler;

if(import.meta.env.PROD){
    app.listen(3000, () => console.log('listen on 3000'))
}