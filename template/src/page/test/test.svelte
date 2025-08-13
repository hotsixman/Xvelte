<script lang="ts">
    import Text from "./text.svelte";
    import TextClient from "./text.svelte?client";
    import { Island } from "../../../../library/components";

    interface Props {
        time: string;
    }

    let { time }: Props = $props();
</script>

현재 시간은 {time} 입니다.
<Text />
<Island component={TextClient} />
테스트

<form method="post" action="/get/asd">
    <input name="foo" type="file">
    <button type="submit">제출</button>
</form>