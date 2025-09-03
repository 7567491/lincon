<template>
  <button
    :class="buttonClasses"
    :disabled="disabled || loading"
    @click="$emit('click')"
  >
    <div
      v-if="loading"
      class="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"
    ></div>
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "primary",
  size: "md",
});

defineEmits<{
  click: [];
}>();

const buttonClasses = computed(() => {
  const base =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary:
      "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  };
  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
  };

  const disabledClass =
    props.disabled || props.loading ? "opacity-50 cursor-not-allowed" : "";

  return `${base} ${variants[props.variant]} ${sizes[props.size]} ${disabledClass}`;
});
</script>
