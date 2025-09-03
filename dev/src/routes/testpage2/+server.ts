import type { PageHandler } from "../../../../library/src/types";
import Testpage from "./Testpage.svelte";

export const page: PageHandler<'/test/:param'> = (event) => {
    console.log(event.params);
    return {
        component: Testpage,
        props: {
            param: event.params.param
        }   
    }
}