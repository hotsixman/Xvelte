<script lang="ts">
    import Island from '@hotsixman/xvelte/components/Island.svelte';
    import Counter from './Counter.svelte?client';

    interface Props{
        currentTimeStamp: string;
    }

    let {currentTimeStamp}: Props = $props();
</script>

지금 시각은 {currentTimeStamp}입니다.
<Island component={Counter}/>