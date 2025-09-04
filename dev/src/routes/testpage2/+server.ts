import type { PageHandler } from "../../../../library/src/types";
import Layout from "../../page/layout.svelte";
import Testpage from "./Testpage.svelte";

export const page: PageHandler<'/test/:param'> = (event) => {
    console.log(event.params);
    return {
        layouts: [
            {
                component: Layout
            }
        ],
        component: Testpage,
        props: {
            param: event.params.param
        }   
    }
}