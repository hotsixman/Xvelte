<script lang="ts">
    import type { Component } from "svelte";;

    interface Props{
        component: Component
    }

    let {component}: Props = $props();
</script>

<xvelte-island {component}></xvelte-island>