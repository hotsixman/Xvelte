<script lang="ts">
    import Island from "../lib/Island.svelte";
    import Test from "./test.svelte";
    import TestClient from "./test.svelte?client";

    
    import Test2Client from "./test2.svelte?client";
</script>

<div>꺼져</div>
<Test />
<Island component={TestClient} />
<Island component={Test2Client} />

<style>
    div {
        color: blue;
    }
</style>
