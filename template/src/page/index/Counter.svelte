<script lang="ts">
    let count = $state(0);

    function increase(){
        count++;
    }
</script>

<button onclick={increase}>
    Count is {count}
</button>

<style>
    button{
        padding-block: 10px;
        padding-inline: 10px;

        border-radius: 5px;

        outline: 0;
        border: 0;

        background-color: rgb(228, 228, 228);

        cursor: pointer;

        &:hover{
            background-color: rgb(210, 210, 210);
        }

        &:active{
            background-color: rgb(228, 228, 228);
        }
    }
</style>