import { Link } from '@tanstack/react-router';

const CANONICAL_HOME_URL = 'https://jp.umaxica.com/';

/**
 * The UMAXICA application shell footer, in two layers:
 *
 *   utility navigation  (About)
 *   site identity       (© year UMAXICA)
 *
 * The utility navigation links only to surfaces that exist on this unit.
 * There is no privacy or
 * terms route anywhere in this repository and no reusable legal text to build
 * one from, so neither is linked — a plausible dead link is worse than a
 * missing one.
 *
 * Both rows wrap rather than reflow: `flex-wrap` gives `copyright ⟷ URL` on a
 * wide viewport and copyright above URL on a narrow one without a media query,
 * which is why the footer needs no breakpoint of its own.
 */

export type FooterLabels = {
  brand: string;
  utilityNav: string;
  about: string;
};

// Read once per isolate, not per render: react(purity) forbids impure calls in
// render, and the copyright year does not need request-time precision.
const COPYRIGHT_YEAR = new Date().getUTCFullYear();

export function SiteFooter({ labels }: Readonly<{ labels: FooterLabels }>) {
  return (
    <footer className="col-span-full border-t border-gray-200 bg-white py-4">
      <nav
        className="mx-auto flex w-full max-w-7xl flex-wrap gap-x-6 px-4 wide:px-8"
        aria-label={labels.utilityNav}
      >
        <Link className="inline-flex min-h-11 items-center text-sm text-brand" to="/about">
          {labels.about}
        </Link>
      </nav>
      <p className="mx-auto flex w-full max-w-7xl flex-wrap justify-between gap-2 px-4 text-sm text-gray-600 wide:px-8">
        <span>
          © {COPYRIGHT_YEAR} {labels.brand}
        </span>
        <a className="text-brand" href={CANONICAL_HOME_URL}>
          {CANONICAL_HOME_URL}
        </a>
      </p>
    </footer>
  );
}
