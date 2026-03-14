<script setup lang="ts">
import { ref, watch, onMounted } from "vue";

const router = useRouter();
const route = useRoute();
const step = ref<1 | 2>(1);
const email = ref("");
const code = ref("");
const isLoading = ref(false);
const errorMessage = ref("");

onMounted(() => {
  const queryEmail = route.query.email as string;
  if (queryEmail) {
    email.value = queryEmail;
    step.value = 2;
  }
});

const requestSuccess = ref(false);

const requestLoginToken = async () => {
  if (!email.value) return;
  isLoading.value = true;
  errorMessage.value = "";
  requestSuccess.value = false;

  try {
    await $fetch("/api/auth/request-code", {
      method: "POST",
      body: { email: email.value },
    });
    requestSuccess.value = true;
    step.value = 2;
  } catch (err: any) {
    errorMessage.value = err?.data?.message || "Ein Fehler ist aufgetreten.";
  } finally {
    isLoading.value = false;
  }
};
const verifyCode = async () => {
  if (!code.value) return;
  isLoading.value = true;
  errorMessage.value = "";

  try {
    await $fetch("/api/auth/verify", {
      method: "POST",
      body: { email: email.value, code: code.value },
    });
    // Success, redirect to home
    router.push("/");
  } catch (err: any) {
    errorMessage.value =
      err?.data?.message || "Falscher oder abgelaufener Code.";
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="login-wrapper animate-fade-in">
    <div class="glass-panel login-card">
      <div class="header">
        <LucideShoppingCart :size="48" class="logo-icon" />
        <h1>Listly</h1>
        <p>Gemeinsam einkaufen.</p>
      </div>

      <div class="form-container">
        <!-- Step 1: E-Mail -->
        <form
          @submit.prevent="requestLoginToken"
          v-if="step === 1"
          class="step-form"
        >
          <div class="input-group">
            <LucideMail class="input-icon" :size="20" />
            <input
              v-model="email"
              type="email"
              placeholder="Deine E-Mail Adresse"
              class="input-base with-icon"
              required
            />
          </div>
          <button
            type="submit"
            class="btn-primary mt-4"
            :disabled="isLoading || !email"
          >
            <LucideSend :size="18" v-if="!isLoading" />
            <LucideLoader :size="18" class="spin" v-else />
            <span>{{
              isLoading ? "Sende Link..." : "Login-Link anfordern"
            }}</span>
          </button>

          <p v-if="errorMessage" class="error-msg text-center mt-4">
            {{ errorMessage }}
          </p>
        </form>

        <!-- Step 2: Warten auf Link / Code Eingabe -->
        <div v-else class="step-form animate-fade-in">
          <div class="text-center mb-6">
            <div class="success-icon-wrapper mb-4">
              <LucideMail :size="32" class="text-accent" />
            </div>
            <h3 class="text-lg font-bold mb-2">E-Mail wurde gesendet!</h3>
            <p class="text-sm code-info">
              Wir haben einen Login-Link an <br /><strong>{{ email }}</strong>
              gesendet.<br /><br />
              Bitte klicke auf den Link in der E-Mail, um dich direkt
              einzuloggen.
            </p>
          </div>

          <div class="divider mb-6">
            <span>ODER</span>
          </div>

          <form @submit.prevent="verifyCode" class="flex flex-col">
            <p class="text-center mb-4 text-xs opacity-70">
              Code manuell eingeben:
            </p>
            <div class="input-group">
              <LucideKeyRound class="input-icon" :size="20" />
              <input
                v-model="code"
                type="text"
                placeholder="123456"
                class="input-base with-icon text-center tracking-widest text-lg"
                maxlength="6"
                required
              />
            </div>
            <button
              type="submit"
              class="btn-primary mt-4"
              :disabled="isLoading || code.length < 6"
            >
              <LucideCheckCircle :size="18" v-if="!isLoading" />
              <LucideLoader :size="18" class="spin" v-else />
              <span>{{ isLoading ? "Prüfe..." : "Einloggen" }}</span>
            </button>
          </form>

          <button
            type="button"
            class="btn-text mt-8 mx-auto"
            @click="step = 1"
            :disabled="isLoading"
          >
            <LucideArrowLeft :size="16" />
            E-Mail Adresse ändern
          </button>

          <p
            v-if="errorMessage"
            class="error-msg text-center mt-4 animate-fade-in"
          >
            {{ errorMessage }}
          </p>
        </div>
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
  /* Richer, more vibrant animated background gradient */
  /* Use themed background */
  background: var(--bg-color);
  background-image: 
    radial-gradient(
      circle at top right,
      rgba(59, 130, 246, 0.1),
      transparent 60%
    ),
    radial-gradient(
      circle at bottom left,
      rgba(16, 185, 129, 0.1),
      transparent 60%
    );
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  box-shadow: var(--shadow-md);
}

.header {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.logo-icon {
  color: var(--accent-color);
  margin-bottom: 0.5rem;
  filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.5));
}

.header h1 {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(to right, var(--text-main), var(--text-muted));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.025em;
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
  padding-left: 3rem;
}

.tracking-widest {
  letter-spacing: 0.5em;
  font-family: monospace;
}

.text-sm {
  font-size: 0.875rem;
}

.text-lg {
  font-size: 1.25rem;
}

.code-info {
  color: var(--text-muted);
  line-height: 1.6;
}
.code-info strong {
  color: var(--text-main);
}

.btn-text {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0.5rem;
  transition: all var(--transition-fast);
}

.btn-text:hover {
  color: var(--text-main);
  transform: translateX(-4px);
}

.mx-auto {
  margin-left: auto;
  margin-right: auto;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.success-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background-color: rgba(59, 130, 246, 0.1);
  border-radius: 50%;
  margin-bottom: 1.5rem;
}

.text-accent {
  color: var(--accent-color);
}

.font-bold {
  font-weight: 700;
}

.mb-2 {
  margin-bottom: 0.5rem;
}
.mb-4 {
  margin-bottom: 1rem;
}
.mb-6 {
  margin-bottom: 1.5rem;
}
.mb-8 {
  margin-bottom: 2rem;
}
.mt-8 {
  margin-top: 2rem;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.divider::before,
.divider::after {
  content: "";
  flex: 1;
  border-bottom: 1px solid var(--border-color);
}

.divider span {
  padding: 0 1rem;
}

.flex {
  display: flex;
}
.flex-col {
  flex-direction: column;
}
.text-xs {
  font-size: 0.75rem;
}
.opacity-70 {
  opacity: 0.7;
}
</style>
