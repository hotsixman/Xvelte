import XvelteApp from "../../library/index"
import template from './app.html?raw';
import Layout from "./page/layout.svelte";
import IndexPage from "./page/index/page.svelte";
import AboutPage from "./page/about/page.svelte";
import path from "node:path";

const app = new XvelteApp(template);

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

app.get('/test', async (event) => {
    const formData = await event.form();
    console.log(formData);
    return null;
});

app.static(path.resolve(import.meta.dirname, '..', 'static'));

app.hook((event) => {
    console.log('pathname: ', event.url.pathname);
    return event;
})

export default app.handler;

if (process.env.prod) {
    app.listen(3000, () => console.log('listening on 3000'));
}