export function loader() {
  throw new Error('Intentional /about error for Sentry DSN verification');
}

export default function About() {
  return <div>About</div>;
}
