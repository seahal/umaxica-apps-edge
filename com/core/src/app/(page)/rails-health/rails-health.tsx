import type { RailsHealthResult } from '../../../../../../shared/cloudflare/rails-health';

function renderStateHeading(result: RailsHealthResult) {
  switch (result.kind) {
    case 'ok':
      return 'Rails health is reachable';
    case 'http-error':
      return 'Rails responded with an error';
    case 'unreachable':
      return 'Rails is unreachable';
    case 'not-configured':
      return 'Rails VPC binding is not configured';
  }
}

function renderStateDetails(result: RailsHealthResult) {
  switch (result.kind) {
    case 'ok':
      return <p className="health-note">Status: {result.status}</p>;
    case 'http-error':
      return <p className="health-note">Status: HTTP {result.status}</p>;
    case 'unreachable':
      return (
        <>
          <p className="health-note">Request failed before a response arrived.</p>
          <p className="health-error">{result.errorMessage}</p>
        </>
      );
    case 'not-configured':
      return (
        <p className="health-error">
          The <code>UMAXICA_APPS_EDGE_CF_WORKERS_VPC</code> binding is not available in this
          environment.
        </p>
      );
  }
}

export function RailsHealthView({
  result,
  workspaceUrl,
}: {
  result: RailsHealthResult;
  workspaceUrl: string | null;
}) {
  return (
    <main className="page-main health-page">
      <section className="health-hero">
        <p className="health-eyebrow">Diagnostics</p>
        <h1>Rails /health/liveness.json</h1>
        <p className="health-description">
          This page checks the Rails health endpoint over the private Workers VPC binding and shows
          a bounded reachability result. Response bodies are never rendered here.
        </p>
        {workspaceUrl ? <p className="health-workspace">Workspace URL: {workspaceUrl}</p> : null}
      </section>

      <section className="health-card">
        <div className="health-meta">
          <span className="health-pill">{renderStateHeading(result)}</span>
        </div>
        {renderStateDetails(result)}
      </section>
    </main>
  );
}

export type { RailsHealthResult };
