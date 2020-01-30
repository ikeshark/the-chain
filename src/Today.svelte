<script>
	import { createEventDispatcher } from 'svelte';

	export let tasks;
	export let currentStreak;
	export let longestStreak;
	export let tasksLeft;
	export let day;
	export let version;

	const dispatch = createEventDispatcher();

	function toggleComplete(e) {
		dispatch('toggleComplete', {
      id: e.target.value,
    })
	}
  function submitDay() {
    dispatch('submitDay')
  }
</script>
<div class="flex">
  <div class="w-1/2">
    <p>Current streak: {currentStreak}</p>
    <p class="mb-4">Longest streak: {longestStreak}</p>
  </div>
  <div class="w-1/2">
    {#if tasksLeft}
      <p class="text-lg text-right">Tasks left: {tasksLeft}</p>
    {:else}
      <p class="text-right font-bold">All done for the day!</p>
    {/if}
		<p class="text-right text-lg">Version: {version}</p>
  </div>
</div>

<div
  id="scroll"
  class="border-gray-500 border-2 p-2 shadow-lg overflow-y-scroll"
>
  <h2 class="text-2xl text-center">
    {day.toLocaleDateString('en', {
			month: 'long',
			day: 'numeric',
			weekday: 'long'
		})}
  </h2>
  {#each tasks as { title, id, isCompleted }}
    <label class="py-1 px-2 shadow-sm border border-gray-400 text-xl last:mb-12">
    	{title}
    	<input
    		class="float-left mt-2 mr-2"
    		type="checkbox"
        value={id}
    		bind:checked={isCompleted}
    		on:change={toggleComplete}
    	>
    </label>
  {/each}
</div>
<button
  class="fixed bottom-0 left-0 m-4 border-gray-800 border-solid bg-gray-200 py-1 px-3 text-2xl font-bold rounded-lg border-2"
  on:click={submitDay}
>
  Submit
</button>


<style>
	input {transform: scale(1.5)}
</style>
