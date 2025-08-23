<script lang="ts">
    let value = $state("");
    import { goto, page, navigating } from "../../../library/client";

    $effect(() => {
        console.log($page.state);
        console.log($navigating);
    })
</script>

value: {value}
<input type="text" bind:value />
<button onclick={() => goto('/about', {state: {foo: 'bar'}})}>
    이동
</button>