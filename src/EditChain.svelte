<script>
	// move this to edit page
//	nextId = tasks[tasks.length - 1].id + 1;
// function deleteTask(e) {
// 	tasks = tasks.filter(task => task.id !== e.detail.id);
// }

	import { createEventDispatcher } from 'svelte';

	export let tasks;
	export let isFirstTime;

	let titles = tasks.map(task => task.title);
	let newTitle = '';

	const dispatch = createEventDispatcher();

	function deleteTask(e) {
		titles = titles.filter(title => title !== e.target.value);
	}
	function addTask() {
		console.log(titles, newTitle)
		titles = [...titles, newTitle];
		newTitle = '';
		const scrollWrapper = document.querySelector('#scroll')
		scrollWrapper.scrollTop = scrollWrapper.scrollHeight;
	}
	function submitChain() {
		let chain = titles.map((title, i) => {
			return { title, id: i, isCompleted: false }
		});
		dispatch('submitChain', { chain })
	}
</script>

<div
	class="border-gray-500 border-2 p-2 shadow-lg z-10 bg-white relative"
	in:fly="{{ y: 200, duration: 700, delay: 250 }}"
	out:fly="{{ y: -200, duration: 500 }}"
>
	<h2 class="text-2xl text-center">{isFirstTime ? 'Create' : 'Edit'} Chain</h2>

	<ul id="scroll" class="mb-4 overflow-y-scroll">
		{#each titles as title}
			<li class="py-1 px-2 shadow-sm border border-gray-400 text-xl flex justify-between items-center last:mb-12">
				<span>{title}</span>

				<button
					type="button"
					class="border-0"
					on:click={deleteTask}
					value={title}
				>&times;</button>
			</li>
		{/each}
	</ul>

	<form on:submit|preventDefault={() => addTask} class="py-2 px-4 border border-gray-800 border-solid bg-gray-200">
		<label class="mb-2">
			<span class="text-xl">New task name</span>
			<input class="w-full shadow-sm border-gray-700" bind:value={newTitle} />
		</label>
		<button
			class="border-1 bg-white border-solid rounded-lg shadow-sm border-gray-800 px-3 py-1 block mx-auto text-xl"
			on:click={addTask}
		>
			Add New Task
		</button>
	</form>

	<button
		class="block mx-auto border-double px-2 py-1 border border-black"
		on:click={submitChain}
	>
		SUBMIT
	</button>
</div>

<style>
	ul {max-height: calc(100vh - 20rem);}
</style>
