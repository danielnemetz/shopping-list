declare module 'h3' {
  interface SessionData {
    userId?: string;
    isAdmin?: boolean;
  }
}

declare module 'vue3-emoji-picker' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

export {}
