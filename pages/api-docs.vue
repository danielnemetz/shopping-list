<script setup lang="ts">
const specUrl = '/openapi.yaml';

onMounted(() => {
  document.documentElement.classList.add('api-docs-scroll');
  document.body.classList.add('api-docs-scroll');
  if (import.meta.client && typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@4/swagger-ui.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/swagger-ui-dist@4/swagger-ui-bundle.js';
    script.async = true;
    script.onload = () => {
      const SwaggerUIBundle = (window as any).SwaggerUIBundle;
      if (SwaggerUIBundle) {
        SwaggerUIBundle({
          url: specUrl,
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIBundle.SwaggerUIStandalonePreset,
          ],
          layout: 'BaseLayout',
        });
      }
    };
    document.body.appendChild(script);
  }
});

onUnmounted(() => {
  document.documentElement.classList.remove('api-docs-scroll');
  document.body.classList.remove('api-docs-scroll');
});
</script>

<template>
  <div class="api-docs-page">
    <header class="api-docs-header">
      <NuxtLink to="/" class="back-link">← {{ $t('activity.back') }}</NuxtLink>
      <h1>API-Dokumentation</h1>
      <p class="subtitle">OpenAPI 3.0 · Listly</p>
    </header>
    <ClientOnly>
      <div id="swagger-ui" class="swagger-container" />
      <template #fallback>
        <div class="loading-docs">{{ $t('activity.loading') }}</div>
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
.api-docs-page {
  min-height: 100vh;
  width: 100%;
  background: var(--bg-color);
  padding-bottom: 2rem;
}

.api-docs-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-surface);
}

.back-link {
  display: inline-block;
  margin-bottom: 0.5rem;
  color: var(--accent-color);
  text-decoration: none;
  font-size: 0.9rem;
}

.back-link:hover {
  text-decoration: underline;
}

.api-docs-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.subtitle {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.swagger-container {
  width: 100%;
  max-width: 1460px;
  margin: 0 auto;
  padding: 1rem;
  min-height: 60vh;
}

.loading-docs {
  padding: 3rem;
  text-align: center;
  color: var(--text-muted);
}

:deep(.swagger-ui .topbar) {
  display: none;
}

:deep(.swagger-ui .information-container),
:deep(.swagger-ui .scheme-container) {
  margin: 0 0 1rem;
}
</style>
