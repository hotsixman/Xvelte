<script lang="ts">
    interface Props{
        init?: number;
    }
    let {init}: Props = $props();

    let count = $state(init ?? 0);
    
    function increase(){{
        count++;
    }}
</script>

<button onclick={increase}>
    {count}
</button>

<style>
    button{
        padding-inline: 10px;
        padding-block: 5px;
    }
</style>