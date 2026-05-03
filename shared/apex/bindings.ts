interface RateLimiter {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
}

export interface HealthRevision {
  id?: string;
  tag?: string;
  timestamp?: string;
}

export interface AssetEnv {
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
  BRAND_NAME?: string;
  RAILS_API_URL?: string;
  RATE_LIMITER?: RateLimiter;
  REVISION?: HealthRevision;
}

export interface ApexBindings {
  Bindings: AssetEnv;
}
