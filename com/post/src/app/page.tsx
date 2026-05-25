export default function Home() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">UMAXICA Post</p>
        <h1>Next.js on Cloudflare Workers</h1>
        <p className="copy">
          This package is ready for a Rails-backed frontend. The API bridge is available under{' '}
          <code>/api/rails/*</code> and can be wired to Workers VPC later.
        </p>
      </section>
    </main>
  );
}
