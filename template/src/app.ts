import XvelteApp from "../../library/index"
import template from './app.html?raw';
import Index from './page/index/index.svelte';
import Layout from "./page/index/Layout.svelte";
import Test from "./page/test/test.svelte";

const app = new XvelteApp(template);

app.page('/', () => ({
    layouts: [{
        component: Layout
    }],
    component: Index
}));
app.page('/test', async () => ({
    component: Test,
    props: {
        time: 'asd'
    }
}));
app.get('/get/:id', async(event) => {
    event.setCookie('foo', 'bar', {path: '/'});
    return 'response'
})

export default app;

if(!process.env.isDev){
    app.listen();
}