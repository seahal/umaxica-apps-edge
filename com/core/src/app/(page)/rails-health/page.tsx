import { checkRailsHealth } from '../../../../../../shared/cloudflare/rails-health';
import { getRailsClient } from '@/lib/rails-client';
import { getJitWorkspaceUrl } from '@/lib/jit-url';
import { RailsHealthView } from './rails-health';

export const dynamic = 'force-dynamic';

export default async function RailsHealthPage() {
  const result = await checkRailsHealth(getRailsClient());
  const workspaceUrl = getJitWorkspaceUrl('COM', 'CORE');

  return <RailsHealthView result={result} workspaceUrl={workspaceUrl} />;
}
