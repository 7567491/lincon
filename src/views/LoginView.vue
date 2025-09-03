<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900">Linode Manager</h1>
        <p class="mt-2 text-gray-600">管理您的云服务器</p>
      </div>

      <form class="space-y-6" @submit.prevent="handleLogin">
        <div>
          <label for="token" class="block text-sm font-medium text-gray-700">
            API Token
          </label>
          <input
            id="token"
            v-model="form.token"
            type="password"
            placeholder="输入您的Linode API Token"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
            required
          />
        </div>

        <div class="flex items-center">
          <input
            id="remember"
            v-model="form.remember"
            type="checkbox"
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label for="remember" class="ml-2 block text-sm text-gray-900">
            记住我的Token
          </label>
        </div>

        <BaseButton
          type="submit"
          :loading="authStore.isLoading"
          class="w-full"
          size="lg"
        >
          登录
        </BaseButton>

        <div class="text-center">
          <a
            href="https://cloud.linode.com/profile/tokens"
            target="_blank"
            class="text-blue-600 hover:text-blue-500 text-sm"
          >
            如何获取API Token？
          </a>
        </div>
      </form>

      <!-- 错误提示 -->
      <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
        <p class="text-red-800 text-sm">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import BaseButton from "@/components/BaseButton.vue";

const router = useRouter();
const authStore = useAuthStore();

const form = reactive({
  token: "",
  remember: true,
});

const error = ref("");

const handleLogin = async () => {
  error.value = "";

  try {
    await authStore.initAuth();
    router.push("/instances");
  } catch (err: any) {
    error.value = err.message;
  }
};
</script>
