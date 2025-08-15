<script>
    import Island from "@hotsixman/xvelte/components/Island.svelte";
    import Counter from "./counter.svelte?client";
</script>
<div>
    메인페이지
</div>
<Island component={Counter}/>
<svelte:head>
    <script>
        console.log('<');
    </script>
</svelte:head>

<style>
    div{
        color: red;
    }
</style>