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
    {#each Object.values(themes) as { name, bg, border, invertBg }}
      <label class="flex items-center mb-1 py-2 px-4 {(theme.name === name) && `${theme.border} border-2 border-solid`}">
        <span class="mr-auto text-xl text-center font-bold">{name}</span>
        <input
          class="opacity-0"
          name="theme"
          type="radio"
          value={name}
          on:change={changeTheme}>
        <span class={`${bg} w-10 h-10 inline-block border border-solid border-black`}></span>
        <span class={`${invertBg} w-10 h-10 inline-block border border-solid border-black`}></span>
      </label>
    {/each}

    <button
      class={`
        block mx-auto my-4 p-4
        text-xl font-bold
        border-double border-8 ${theme.border}
      `}
      type="submit"
    >
      Set preference
    </button>
  </form>
</div>
