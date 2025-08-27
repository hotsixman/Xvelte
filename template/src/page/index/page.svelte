<script lang="ts">
    import Island from '@hotsixman/xvelte/components/Island.svelte'
    import Counter from './Counter.svelte?client';
    import './test.scss'

    interface Props{
        currentTimeString: string;
    }

    let {currentTimeString}: Props = $props();
</script>

<h2>
    Welcome to Xvelte!
</h2>
<h3>
    Current Time: {currentTimeString}
</h3>
<Island component={Counter}/>