export function loader() {
  throw new Error('My first Sentry error!');
}

export default function SentryTest() {
  return <div>Sentry Test</div>;
}
