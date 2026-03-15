/**
 * In production, block access to API docs and the OpenAPI spec.
 * Keeps the endpoint and spec available in development only.
 */
export default defineEventHandler((event) => {
  if (process.env.NODE_ENV !== 'production') return;

  const path = (event.path || event.node?.req?.url?.split('?')[0] || '').replace(/\/$/, '') || '/';
  if (path === '/api-docs' || path === '/openapi.yaml') {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' });
  }
});
