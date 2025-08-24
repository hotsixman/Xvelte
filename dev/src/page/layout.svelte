<script>
    import Slot from '../../../library/src/components/Slot.svelte';
    import Island from '../../../library/src/components/Island.svelte';
    import Input from "./Input.svelte?client";
</script>

<Island component={Input} />
<nav>
    <a href="/">main</a>
    <a href="/about">about</a>
    <a href="//naver.com">네이버</a>
</nav>
<Slot />
