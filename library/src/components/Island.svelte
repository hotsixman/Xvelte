<script lang="ts">
    import type { Component, Snippet } from "svelte";
    import * as devalue from "devalue";

    interface Props {
        component: Component;
        props?: Record<string, any>;
        on?: "visible" | "click" | "mouseenter";
        children?: Snippet;
    }

    let { component, props, children, on }: Props = $props();
</script>

<xvelte-island {component} props={devalue.stringify(props)} ev={on}>
    {@render children?.()}
</xvelte-island>
