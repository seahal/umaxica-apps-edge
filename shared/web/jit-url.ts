const JIT_DOMAINS = ['APP', 'COM', 'ORG'] as const;
const JIT_WORKSPACES = ['CORE', 'DOCS', 'NEWS', 'HELP'] as const;

export type JitDomain = (typeof JIT_DOMAINS)[number];
export type JitWorkspace = (typeof JIT_WORKSPACES)[number];

export function getJitWorkspaceEnvName(domain: JitDomain, workspace: JitWorkspace) {
  return `JIT_${domain}_${workspace}_URL` as const;
}

function normalizeUrl(value: string | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function getProcessEnv(): Record<string, string | undefined> {
  return (
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
  );
}

export function getJitWorkspaceUrl(
  domain: JitDomain,
  workspace: JitWorkspace,
  env: Record<string, string | undefined> = getProcessEnv(),
) {
  return normalizeUrl(env[getJitWorkspaceEnvName(domain, workspace)]);
}
