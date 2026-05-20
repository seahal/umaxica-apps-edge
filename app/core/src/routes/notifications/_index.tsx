/* eslint-disable import/no-named-export, import/no-relative-parent-imports */
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import type { Route } from '../+types/home';
import type { ReactNode } from 'react';
import { getEnv } from '../../context';

// Local definition of MetaDescriptor if the import is failing
type MetaDescriptor =
  | { charSet: 'utf-8' }
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }
  | { httpEquiv: string; content: string }
  | { 'set-cookie': string }
  | { [name: string]: unknown };

export function meta(_: Route.MetaArgs): MetaDescriptor[] {
  return [{ content: 'Welcome to React Router!', name: 'description' }];
}

export function loader({ context }: Route.LoaderArgs): { message: string } {
  const env = getEnv(context);
  return {
    message: env.VALUE_FROM_CLOUDFLARE ?? '',
  };
}

export default function Index(_: Route.ComponentProps): React.JSX.Element {
  return (
    <main className="p-4 container mx-auto">
      <h2>Notification</h2>
      <p>underconstrution...</p>
    </main>
  );
}
