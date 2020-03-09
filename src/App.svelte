<script>
	import { onMount } from 'svelte';
	import { scale } from 'svelte/transition';
	import { backInOut } from 'svelte/easing';

	import Tailwindcss from './components/Tailwindcss.svelte';
	import EditChain from './components/EditChain.svelte';
	import Today from './components/Today.svelte';
	import User from './components/User.svelte';
	import Calendar from './components/Calendar.svelte';
	import Toast from './components/Toast.svelte';
	import Nav from './components/Nav.svelte';

	import { tab, isFirstTime, theme, day, badges, isSubmitted, longestStreak, toasts } from './stores.js'

	let isNav = false;
	let isIntro = true;

	onMount(() => {
		setTimeout(() => isIntro = false, 3000);

		if (localStorage.currentDay) {
			// day.set(new Date(parseInt(localStorage.currentDay)));
			if (new Date().getDate() > $day.getDate()) {
				toasts.create('You are in the past');
			}
		}
	});

	function changeTab({ detail }) {
		tab.set(detail.value);
		isNav = false;
	}

	function openNav() {
		isNav = !isNav;
	}
</script>

<Tailwindcss />

<div class="mainWrapper p-2 h-screen mx-auto md:flex relative overflow-hidden {$theme.bg}">
	{#if !$isFirstTime}
		<Nav
			isMobile={false}
			on:changeTab={changeTab}
		/>
	{/if}
	<div class="grid relative w-full h-full md:px-4">
		<header>
			<h1 class="text-3xl mb-2 text-center {$theme.text}">Don’t Break the Chain</h1>
			<div class="flex items-center justify-center mb-4 {$theme.text}">
				<div class="chain"></div>
				<div class="chain"></div>
				<div class="chain"></div>
				<div class="chain"></div>
				<div class="chain"></div>
				<div class="chain"></div>
				<div class="chain"></div>
			</div>
		</header>

		{#if $tab === 'today'}
			<main in:scale={{start: 0.3, delay: 200, easing: backInOut }} out:scale>
				<Today />
			</main>
		{:else if $tab === 'edit'}
			<main in:scale={{start: 0.3, delay: 200, easing: backInOut }} out:scale>
				<EditChain />
			</main>
		{:else if $tab === 'calendar'}
			<main
				class="relative"
				in:scale={{delay: 200, easing: backInOut }}
				out:scale
			>
				<Calendar />
			</main>
		{:else if $tab === 'user'}
			<main in:scale={{start: 0.3, delay: 200, easing: backInOut }} out:scale>
				<User />
			</main>
		{/if}

		{#if $toasts.length && !isIntro}
			<div
				transition:scale="{{ duration: 550, easing: backInOut }}"
				class="absolute top-0 left-0 mt-2 w-full"
			>
				{#each $toasts as { id, message }}
					<Toast {id} {message} />
				{/each}
			</div>
		{/if}
	</div> <!--end class grid -->
</div> <!--end class mainWrapper -->

{#if !$isFirstTime}
	<button
		on:click={openNav}
		class="fixed z-20 md:hidden bottom-0 right-0 m-4 border-gray-800 border-solid w-12 h-12 font-bold rounded-full leading-none border-2 {isNav ? 'bg-white text-xl' : 'text-4xl bg-gray-300' }">
		{@html isNav ? '&times;' : '⋮'}
	</button>
{/if}

{#if isNav}
	<Nav
		isMobile={true}
		on:changeTab={changeTab}
	/>
{/if}

<style>
	@keyframes spin {
		from {transform: rotateX(0deg)}
		to {transform: rotateX(180deg)}
	}

	@media (min-width: 768px) {
		.mainWrapper {
			max-width: 745px;
		}
	}
	.chain {
		border: 3px solid currentColor;
		width: 55px;
		height: 25px;
		border-radius: 8px;
	}
	.grid {
		display: grid;
		grid-template-rows: auto 1fr;
		grid-template-areas:
			'header'
			'main';
	}
	.chain:nth-of-type(odd) {animation: spin 1 2s linear}
	.chain:nth-of-type(even) {animation: spin 1 2s 1s linear; height: 15px; margin: 0 -14px;}
	main { grid-area: main; }
	header { grid-area: header;}
</style>
