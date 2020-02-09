<script>
  export let history;
  export let theme;

  history.sort((a, b) => b.day - a.day);

  function findYears(epochA, epochB) {
    // function assumes epochA is more recent!
    const firstYear = new Date(epochA).getFullYear();
    const lastYear = new Date(epochB).getFullYear();
    if (firstYear === lastYear) return [firstYear]
    else if (firstYear - lastYear === 1) return [firstYear, lastYear]
    else {
      let yearArray = [];
      for (let i = firstYear; i >= lastYear; i-- ) {
        yearArray.push(i);
      }
      return yearArray;
    }
  }

  function createDataStructure(yearArray) {
    const dataObj = {};
    for (var i = 0; i < yearArray.length; i++) {
      dataObj[yearArray[i]] = {}
    }
    return dataObj;
  }

  const dataObj = createDataStructure(
    findYears(history[0].day, history[history.length -1].day)
  );

  history.forEach(item => {
    const date = new Date(item.day);
    const year = date.getFullYear();
    const month = date.toLocaleDateString('en', {
      month: 'long'
    });
    const weekday = date.toLocaleDateString('en', {
      weekday: 'short'
    });

    const value = {
      isCompleted: item.isCompleted,
      day: date.getDate(),
      weekday
    };
    if (dataObj[year][month]) {
      dataObj[year][month] = [ ...dataObj[year][month], value ];
    } else {
      dataObj[year][month] = [value];
    }
  });

  console.log(dataObj)

</script>

<div class={`${theme.text} text-center`}>
  <h2 class="text-4xl text-center">Your History</h2>
  <p class="text-lg -mt-2 mb-2 text-center">
    Number of recorded days: {history.length}
  </p>
  <div id="scroll" class="rounded-lg overflow-y-scroll">
    {#each Object.entries(dataObj) as year}
      <h3>{year[0]}</h3>
      {#each Object.entries(year[1]) as month}
        <div class="last:mb-12">
          <h4 class={`text-2xl text-center ${theme.text}`}>{month[0]}</h4>
          <div class="monthGrid">
            <div style="grid-column: Mon-start / Mon-end">
              Mon
            </div>
            <div style="grid-column: Tue-start / Tue-end">
              Tue
            </div>
            <div style="grid-column: Wed-start / Wed-end">
              Wed
            </div>
            <div style="grid-column: Thu-start / Thu-end">
              Thu
            </div>
            <div style="grid-column: Fri-start / Fri-end">
              Fri
            </div>
            <div style="grid-column: Sat-start / Sat-end">
              Sat
            </div>
            <div style="grid-column: Sun-start / Sun-end">
              Sun
            </div>

            {#each month[1].sort((a, b) => a.day - b.day) as dayObj}
              <div
                style="grid-column: {dayObj.weekday}-start / {dayObj.weekday}-end"
                class="p-1 text-center text-lg text-black font-bold rounded-sm {dayObj.isCompleted ? 'bg-green-500' : 'bg-red-700'}">
                {dayObj.day}
                <span class="block text-3xl -mt-2">
                  {@html dayObj.isCompleted ? '&check;' : '&times;'}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/each} <!-- end month -->
    {/each} <!-- end year -->
  </div> <!-- end div#scroll -->
</div>


<style>
  #scroll { height: 68vh;}
  .monthGrid {
    display: grid;
    grid-gap: 3px;
    grid-template-columns:
      [Mon-start] 1fr [Mon-end Tue-start] 1fr [Tue-end Wed-start] 1fr [Wed-end Thu-start] 1fr [Thu-end Fri-start] 1fr [Fri-end Sat-start] 1fr [Sat-end Sun-start] 1fr [Sun-end];
  }
</style>
