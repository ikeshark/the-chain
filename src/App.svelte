<script>
	import { onMount } from 'svelte';
	import { scale } from 'svelte/transition';
	import { backInOut } from 'svelte/easing';

	import Tailwindcss from './Tailwindcss.svelte';
	import EditChain from './EditChain.svelte';
	import Today from './Today.svelte';
	import User from './User.svelte';
	import Calendar from './Calendar.svelte';
	import Toast from './Toast.svelte';
	import Nav from './Nav.svelte';

	let isNav = false;
	let isFirstTime = true;
	let isSubmitted = false;
	let isIntro = true;

	let tab = 'today';

	let day = formatDate(new Date().getTime());
	let tasks = [];
	let toasts = [];
	let currentStreak = 0;
	let longestStreak = 0;
	let version = 0;
	let toastId = 0;

	const badges = [365, 180, 90, 28, 14, 7, 1];

	const themes = {
		day: {
			bg: 'bg-orange-100',
			border: 'border-red-800',
			text: 'text-red-800',
			invertBg: 'bg-red-800',
			invertBorder: 'border-orange-500',
			invertText: 'text-orange-200',
			name: 'day',
		},
		night: {
			bg: 'bg-gray-800',
			border: 'border-blue-200',
			text: 'text-blue-200',
			invertBg: 'bg-blue-200',
			invertBorder: 'border-blue-700',
			invertText: 'text-gray-800',
			name:'night'
		},
		green: {
			bg: 'bg-green-900',
			border: 'border-yellow-400',
			text: 'text-yellow-300',
			invertBg: 'bg-green-200',
			invertBorder: 'border-green-700',
			invertText: 'text-green-900',
			name:'green'
		},
		indigo: {
			bg: 'bg-indigo-800',
			border: 'border-indigo-200',
			text: 'text-purple-300',
			invertBg: 'bg-indigo-300',
			invertBorder: 'border-blue-700',
			invertText: 'text-blue-900',
			name:'indigo'
		},
	}
	// optional night invertBorder = border-gray-500
	// optional night bg = bg-blue-900
	let theme = themes.night;

	onMount(() => {
		setTimeout(() => isIntro = false, 3000);
		if (localStorage.tasks) {
			isFirstTime = false;
			tasks = JSON.parse(localStorage.getItem('tasks'));
			const chainHistory = JSON.parse(localStorage.getItem('chainHistory'));
			// if storing num in localStorage that is in obj (using JSON.parse / stringify)
			//// you will have a number, no need to parse
			version = chainHistory[chainHistory.length - 1].version;

			if (localStorage.currentDay) {
				day = new Date(parseInt(localStorage.currentDay))

				if (new Date().getDate() > day.getDate()) {
					createToast({ detail: { message:
						'You are in the past'
					} });
				}
			}
			if (localStorage.currentStreak) {
				// if storing a number directly in local storage it gets turned into a string
				currentStreak = parseInt(localStorage.getItem('currentStreak'));
			}
			if (localStorage.longestStreak) {
				longestStreak = parseInt(localStorage.getItem('longestStreak'));
			}
			if (localStorage.theme) {
				theme = themes[localStorage.getItem('theme')]
			}

		} else {
			tab = 'edit';
		}

	});

	$: tasksLeft = tasks.filter(task => task.isCompleted === false).length;
	$: isFuture = (new Date().getDate() < day.getDate());
	$: if (tasks.length) localStorage.setItem('tasks', JSON.stringify(tasks));

	function changeTab({ detail }) {
		// isSubmitted is used to trigger animations right after submit
		//// once they navigate away from page with animations we want to not trigger anymore
		isSubmitted = false;
		tab = detail.value;
		isNav = false;
	}
	function toggleComplete({ detail }) {
		const task = tasks[detail.id];
		const { isCompleted, id, title } = task;
    const updatedTask = {
      id: detail.id,
      isCompleted: !isCompleted,
      title
    }
		let newTasks = tasks.filter(task => task.id !== detail.id);
		newTasks = [...newTasks, updatedTask];

		tasks = newTasks.sort((a,b) => a.id - b.id);
	}
	function openNav() {
		isNav = !isNav;
	}
	function submitDay() {
		const year = day.getFullYear();
		const month = day.getMonth();

		const isCompleted = tasksLeft ? false : true;
		const value = { day: day.getTime(), isCompleted };

		let history = {};
		if (localStorage.history) {
			history = JSON.parse(localStorage.getItem('history'));
		} else {
			history.numRecDays = 0
		}
		history.numRecDays = history.numRecDays + 1;
		if (!history[year]) {
			history[year] = {};
			history[year][month] = [value];
		}	else if (!history[year][month]) {
			history[year][month] = [value]
		} else {
			history[year][month] = [ ...history[year][month], value ];
		}

		currentStreak = isCompleted ? currentStreak + 1 : 0;
		day = new Date(day.setDate(day.getDate() + 1))

		localStorage.setItem('history', JSON.stringify(history));
		localStorage.setItem('currentDay', day.getTime());
		localStorage.setItem('currentStreak', currentStreak);
		tab = 'calendar';
		if (currentStreak > longestStreak) {
			longestStreak = currentStreak;
			localStorage.setItem('longestStreak', longestStreak);
			// if there is a new badge go to user
			if (badges.indexOf(currentStreak) !== -1) tab = 'user';
		}
		tasks = tasks.map(task => {
			return { ...task, isCompleted: false }
		});
		isSubmitted = true;
		setTimeout(() => isSubmitted = false, 3000);
	}
	function submitChain(e) {
		tasks = e.detail.chain;

		let chainHistory = [];
		if (isFirstTime) {
			isFirstTime = false;
			version = 1;
			chainHistory = [{
				version,
				startDay: day.getTime(),
				tasks: tasks.map(task => task.title)
			}];
		} else if (localStorage.chainHistory) {
			chainHistory = JSON.parse(localStorage.getItem('chainHistory'))
			// if a chain is updated twice in a day
			//// don't update version, overwrite tasks
			if (chainHistory[chainHistory.length - 1].startDay === day.getTime()) {
				const historyItem = chainHistory[chainHistory.length - 1];
				historyItem.tasks = tasks.map(task => task.title);
				chainHistory = chainHistory.filter(item => item.startDay !== day.getTime());
				chainHistory = [...chainHistory, historyItem];
			} else {
	 			version = currentStreak ? version + 0.01 : version + 1;
	 			version = parseFloat(version.toFixed(2));
	 			chainHistory = [...chainHistory, {
	 				version,
	 				startDay: day.getTime(),
	 				tasks: tasks.map(task => task.title)
	 			}]
			}
		}
		localStorage.setItem('chainHistory', JSON.stringify(chainHistory));
		tab = 'today';
	}

	function changeTheme(e) {
		theme = themes[e.detail.newTheme];
	}
	function setTheme(e) {
		// should i see if theme has changed?
		localStorage.setItem('theme', e.detail.newTheme);
		createToast({ detail: { message:
			'New Theme Successfully Saved'
		} });
	}
	function createToast(e) {
		toasts = [...toasts, { id: toastId, message: e.detail.message }];
		toastId++;
	}
	function deleteToast(e) {
		toasts = toasts.filter(toast => toast.id !== e.detail.id);
	}

	function formatDate(epoch) {
		const date = new Date(epoch);
		return new Date(date.setHours(0, 0, 0, 0));
	}


</script>

<Tailwindcss />

<div class="mainWrapper p-2 h-screen mx-auto md:flex relative overflow-hidden {theme.bg}">
	<Nav
		isMobile={false}
		on:changeTab={changeTab}
		{theme}
		{tab}
	/>
	<div class="grid relative w-full h-full md:px-4">
		<header>
			<h1 class="text-3xl mb-2 text-center {theme.text}">Don’t Break the Chain</h1>
			<div class="flex items-center justify-center mb-4 {theme.text}">
				<div class="chain"></div>
				<div class="chain"></div>
				<div class="chain"></div>
				<div class="chain"></div>
				<div class="chain"></div>
				<div class="chain"></div>
				<div class="chain"></div>
			</div>
		</header>

		{#if tab === 'today'}
			<main in:scale={{start: 0.3, delay: 200, easing: backInOut }} out:scale>
				<Today
					{day}
		      {currentStreak}
		      {longestStreak}
					{tasks}
					{tasksLeft}
					{version}
					{isFuture}
					{theme}
					on:toggleComplete={toggleComplete}
		    />
			</main>
			{#if !isFuture}
				<button
				  class="absolute bottom-0 left-0 m-4 border-gray-800 border-solid bg-gray-200 py-1 px-3 text-2xl font-bold rounded-lg border-2"
				  on:click={submitDay}
				>
				  Submit
				</button>
			{/if}
		{:else if tab === 'edit'}
			<main in:scale={{start: 0.3, delay: 200, easing: backInOut }} out:scale>
				<EditChain
					{theme}
					{isFirstTime}
					{tasks}
					on:submitChain={submitChain}
				/>
			</main>
		{:else if tab === 'calendar'}
			<main
				class="relative"
				in:scale={{delay: 200, easing: backInOut }}
				out:scale
			>
				<Calendar {theme} {isSubmitted} {isFuture} {day} />
			</main>
		{:else if tab === 'user'}
			<main in:scale={{start: 0.3, delay: 200, easing: backInOut }} out:scale>
				<User
					{badges}
					{themes}
					{theme}
					{isSubmitted}
					{longestStreak}
					on:setTheme={setTheme}
					on:changeTheme={changeTheme}
				/>
			</main>
		{/if}
		{#if toasts.length && !isIntro}
			<div
				transition:scale="{{ duration: 550, easing: backInOut }}"
				class="absolute top-0 left-0 mt-2 w-full"
			>
				{#each toasts as { id, message }}
					<Toast {id} {message} {theme} on:deleteToast={deleteToast} />
				{/each}
			</div>
		{/if}
	</div> <!--end class grid -->
</div> <!--end class mainWrapper -->

{#if !isFirstTime}
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
		{theme}
		{tab}
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
