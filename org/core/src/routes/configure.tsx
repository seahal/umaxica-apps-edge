import type { Route } from './+types/home';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'configure' }, { content: 'Welcome to React Router!', name: 'description' }];
}

export function loader({ context }: Route.LoaderArgs) {
  const env =
    (context as unknown as { cloudflare?: { env?: Record<string, string> } })?.cloudflare?.env ??
    {};
  return { message: env.VALUE_FROM_CLOUDFLARE };
}

export default function About({ loaderData: _loaderData }: Route.ComponentProps) {
  return (
    <main className="p-4 container mx-auto">
      <h2>Configuration</h2>
      <ul>
        <li className="list-disc list-inside">
          acccount
          <ul className="list-disc list-inside pl-4">
            <li>change email</li>
            <li>delete account</li>
            <li>region</li>
          </ul>
        </li>
        <li className="list-disc list-inside">
          preferences
          <ul className="list-disc list-inside pl-4">
            <li>language</li>
            <li>timezone</li>
            <li>darkmode</li>
            <li>accesivility</li>
          </ul>
        </li>
      </ul>
    </main>
  );
}
