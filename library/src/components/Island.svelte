<script lang="ts">
    import type { Component } from "svelte";
    import * as devalue from 'devalue';

    interface Props{
        component: Component
        props?: Record<string, any>
    }

    let {component, props}: Props = $props();
</script>

<xvelte-island {component} props={devalue.stringify(props)}></xvelte-island>