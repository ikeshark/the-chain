import { writable, derived } from 'svelte/store';

// ......
// THEME
// ......
export const themes = {
  day: {
    bg: 'bg-blue-200',
    border: 'border-gray-600',
    text: 'text-black',
    invertBg: 'bg-gray-800',
    invertBorder: 'border-gray-500',
    invertText: 'text-gray-200',
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
  yellow: {
    bg: 'bg-gray-800',
    border: 'border-yellow-600',
    text: 'text-yellow-400',
    invertBg: 'bg-yellow-400',
    invertBorder: 'border-gray-800',
    invertText: 'text-gray-900',
    name:'yellow'
  },
  pink: {
    bg: 'bg-gray-900',
    border: 'border-pink-700',
    text: 'text-pink-400',
    invertBg: 'bg-pink-400',
    invertBorder: 'border-pink-500',
    invertText: 'text-gray-900',
    name:'pink'
  },
}
// optional night invertBorder = border-gray-500
// optional night bg = bg-blue-900
export const themeName = writable(localStorage.theme || 'night');
export const theme = derived(themeName, $themeName => themes[$themeName])

// ......
// DATE
// ......
function formatDate(epoch) {
  const date = new Date(epoch);
  return new Date(date.setHours(0, 0, 0, 0));
}
export const day = writable(
  localStorage.getItem('currentDay') ?
    new Date(parseInt(localStorage.currentDay)) :
    formatDate(new Date().getTime())
);

// .....
// MISC
// .....
function createIsSubmitted() {
  const { subscribe, set, update } = writable(false);
  return {
    subscribe,
    submit: () => {
      set(true);
      setTimeout(() => set(false), 6000);
    }
  }
}
export const isSubmitted = createIsSubmitted();

function createToasts() {
  const { subscribe, set, update } = writable([]);
  let id = 0;
  return {
    subscribe,
    update,
    create: message => update(toasts => {
      id++;
      return [...toasts, { id, message }]
    })
  }
}
export const toasts = createToasts();
export const badges = [365, 180, 90, 28, 14, 7, 1];

// https://fireship.io/snippets/custom-svelte-stores/
// https://higsch.me/2019/06/22/2019-06-21-svelte-local-storage/

const createPersistedStore = (key, defaultValue) => {
	const initialJson = localStorage.getItem(key);
	const initialValue = initialJson ? JSON.parse(initialJson) : defaultValue;
	const store = writable(initialValue);

	const subscribe = fn =>
		store.subscribe(current => {
			localStorage.setItem(key, JSON.stringify(current))
			return fn(current)
		})

	return {
		subscribe,
		set: store.set,
    update: store.update
	}
}
export const isFirstTime = writable(!!localStorage.tasks ? false : true);
export const currentStreak = createPersistedStore('currentStreak', 0);
export const longestStreak = createPersistedStore('longestStreak', 0);

// ......
// TASKS
// ......
// function createTask() {
//   const { subscribe, set, update } = writable(
//     JSON.parse(localStorage.getItem('tasks')) || []
//   );
//
//   return {
//     subscribe,
//     set,
//     update,
//     reset: () => update(tasks => tasks.map(task => {
//       return { ...task, isCompleted: false }
//     }))
//   }
// }
export const hasHistory = writable(!!localStorage.history)
export const tasks = createPersistedStore('tasks', []);
export const tab = writable(localStorage.tasks ? 'today' : 'edit');
function getVersion() {
  if (localStorage.chainHistory) {
    const chainHistory = JSON.parse(localStorage.chainHistory);
    return chainHistory[chainHistory.length - 1].version
  } else return 0
}
export const version = writable(getVersion());
