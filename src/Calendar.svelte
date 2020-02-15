<script>
  import Modal from './Modal.svelte';

  export let theme;
  export let isSubmitted;
  export let isFuture;
  export let day;

  let history = {};
  let chainHistory = [];
  let dataObj;
  let showModal = false;
  let detail = null;
  let visibleMonth = [];
  let monthName = '';
  let year = null;

  if (localStorage.chainHistory) chainHistory = JSON.parse(localStorage.getItem('chainHistory'));
  if (localStorage.history) history = JSON.parse(localStorage.getItem('history'));

  const numRecDays = history.numRecDays || 0;
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'November', 'December'];
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (numRecDays) {
    let lastDate = new Date(day.getTime());
    if (isFuture) lastDate.setDate(lastDate.getDate() -1);
    year = lastDate.getFullYear();
    const month = lastDate.getMonth();
    monthName = months[month];
    let monthArray = history[year][month];
    const [begArray, endArray] = fillOutMonth(
      monthArray[0].day, monthArray[monthArray.length -1].day
    )
    monthArray = [...begArray, ...monthArray, ...endArray];
    visibleMonth = monthArray.map(day => {
      const date = new Date(day.day);
      const value = {
        isCompleted: day.isCompleted,
        weekday: date.getDay(),
        day: date.getDate(),
        epoch: day.day,
      };
      return value;
    });

    function fillOutMonth(epochA, epochZ) {
      // start of month is always 1
      // if start date isn't 1, simply make an array with rest of values
      const startDate = new Date(epochA).getDate();
      let newBegDates = [];
      if (startDate !== 1) {
        let result = [];
        for (let i = 1; i < startDate; i++) {
          newBegDates.push({
            day: new Date(epochA).setDate(i),
            isCompleted: null
          });
        }
      }

      const lastDate = new Date(epochZ).getDate()
      const lastMonth = new Date(epochZ).getMonth();
      let newEndDates = [];

      for (let i = lastDate + 1; i <= 31; i++) {
        const tomorrow = new Date(epochZ)
        tomorrow.setDate(i);
        if (tomorrow.getMonth() !== lastMonth) {
          break;
        }
        newEndDates.push({
          day: new Date(epochZ).setDate(i),
          isCompleted: null
        });
      }

      return [newBegDates, newEndDates];
    }

  } // END if (history.length)

  function isCompletedStyles(isCompleted) {
    let submittedClass = isSubmitted ? ' animatePop' : '';
    if (isCompleted === true) return 'bg-green-500' + submittedClass
    else if (isCompleted === false) return 'bg-red-600' + submittedClass
    else if (isCompleted === null) return 'bg-gray-500'
  }
  function isCompletedContent(isCompleted) {
    if (isCompleted === true) return '&check;'
    else if (isCompleted === false) return '&times;'
    else if (isCompleted === null) return '&nbsp;'
  }
  function showDetail({ target }) {
    const id = parseInt(target.id || target.parentNode.id);
    detail = chainHistory.filter(item => item.startDay === id)[0];
    console.log(detail)
  }
  function closeModal() {
    detail = null;
  }
</script>

<div class={`${theme.text} text-center`}>
  <div class="flex justify-center items-center">
    <h2 class="text-4xl mr-8">Your History</h2>
    <p class="rounded-full shadow w-16 h-16 text-sm relative halo {isSubmitted && 'animateRotate'}">
      <span class="text-3xl block -mb-3">{numRecDays}</span>
      days
    </p>
  </div>
  {#if numRecDays}
    <div class="rounded-lg">
      <h3 class={`text-2xl text-center ${theme.text}`}>{monthName} {year}</h3>
      <div class="monthGrid">
        {#each weekdays as weekday}
          <div style="grid-column: {weekday}">
            {weekday}
          </div>
        {/each}
        {#each visibleMonth as {epoch, weekday, isCompleted, day}}
          {#if chainHistory.map(x => x.startDay).indexOf(epoch) !== -1}
            <button
              id={epoch}
              type="button"
              on:click={showDetail}
              style="grid-column: {weekday}"
              class="text-center relative text-lg text-black font-bold rounded-sm {isCompletedStyles(isCompleted)}">
              {day}
              <span class="block text-3xl -mt-2">
                {@html isCompletedContent(isCompleted)}
              </span>
            </button>
          {:else}
            <div
              id={epoch}
              style="grid-column: {weekday}"
              class="text-center text-lg text-black font-bold rounded-sm {isCompletedStyles(isCompleted)}">
              {day}
              <span class="block text-3xl -mt-2">
                {@html isCompletedContent(isCompleted)}
              </span>
            </div>
          {/if}
        {/each}
      </div> <!-- end grid -->
    </div>
  {:else}
    <h2 class="{theme.text} text-xl my-4">YOU AINT GOT NO HISTORY</h2>
  {/if}
</div>

{#if !!detail}
  <Modal on:closeModal={closeModal}>
    <div class="{theme.invertBg} {theme.invertBorder} border-2 p-2 shadow-lg overflow-y-scroll w-10/12 shadow-lg">
      <h2 class={`text-2xl text-center mb-2 ${theme.invertText}`}>
        Version: {detail.version}
      </h2>
      <ul>
        {#each detail.tasks as task}
          <li class={`
            py-1 px-2 mb-1 shadow-sm
            border ${theme.border}
            ${theme.text} ${theme.bg}
            text-xl last:mb-12
          `}>
            {task}
          </li>
        {/each}
      </ul>
    </div>
  </Modal>
{/if}

<style>
  #scroll { height: 68vh;}
  button {
    --width: 5px;
    --bg: rgba(255,255,255,0.4);
    background-blend-mode: lighten;
    background-image: repeating-linear-gradient(34deg, transparent, transparent var(--width), var(--bg) var(--width), var(--bg) calc(var(--width) * 2));
  }
  @keyframes popOut {
    0% {transform: scale(0.125)}
    80% {transform: scale(1.5)}
    90% {transform: scale(1.5)}
    100% {transform: scale(1)}
  }
  .animatePop:last-of-type {
		animation: popOut 2.2s ease-out;
	}
  .halo::after {
    content: '';
    position: absolute;
    top: 0; right: 0;
    bottom: 0; left: 0;

    border: 4px currentColor solid;
    border-bottom-width: 2px;
    border-radius: 50%;

    box-shadow: 0 1px 12px currentColor;
  }
  @keyframes rotate {
    0% {transform: rotate(0deg)}
    100% {transform: rotate(360deg)}
  }
  .animateRotate::after {
    animation: rotate 1.5s 2s;
  }
  .monthGrid {
    display: grid;
    grid-gap: 3px;
    /* i need to change this for i18n purposes */
    grid-template-columns:
      [Mon-start] 1fr [Mon-end Tue-start] 1fr [Tue-end Wed-start] 1fr [Wed-end Thu-start] 1fr [Thu-end Fri-start] 1fr [Fri-end Sat-start] 1fr [Sat-end Sun-start] 1fr [Sun-end];
  }
</style>
