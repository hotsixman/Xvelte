import { XvelteApp } from "../../library/index"
import template from './app.html?raw';
import Index from './page/index/index.svelte';
import Test from "./page/test/test.svelte";

const app = new XvelteApp(template);

app.page('/', () => ({component: Index}));
app.page('/test', async () => ({
    component: Test,
    props: {
        time: 'asd'
    }
}));

export default app;

if(!process.env.isDev){
    app.listen();
}


