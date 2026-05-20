// Generated type file for the org index route
export namespace Route {
  export interface LoaderData {
    codeName: string;
    message?: string;
  }

  export interface MetaArgs {
    data?: LoaderData;
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

  export interface ComponentProps {
    loaderData: LoaderData;
  }
}
