<script setup lang="ts">
defineProps<{
  hue: number
  sat: number
}>()
</script>

<template>
  <div
    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] pointer-events-none animate-pulse-slow transition-colors duration-1000"
  >
    <div
      class="absolute inset-0 transition-all duration-1000"
      :style="{
        background: `radial-gradient(circle closest-side, hsla(${hue}, ${sat}%, 60%, 0.25), hsla(${
          hue + 40
        }, ${sat}%, 50%, 0.1), transparent)`,
      }"
    ></div>
  </div>
</template>
