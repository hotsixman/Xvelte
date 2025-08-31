<script lang="ts">
    interface Props {
        init?: number;
    }

    let { init }: Props = $props();

    let count = $state(init ?? 0);
</script>

<button onclick={() => count++}>{count}</button>
<div>
    뭐욧
</div>

<style>
    div {
        color: purple;
    }
</style>
