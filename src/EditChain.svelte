<script>
	import { createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';

	export let tasks;
	export let isFirstTime;
	export let theme;

	let titles = tasks.map(task => task.title);
	let newTitle = '';

	const dispatch = createEventDispatcher();

	function deleteTask(e) {
		titles = titles.filter(title => title !== e.target.value);
	}
	function addTask() {
		titles = [...titles, newTitle];
		newTitle = '';
		const scrollWrapper = document.querySelector('#scroll')

		if (scrollWrapper.scrollHeight > scrollWrapper.clientHeight) {
			const height = scrollWrapper.scrollHeight;
			scrollWrapper.scrollTo({
			  top: height,
			  left: 0,
			  behavior: 'smooth'
			});
		}
	}
	function submitChain() {
		let chain = titles.map((title, i) => {
			return { title, id: i, isCompleted: false }
		});
		dispatch('submitChain', { chain })
	}
</script>

<div class={`${theme.invertBorder} border-2 p-2 shadow-lg z-10 ${theme.invertBg} relative`}>
	<h2 class={`${theme.invertText} text-2xl text-center`}>{isFirstTime ? 'Create' : 'Edit'} Chain</h2>

	<ul id="scroll" class={`${theme.text} mb-4 overflow-y-scroll`}>
		{#each titles as title}
			<li class={
				`flex justify-between items-center last:mb-10 py-1 px-2
				shadow-sm border ${theme.border} ${theme.bg} text-xl`
			}>
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

	<form on:submit|preventDefault={addTask}
		class={
			`py-2 px-4 mb-4
			border-2 border-solid ${theme.text} ${theme.border} ${theme.bg} shadow-sm`
		}>

		<label class="mb-2">
			<span class="text-xl">New task name</span>
			<input class={`w-full shadow-sm border-blue-300 ${theme.bg}`} bind:value={newTitle} />
		</label>
		<button
			class="text-black border-2 bg-white border-solid rounded-lg shadow-sm border-blue-500 px-3 py-1 block mx-auto text-xl"
		>
			Add New Task
		</button>
	</form>

	{#if titles.length}
		<button
			class="block mx-auto text-xl border-double px-2 py-1 border-4 border-blue-800 bg-blue-100"
			on:click={submitChain}
			transition:fade={{ duration: 600, delay: 100 }}
		>
			SUBMIT {isFirstTime ? 'NEW' : 'EDITED'} CHAIN
		</button>
	{/if}
</div>

<style>
	ul {max-height: calc(100vh - 24.5rem);}
</style>
