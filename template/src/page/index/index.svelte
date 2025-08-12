<script lang="ts">
    import { Island } from "../../../../library/components";
    import CounterClient from './Counter.svelte?client';
</script>

<Island component={CounterClient}/>
<div>
    테스트
</div>

<style>
    div{
        color: red;
    }
</style>