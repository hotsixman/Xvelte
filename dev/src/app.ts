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

app.hook(XvelteApp.sequence(
    (event) => {
        return event;
    }
));

export default app.handler;

if (import.meta.env.PROD) {
    app.listen(3000, () => console.log('listening on 3000'));
}