<script lang="ts">
    import Island from '@hotsixman/xvelte/components/Island.svelte';
    import Slot from '@hotsixman/xvelte/components/Slot.svelte';
    import Logo from './Logo.svelte';
    import LogoClient from './Logo.svelte?client';
</script>

<main>
    <Island component={LogoClient}>
        <Logo/>
    </Island>
    <h1>
        Xvelte
    </h1>
    <nav>
        <a href="/">main</a>
        <a href="/about">about</a>
    </nav>
    <Slot/>
</main>

<style>
    :global(html, body){
        height: 99%;
        overflow: auto;
        margin: 0;
    }

    main{
        height: 100%;
        display:flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    h1{
        font-size:50px;
    }

    nav{
        display:flex;
        justify-content: center;
        column-gap: 20px;
    }

    a{
        font-size: 20px;
        text-decoration: none;
        color: blue;

        &:hover{
            color: purple;
        }
    }
</style>