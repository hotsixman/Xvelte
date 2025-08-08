<script lang="ts">
    import type { Component } from "svelte";;

    interface Props{
        component: Component
    }

    let {component}: Props = $props();
    const randomId = 'a' + Math.floor(Math.random() * 1000000).toString(16);
</script>

<div id="test"></div>

<svelte:element this={"script"} type="module">
    import Component from '{component}';
    window.__mount__(Component, {`{
        target: document.querySelector("#${randomId}")
    }`})
</svelte:element>

<div id={randomId}></div>