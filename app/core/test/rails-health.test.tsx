import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RailsHealthView } from '../src/app/(page)/rails-health/rails-health';
import type { RailsHealthResult } from '../src/lib/rails-health';

const okResult: RailsHealthResult = { kind: 'ok', status: 200 };
const httpErrorResult: RailsHealthResult = { kind: 'http-error', status: 503 };
const unreachableResult: RailsHealthResult = {
  kind: 'unreachable',
  errorMessage: 'connect ECONNREFUSED',
};
const notConfiguredResult: RailsHealthResult = { kind: 'not-configured' };

describe('app/core rails health view', () => {
  it('renders the ok view with only a bounded status', () => {
    const html = renderToStaticMarkup(
      <RailsHealthView result={okResult} workspaceUrl="http://localhost:5171" />,
    );

    expect(html).toContain('Rails health is reachable');
    expect(html).toContain('Status: 200');
    expect(html).toContain('Workspace URL: http://localhost:5171');
  });

  it('renders the http-error view with only the status class, no body', () => {
    const html = renderToStaticMarkup(
      <RailsHealthView result={httpErrorResult} workspaceUrl={null} />,
    );

    expect(html).toContain('Rails responded with an error');
    expect(html).toContain('Status: HTTP 503');
  });

  it('renders the unreachable view', () => {
    const html = renderToStaticMarkup(
      <RailsHealthView result={unreachableResult} workspaceUrl={null} />,
    );

    expect(html).toContain('Rails is unreachable');
    expect(html).toContain('connect ECONNREFUSED');
  });

  it('renders the not-configured view', () => {
    const html = renderToStaticMarkup(
      <RailsHealthView result={notConfiguredResult} workspaceUrl={null} />,
    );

    expect(html).toContain('Rails VPC binding is not configured');
    expect(html).toContain('UMAXICA_APPS_EDGE_CF_WORKERS_VPC');
  });
});
