// Virtual module declarations for React Router
declare module 'virtual:react-router/server-build' {
  export * from '@react-router/dev/server-build';
}

// Cloudflare context type augmentation for React Router
declare module 'react-router' {
  interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}
