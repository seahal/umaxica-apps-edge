import { createContext } from 'react-router';
import type { RouterContext } from 'react-router';

interface RuntimeContextValue {
  security?: {
    nonce?: string;
  };
  runtime?: {
    env?: Record<string, string | undefined>;
  };
}

const RuntimeContext = createContext<RuntimeContextValue>({});

interface RouterContextProvider {
  get<T>(context: RouterContext<T>): T | undefined;
  set<T>(context: RouterContext<T>, value: T): void;
}

function readRuntimeEnvValue(key: string): string | undefined {
  const processEnv =
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  const fromProcess = processEnv[key] ?? processEnv[`VITE_${key}`];
  if (fromProcess !== undefined) {
    return fromProcess;
  }

  const importEnv =
    (
      import.meta as ImportMeta & {
        env?: Record<string, string | undefined>;
      }
    ).env ?? {};

  return importEnv[key] ?? importEnv[`VITE_${key}`];
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCodePoint(...bytes));
}

function getProvider(context: unknown): RouterContextProvider | undefined {
  const provider = context as
    | { get?: unknown; set?: unknown }
    | RouterContextProvider
    | null
    | undefined;
  if (typeof provider?.get === 'function' && typeof provider?.set === 'function') {
    return provider as RouterContextProvider;
  }
  return undefined;
}

function getRuntimeContext(context: unknown): RuntimeContextValue {
  const provider = getProvider(context);
  if (provider) {
    return provider.get(RuntimeContext) ?? {};
  }
  return (context as RuntimeContextValue | null | undefined) ?? {};
}

export function getNonce(context: unknown): string {
  const runtimeContext = getRuntimeContext(context);
  if (runtimeContext.security?.nonce) {
    return runtimeContext.security.nonce;
  }

  const nonce = generateNonce();
  const provider = getProvider(context);
  if (provider) {
    provider.set(RuntimeContext, {
      ...runtimeContext,
      security: {
        ...runtimeContext.security,
        nonce,
      },
    });
    return nonce;
  }

  if (context && typeof context === 'object') {
    const mutableContext = context as RuntimeContextValue;
    mutableContext.security = {
      ...mutableContext.security,
      nonce,
    };
  }

  return nonce;
}

export function readEnv(context: unknown, key: string, fallback = ''): string {
  const runtimeContext = getRuntimeContext(context);
  const fromContext = runtimeContext.runtime?.env?.[key];
  if (fromContext !== undefined) {
    return fromContext.trim();
  }

  const fromRuntime = readRuntimeEnvValue(key);
  if (fromRuntime !== undefined) {
    return fromRuntime.trim();
  }

  return fallback.trim();
}
