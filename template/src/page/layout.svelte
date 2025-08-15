<script>
    import Island from "@hotsixman/xvelte/components/Island.svelte";
    import Slot from "@hotsixman/xvelte/components/Slot.svelte";
    import Input from "./Input.svelte?client";
</script>

<nav>
    <a href="/">main</a>
    <a href="/about">about</a>
    <a href="//naver.com">네이버</a>
</nav>
<Island component={Input} />
<Slot />
