<script setup lang="ts">
import { ref, onMounted } from "vue";
const route = useRoute();
const router = useRouter();
const isLoading = ref(true);
const errorMessage = ref("");

onMounted(async () => {
  const email = route.query.email as string;
  const code = route.query.code as string;

  if (!email || !code) {
    errorMessage.value = "Ungültiger oder unvollständiger Anmeldelink.";
    isLoading.value = false;
    return;
  }

  try {
    await $fetch("/api/auth/verify", {
      method: "POST",
      body: { email, code },
    });
    // Success, redirect to home
    router.push("/");
  } catch (err: any) {
    errorMessage.value =
      err?.data?.message ||
      "Anmeldung fehlgeschlagen. Der Link ist möglicherweise abgelaufen.";
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="login-wrapper animate-fade-in">
    <div class="glass-panel login-card text-center">
      <div v-if="isLoading" class="loading-state">
        <LucideLoader class="spin logo-icon mb-4" :size="48" />
        <h2 class="text-xl font-bold">Anmeldung läuft...</h2>
        <p class="text-muted mt-2">Wir verifizieren deine Daten.</p>
      </div>

      <div v-else class="error-state">
        <LucideXCircle class="logo-icon error mb-4" :size="48" />
        <h2 class="text-xl font-bold">Hoppla!</h2>
        <p class="error-msg mt-4">{{ errorMessage }}</p>
        <NuxtLink
          to="/login"
          class="btn-primary mt-6 inline-block no-underline"
        >
          Zurück zum Login
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1.5rem;
  background:
    linear-gradient(135deg, #0f172a 0%, #1e293b 100%),
    radial-gradient(
      circle at top right,
      rgba(59, 130, 246, 0.25),
      transparent 60%
    ),
    radial-gradient(
      circle at bottom left,
      rgba(16, 185, 129, 0.15),
      transparent 60%
    );
  background-blend-mode: screen;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 3rem 2rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.logo-icon {
  color: var(--accent-color);
  margin: 0 auto;
}

.logo-icon.error {
  color: var(--danger-color);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-msg {
  color: var(--danger-color);
  background: rgba(239, 68, 68, 0.1);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.2);
}
</style>
