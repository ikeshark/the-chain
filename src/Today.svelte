<script>
	import { createEventDispatcher } from 'svelte';

	export let tasks;
	export let currentStreak;
	export let longestStreak;
	export let tasksLeft;
	export let day;
	export let version;
	export let isToday;

	const dispatch = createEventDispatcher();

	function toggleComplete(e) {
		dispatch('toggleComplete', {
      id: parseInt(e.target.value),
    })
	}
</script>
<div class="flex text-blue-200">
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
  class="border-gray-500 border-2 p-2 shadow-lg overflow-y-scroll bg-blue-200"
>
  <h2 class="text-2xl text-center">
    {day.toLocaleDateString('en', {
			month: 'long',
			day: 'numeric',
			weekday: 'long'
		})}
  </h2>

  {#each tasks as { title, id, isCompleted }}
    <label class="py-1 px-2 mb-1 shadow-sm border border-blue-100 bg-blue-900 text-blue-200 text-xl last:mb-12">
    	{title}

    	{#if isToday}
				<input
	    		class="float-left mt-2 mr-2"
	    		type="checkbox"
	        value={id}
	    		on:change={toggleComplete}
					checked={isCompleted}
	    	>
			{/if}
    </label>
  {/each}
</div>


<style>
	input {transform: scale(1.5);}
</style>
