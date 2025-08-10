<script lang="ts">
    import { Island } from "../../../../library/components";
    import Counter from "./Counter.svelte";
    import CounterClient from './Counter.svelte?client';
    import CounterRed from "./CounterRed.svelte";
    import CounterRedClient from "./CounterRed.svelte?client";
</script>

<Counter/>
<Island component={CounterClient}/>
<CounterRed/>
<Island component={CounterRedClient}/>