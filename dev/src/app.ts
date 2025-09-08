import XvelteApp from "../../library/index"
import template from './app.html?raw';
import Layout from "./page/layout.svelte";
import IndexPage from "./page/index/page.svelte";
import AboutPage from "./page/about/page.svelte";

const app = new XvelteApp(template);

await app.useFileBaseRouter();

let count = 0;

app.page('/', () => {
    return {
        layouts: [{
            component: Layout
        }],
        component: IndexPage
    }
});
app.page('/about', () => ({
    layouts: [
        {
            component: Layout
        }
    ],
    component: AboutPage
}))

app.page('/testpage', (event) => {
    event.status = 302;
    event.setHeader('location', '/about');
    return {head: '', body: 'hahaha'};
})

app.get('/test', async (event) => {
    const formData = await event.form();
    console.log(formData);
    return null;
});

app.get('/count', () => {
    count++;
    return count.toString();
})

app.hook(XvelteApp.sequence(
    (event) => {
        return event;
    }
));

export default app.handler;

if (import.meta.env.PROD) {
    app.listen(3000, () => console.log('listening on 3000'));
}