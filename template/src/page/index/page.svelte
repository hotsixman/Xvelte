<script>
    import Island from "../../../../library/src/components/Island.svelte";
    import Counter from "./counter.svelte?client";
</script>

<div>메인페이지</div>

<svelte:head>
    <script>
        console.log("<");
    </script>
</svelte:head>
<Island component={Counter} props={{init: 5}} on="click">
    <button>서버</button>
</Island>

<style>
    div {
        color: red;
    }
</style>
