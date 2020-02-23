<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let id;
  export let message;
  export let theme;

  const to = setTimeout(deleteToast, 5000);

  function deleteToast() {
    if (to) clearTimeout(to);
    dispatch('deleteToast', { id })
  }
</script>

<div
  {id}
  class="{theme.invertBg} {theme.invertText} relative py-2 px-8 border-2 {theme.invertBorder} rounded-lg border-solid mt-2"
  on:click={deleteToast}
>
  {message}
  <span class="absolute top-0 right-0 p-1 bg-white border-black border-solid border-2 leading-none font-bold text-black rounded-full mt-1 mr-1 h-8 w-8">{@html '&times;'}</span>
</div>

<style>
  div {
    left: 50%;
    transform: translateX(-50%);
    max-width: 250px;
    text-align: center;
  }
</style>
