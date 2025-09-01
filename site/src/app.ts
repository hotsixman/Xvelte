import template from './app.html?raw';
import XvelteApp from "@hotsixman/xvelte";
import Index from './page/Index.svelte';

const app = new XvelteApp(template);

app.page('/', () => ({component: Index}));

export default app.handler;

if(import.meta.env.PROD){
    app.listen(3000, () => console.log('listen on 3000'))
}