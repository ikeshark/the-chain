<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let theme;
  export let themes;

  function changeTheme(e) {
    dispatch('changeTheme', { newTheme: e.target.value })
  }
  function setTheme(e) {
    dispatch('changeTheme', { newTheme: e.theme.value })
  }
</script>

<form
  class={`${theme.text}`}
  on:submit|preventDefault={setTheme}
>
  <label class="border-black border-2 border-solid p-4">
    <span class="text-xl text-center block font-bold mb-2">Day</span>
    <input
      name="theme"
      class="opacity-0"
      type="radio" value="day"
      on:change={changeTheme}>
    <span class={`${themes.day.bg} w-10 h-10 inline-block border border-solid border-black`}></span>
    <span class={`${themes.day.invertBg} w-10 h-10 inline-block border border-solid border-black`}></span>
  </label>
  <label class="border-black border-2 border-solid p-4">
    <span class="text-xl text-center block font-bold mb-2">Night</span>
    <input
      name="theme"
      class="opacity-0"
      type="radio" value="night"
      on:change={changeTheme}>
      <span class={`${themes.night.bg} w-10 h-10 inline-block border border-solid border-black`}></span>
      <span class={`${themes.night.invertBg} w-10 h-10 inline-block border border-solid border-black`}></span>
  </label>
  <button type="submit">Set preference</button>
</form>
