import XvelteApp from "@hotsixman/xvelte"
import template from './app.html?raw';
import MainLayout from "./layout/MainLayout.svelte";
import IndexPage from "./page/index/Page.svelte";
import AboutPage from "./page/about/Page.svelte";

const app = new XvelteApp(template);

app.page('/', () => {
    return {
        layouts:[{
            component: MainLayout
        }],
        component: IndexPage,
        props:{
            currentTimeString: new Date().toLocaleTimeString()
        }
    }
});

app.page('/about', () => {
    return {
        layouts:[{
            component: MainLayout
        }],
        component: AboutPage
    }
})

export default app;

if (!process.env.isDev) {
    app.listen(3000, () => console.log('listening on 3000'));
}