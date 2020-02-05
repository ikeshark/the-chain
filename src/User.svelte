<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let theme;
  export let themes;

  function changeTheme(e) {
    dispatch('changeTheme', { newTheme: e.target.value });
  }
  function setTheme(e) {
    // need to have some sort of confirm that preference was set
    var data = new FormData(e.target);
    dispatch('setTheme', { newTheme: data.get('theme') });
  }
</script>

<div class={`${theme.invertBorder} border-2 p-2 shadow-lg z-10 ${theme.invertBg} relative`}>
	<h2 class={`${theme.invertText} text-2xl text-center`}>Themes</h2>
  <form
    class={`${theme.text} ${theme.bg} p-2`}
    on:submit|preventDefault={setTheme}
  >
    <label class="flex items-center mb-1 py-2 px-4 {(theme.name === 'day') && "border-black border-2 border-solid"}">
      <span class="mr-auto text-xl text-center font-bold">Day</span>
      <input
        name="theme"
        class="opacity-0"
        type="radio" value="day"
        on:change={changeTheme}>
      <span class={`${themes.day.bg} w-10 h-10 inline-block border border-solid border-black`}></span>
      <span class={`${themes.day.invertBg} w-10 h-10 inline-block border border-solid border-black`}></span>
    </label>
    <label class="flex items-center mb-1 py-2 px-4 {(theme.name === 'night') && "border-black border-2 border-solid"}">
      <span class="mr-auto text-xl text-center font-bold">Night</span>
      <input
        name="theme"
        class="opacity-0"
        type="radio" value="night"
        on:change={changeTheme}>
        <span class={`${themes.night.bg} w-10 h-10 inline-block border border-solid border-black`}></span>
        <span class={`${themes.night.invertBg} w-10 h-10 inline-block border border-solid border-black`}></span>
    </label>
    <label class="flex items-center mb-1 py-2 px-4 {(theme.name === 'green') && "border-black border-2 border-solid"}">
      <span class="mr-auto text-xl text-center font-bold">Green</span>
      <input
        name="theme"
        class="opacity-0"
        type="radio" value="green"
        on:change={changeTheme}>
      <span class={`${themes.green.bg} w-10 h-10 inline-block border border-solid border-black`}></span>
      <span class={`${themes.green.invertBg} w-10 h-10 inline-block border border-solid border-black`}></span>
    </label>
    <label class="flex items-center mb-1 py-2 px-4 {(theme.name === 'indigo') && "border-black border-2 border-solid"}">
      <span class="mr-auto text-xl text-center font-bold">Indigo</span>
      <input
        name="theme"
        class="opacity-0"
        type="radio" value="indigo"
        on:change={changeTheme}>
      <span class={`${themes.indigo.bg} w-10 h-10 inline-block border border-solid border-black`}></span>
      <span class={`${themes.indigo.invertBg} w-10 h-10 inline-block border border-solid border-black`}></span>
    </label>
    <button
      class="text-xl mx-auto my-4 block font-bold p-4 border-double border-8 border-black"
      type="submit">Set preference</button>
  </form>
</div>
