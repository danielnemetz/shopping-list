<template>
  <div class="login-wrapper animate-fade-in">
    <div class="glass-panel login-card">
      <div class="header">
        <LucideShield :size="48" class="logo-icon admin" />
        <h1 class="logo-title">
          Listly <span class="admin-badge">Admin</span>
        </h1>
        <p>Secured Area</p>
      </div>

      <div class="form-container">
        <form @submit.prevent="handleLogin" class="step-form">
          <div class="input-group">
            <LucideLock class="input-icon" :size="20" />
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="Admin Password"
              class="input-base with-icon text-center tracking-widest text-lg"
              required
              autofocus
              :disabled="isLoading"
            />
          </div>

          <button
            type="submit"
            class="btn-primary mt-4"
            :disabled="isLoading || !password"
          >
            <LucideCheckCircle :size="18" v-if="!isLoading" />
            <LucideLoader :size="18" class="spin" v-else />
            <span>{{
              isLoading ? "Authenticating..." : "Access Dashboard"
            }}</span>
          </button>

          <p v-if="errorMessage" class="error-msg text-center mt-4">
            {{ errorMessage }}
          </p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import {
  LucideLock,
  LucideShield,
  LucideCheckCircle,
  LucideLoader,
} from "lucide-vue-next";

const password = ref("");
const isLoading = ref(false);
const errorMessage = ref("");
const router = useRouter();

const handleLogin = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const response = await $fetch("/api/auth/admin-login", {
      method: "POST",
      body: { password: password.value },
    });

    if (response.success) {
      router.push("/admin");
    }
  } catch (error: any) {
    if (error.response?.status === 401) {
      errorMessage.value = "Invalid password.";
    } else {
      errorMessage.value = "An error occurred. Please try again.";
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.login-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1.5rem;
  /* Red tinted gradient for admin area */
  background:
    radial-gradient(
      circle at top right,
      rgba(239, 68, 68, 0.15),
      transparent 50%
    ),
    radial-gradient(
      circle at bottom left,
      rgba(59, 130, 246, 0.1),
      transparent 50%
    );
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.header {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.logo-icon.admin {
  color: var(--danger-color);
  margin-bottom: 0.5rem;
  filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.5));
}

.header h1 {
  margin: 0;
  font-size: 2rem;
  background: linear-gradient(to right, #fff, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.admin-badge {
  font-size: 0.4em;
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger-color);
  padding: 4px 8px;
  border-radius: 6px;
  vertical-align: middle;
  margin-left: 8px;
  border: 1px solid rgba(239, 68, 68, 0.2);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.form-container {
  display: flex;
  flex-direction: column;
}

.step-form {
  display: flex;
  flex-direction: column;
}

.input-group {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 1.25rem;
  color: var(--text-muted);
  pointer-events: none;
}

.input-base.with-icon {
  padding-left: 3.5rem;
}

.tracking-widest {
  letter-spacing: 0.3em;
}

.text-lg {
  font-size: 1.25rem;
}

.error-msg {
  color: var(--danger-color);
  font-size: 0.875rem;
  background-color: rgba(239, 68, 68, 0.1);
  padding: 0.5rem;
  border-radius: var(--border-radius-sm);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
