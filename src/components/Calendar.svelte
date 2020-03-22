<script>
  import Modal from './Modal.svelte';
  import { theme, day, isSubmitted } from '../stores.js';

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const history = JSON.parse(localStorage.getItem('history'));
  const chainHistory = JSON.parse(localStorage.getItem('chainHistory')) || [];
  const numRecDays = history.numRecDays;

  const yesterday = new Date(yesterdayEpoch($day.getTime()));

  let year = yesterday.getFullYear();
  let month = yesterday.getMonth();
  let visibleMonth = populateMonth();
  let isAnimating = false;
  let detail = null;

  $: monthName = months[month];
  $: isPrevMonth = month ?
    !!history[year][month - 1] : !!history[year - 1];
  $: isNextMonth = month !== 11 ?
    !!history[year][month + 1] : !!history[year + 1];

  function populateMonth() {
    let monthArray = history[year][month];
    const [begArray, endArray] = fillOutMonth(
      monthArray[0].day, monthArray[monthArray.length -1].day
    )
    monthArray = [...begArray, ...monthArray, ...endArray];
    return monthArray.map(day => {
      const date = new Date(day.day);
      const value = {
        isCompleted: day.isCompleted,
        weekday: date.getDay(),
        day: date.getDate(),
        epoch: day.day,
      };
      return value;
    });
  }

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

  function yesterdayEpoch(epoch) {
    const date = new Date(epoch);
    return date.setDate(date.getDate() -1);
  }

  function changeMonth() {
    isAnimating = true;
    setTimeout(() => {
      isAnimating = false;
      visibleMonth = populateMonth();
    }, 300)
  }

  function showPrevMonth() {
    if (month) {
      month = month - 1;
    } else {
      month = 11;
      year = year - 1;
    }
    changeMonth();
  }

  function showNextMonth() {
    if (month !== 11) {
      month = month + 1;
    } else {
      month = 0;
      year = year + 1;
    }
    changeMonth();
  }

  function isCompletedStyles(isCompleted, epoch) {
    let submittedClass = '';
    // if day was just submitted and the day is the last submitted day
    if ($isSubmitted && epoch === yesterdayEpoch($day)) {
      submittedClass = ' animatePop';
    }
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
  }

  function closeModal() {
    detail = null;
  }

</script>

<div class="{$theme.text} text-center">
  <div class="flex justify-center items-center">
    <h2 class="text-4xl mr-8">Your History</h2>
    <p class="{$theme.invertBg} {$theme.invertText} rounded-full shadow w-16 h-16 text-sm relative halo {$isSubmitted && 'animateRotate'}">
      <span class="{(numRecDays > 99) ? 'text-2xl mt-2' : 'text-3xl'} block -mb-3">{numRecDays}</span>
      days
    </p>
  </div>
  {#if numRecDays}
    <div class="rounded-lg transition-sm {isAnimating && 'scale-xs'}">
      <h3 class="text-2xl text-center {$theme.text}">{monthName} {year}</h3>
      <div class="monthGrid mb-4">
        {#each weekdays as weekday, i}
          <div style="grid-column: {i + 1}">
            {weekday}
          </div>
        {/each}
        {#each visibleMonth as {epoch, weekday, isCompleted, day}, i}
          <!-- if a date belongs to chain history, make it a button  -->
          {#if chainHistory.map(x => x.startDay).indexOf(epoch) !== -1}
            <button
              id={epoch}
              type="button"
              on:click={showDetail}
              style="grid-column: {weekday === 0 ? 7 : weekday}"
              class="hasDetail text-center relative text-lg text-black font-bold rounded-sm {isCompletedStyles(isCompleted, epoch)}">
              {day}
              <span class="block text-3xl -mt-2 md:text-2xl">
                {@html isCompletedContent(isCompleted)}
              </span>
            </button>
          {:else}
            <div
              id={epoch}
              style="grid-column: {weekday === 0 ? 7 : weekday}"
              class="text-center text-lg text-black font-bold rounded-sm {isCompletedStyles(isCompleted, epoch)}">
              {day}
              <span class="block text-3xl -mt-2 md:text-2xl">
                {@html isCompletedContent(isCompleted)}
              </span>
            </div>
          {/if}
        {/each}
      </div> <!-- end grid -->
    </div>
  {:else}
    <h2 class="{$theme.text} text-xl my-4">YOU AINT GOT NO HISTORY</h2>
  {/if}
</div>
<div class="absolute bottom-0 mb-1 pageBtns {$theme.text}">
  <button
    on:click={showPrevMonth}
    class="px-2 py-1 font-bold text-2xl border-white mr-6 {!isPrevMonth && 'invisible'}"
  >
    &larr;
  </button>
  <button
    on:click={showNextMonth}
    class="px-2 py-1 font-bold text-2xl border-white {!isNextMonth && 'invisible'}"
  >
    &rarr;
  </button>
</div>
{#if !!detail}
  <Modal on:closeModal={closeModal}>
    <div class="{$theme.invertBg} {$theme.invertBorder} border-2 p-2 shadow-lg overflow-y-scroll w-10/12 max-w-500 shadow-lg">
      <h2 class="text-2xl text-center mb-2 {$theme.invertText}">
        Version: {detail.version}
      </h2>
      <ul>
        {#each detail.tasks as task}
          <li class={`
            py-1 px-2 mb-1 shadow-sm
            border ${$theme.border}
            ${$theme.text} ${$theme.bg}
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
  .transition-sm {transition: 0.3s transform;}
  .scale-xs {transform: scale(0.25)}
  .hasDetail {
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
  .animatePop {
		animation: popOut 2.2s ease-out;
	}
  .pageBtns {
    margin-left: 50%;
    transform: translateX(-50%);
  }
  .halo::after {
    content: '';
    position: absolute;
    top: 0; right: 0;
    bottom: 0; left: 0;

    border: 4px currentColor solid;
    border-bottom-width: 2px;
    border-radius: 50%;

    box-shadow: 0 1px 6px currentColor;
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
    grid-template-columns: repeat(7, 1fr);
  }
</style>
