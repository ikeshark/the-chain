<script>
	import { createEventDispatcher } from 'svelte';

	export let id;
	export let title;
	export let console.log(require('util').inspect(, { depth: null }));ompleted;

	const dispatch = createEventDispatcher();

	function toggleComplete() {
		dispatch('toggleComplete', { id, title, isCompleted })
	}
</script>

<label class="py-1 px-2 shadow-sm border border-gray-400 text-xl last:mb-12">
	{title}
	<input
		class="float-left mt-2 mr-2"
		type="checkbox"
		bind:checked={isCompleted}
		on:change={toggleComplete}
	>
</label>

<style>
	input {transform: scale(1.5)}
</style>
