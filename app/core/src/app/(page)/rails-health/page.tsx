import { checkRailsHealth } from '../../../lib/rails-health';
import { connection } from 'next/server';
import { getRailsClient } from '@/lib/rails-client';
import { getJitWorkspaceUrl } from '@/lib/jit-url';
import { RailsHealthView } from './rails-health';

export default async function RailsHealthPage() {
  await connection();
  const result = await checkRailsHealth(getRailsClient());
  const workspaceUrl = getJitWorkspaceUrl('APP', 'CORE');

  return <RailsHealthView result={result} workspaceUrl={workspaceUrl} />;
}
