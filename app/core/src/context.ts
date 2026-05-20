// Local definitions for RouterContext since they might not be correctly exported/picked up from react-router in all environments
export interface RouterContext<T> {
  readonly name: string;
  readonly _type: T;
}

export function createContext<T>(name: string): RouterContext<T> {
  return { name } as unknown as RouterContext<T>;
}

export interface CloudflareContextValue {
  cloudflare?: {
    env?: Env;
    ctx?: ExecutionContext;
  };
  security?: {
    nonce?: string;
  };
}

export const CloudflareContext = createContext<CloudflareContextValue>('CloudflareContext');

export function getEnv(context: unknown): Env {
  const provider = context as RouterContextProvider | null | undefined;
  const cloudflareContext = provider?.get?.(CloudflareContext);
  const env = cloudflareContext?.cloudflare?.env;
  if (!env) {
    throw new Error(
      'Cloudflare environment is not available. Ensure the request is handled by a Cloudflare Worker.',
    );
  }
  return env;
}

export function getNonce(context: unknown): string {
  const provider = context as RouterContextProvider | null | undefined;
  const cloudflareContext = provider?.get?.(CloudflareContext);
  return cloudflareContext?.security?.nonce ?? '';
}

export interface RouterContextProvider {
  get<T>(context: RouterContext<T>): T | undefined;
  set<T>(context: RouterContext<T>, value: T): void;
}
