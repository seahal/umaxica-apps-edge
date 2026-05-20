// Minimal type stub for org catch-all route
export namespace Route {
  export interface MetaArgs {
    data?: unknown;
    params: Record<string, string>;
    matches: unknown[];
  }

  export interface LoaderArgs {
    context: {
      cloudflare: {
        env: unknown;
        ctx: unknown;
      };
    };
    params: Record<string, string>;
    request: Request;
  }
}
