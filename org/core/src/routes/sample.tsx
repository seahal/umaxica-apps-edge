import type { Route } from './+types/sample';

export function meta(_: Route.MetaArgs) {
  return [
    { title: 'sample - Umaxica Org' },
    { content: 'About this organization site', name: 'description' },
  ];
}

export default function Sample() {
  return (
    <main className="p-4 container mx-auto">
      <h2 className="text-lg font-semibold">Sample</h2>
      <p className="mt-2">This is the about page for the org site.</p>
    </main>
  );
}
