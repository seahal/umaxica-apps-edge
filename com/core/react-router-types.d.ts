// Minimal React Router type shims for the com site
declare module 'react-router' {
  export type EntryContext = Record<string, unknown>;

  export interface ServerRouterProps {
    context: EntryContext;
    url: string;
  }
  export function ServerRouter(props: ServerRouterProps): JSX.Element;

  // Hooks / helpers used in this project
  export function useLoaderData<T = unknown>(): T;
  export function useRouteLoaderData<T = unknown>(routeId: string): T | undefined;
  export function isRouteErrorResponse(
    error: unknown,
  ): error is { status: number; statusText?: string };

  export interface LinksProps {
    nonce?: string;
  }
  export function Links(props?: LinksProps): JSX.Element;
  export interface MetaProps {
    nonce?: string;
  }
  export function Meta(props?: MetaProps): JSX.Element;
  export function Outlet(): JSX.Element;
  export interface ScriptsProps {
    nonce?: string;
  }
  export function Scripts(props?: ScriptsProps): JSX.Element;
  export interface ScrollRestorationProps {
    nonce?: string;
  }
  export function ScrollRestoration(props?: ScrollRestorationProps): JSX.Element;

  export function Link(props: Record<string, unknown>): JSX.Element;
  export function NavLink(props: Record<string, unknown>): JSX.Element;
  export function redirect(url: string): Response;
  export function useLocation(): Location;

  export function createRequestHandler(
    ...args: unknown[]
  ): (request: Request, context: unknown) => Promise<Response>;

  export class RouterContextProvider {
    set(key: unknown, value: unknown): void;
  }

  export interface RoutesTestStubProps {
    initialEntries?: string[];
    initialIndex?: number;
    hydrationData?: Record<string, unknown>;
  }

  export function createRoutesStub(
    routes: {
      path?: string;
      index?: boolean;
      children?: unknown[];
      Component?: (props: { loaderData?: unknown }) => JSX.Element;
      loader?: () => unknown;
      action?: () => unknown;
      HydrateFallback?: () => JSX.Element;
      errorElement?: JSX.Element;
    }[],
  ): (props?: RoutesTestStubProps) => JSX.Element;

  export function MemoryRouter(props: {
    initialEntries?: string[];
    children?: React.ReactNode;
  }): JSX.Element;

  export namespace Route {
    export interface LoaderArgs {
      context: AppLoadContext;
      request: Request;
      params: Record<string, string>;
    }
    export interface ActionArgs {
      request: Request;
      context: AppLoadContext;
      params: Record<string, string>;
    }
    export interface MetaArgs {
      data?: unknown;
      params: Record<string, string>;
      location: Location;
      matches: unknown[];
    }
    export interface ComponentProps {
      loaderData?: unknown;
      params?: Record<string, string>;
      matches?: unknown[];
    }
    export interface ErrorBoundaryProps {
      error: unknown;
    }
    export type LinksFunction = () => {
      rel: string;
      href: string;
      [key: string]: string;
    }[];
  }

  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
    security?: {
      nonce?: string;
    };
  }
}
