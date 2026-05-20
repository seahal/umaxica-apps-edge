// Generated type file
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
      security?: {
        nonce?: string;
      };
    };
    params: Record<string, string>;
    request: Request;
  }

  export interface ComponentProps {
    children?: React.ReactNode;
  }

  export type LinksFunction = () => Array<{
    rel: string;
    href: string;
    crossOrigin?: string;
  }>;

  export interface ErrorBoundaryProps {
    error: unknown;
  }
}
