export default defineNuxtRouteMiddleware(async (to, from) => {
  // During SSR, $fetch doesn't include browser cookies automatically.
  // We must forward them from the incoming request.
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : {};

  try {
    const response = await $fetch('/api/auth/me', { headers });
    if (!response || (!response.user && !response.isAdmin)) {
      return navigateTo('/login');
    }
  } catch (error) {
    return navigateTo('/login');
  }
});
