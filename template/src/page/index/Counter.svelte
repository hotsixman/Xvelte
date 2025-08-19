<script lang="ts">
    import { getContext } from "svelte";

    interface Props {
        init?: number;
    }

    let { init }: Props = $props();

    let count = $state(init ?? 0);
</script>

<button onclick={() => count++}>{count}</button>

<style>
    button {
        color: purple;
    }
</style>
