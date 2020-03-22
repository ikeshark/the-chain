<script>
  import { theme, isSubmitted, badges, longestStreak } from '../stores.js';
  let myBadges = badges.filter(mark => $longestStreak >= mark);
</script>


<div class="scroll overflow-y-scroll h-auto border-double border-8 {$theme.border}">
  {#each myBadges as badge}
    <div class="starOuter relative mx-auto h-32 w-32 my-12 {$isSubmitted && 'animate'}">
      <div class="starInner z-10 absolute top-0 left-0 w-full h-full flex items-center justify-center">
        <span
          class="badge w-full h-full text-5xl z-10 rounded-full text-center {$theme.invertBg} {$theme.invertText} {$theme.invertBorder} font-bold border-8 border-double"
          >
          {badge}
        </span>
      </div>
    </div>
  {/each}
</div>

<style>
  .scroll {
    height: 30.5rem;
  }
  .badge {
    line-height: 2.125;
    text-shadow: 2px 2px black;
    box-shadow: inset 0px 0px 6px 7px currentColor, 0 0 8px 0.35rem black;
  }
  .starOuter::after, .starOuter::before,
  .starInner::after, .starInner::before {
    width: 100%;
    height: 100%;
    content: '';
    position: absolute;
    top: 0;
    left: 0;
  }
  .animate:first-of-type {
    animation: 3s rotate 2 linear;
  }
  .animate:first-of-type .badge {
    animation: 3s rotate 2 linear reverse;
  }
  @keyframes rotate {
    100% {transform: rotate(360deg)}
  }
  .starOuter::before {
    transform: rotate(45deg)
  }

  .starInner::after {transform:rotate(22.5deg)}
  .starInner::before {transform:rotate(67.5deg)}

  .starInner::after, .starInner::before {
    background-color: white;
    border: 5px solid black;
    width: 8rem;
    height: 8.125rem;
  }
  .starOuter::after, .starOuter::before {
    background-color: black;
  }
  .starOuter:nth-of-type(2) {
    transform: scale(0.875)
  }
  .starOuter:nth-of-type(3) {
    transform: scale(0.75)
  }
  .starOuter:nth-of-type(4) {
    transform: scale(0.675)
  }
  .starOuter:nth-of-type(5), .starOuter:nth-of-type(6),
  .starOuter:nth-of-type(7) {
    transform: scale(0.5)
  }
</style>
