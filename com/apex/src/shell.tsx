/** @jsxImportSource hono/jsx */
import type { Child } from 'hono/jsx';

const CANONICAL_HOME_URL = 'https://umaxica.com/';

/**
 * The UMAXICA application shell, as this unit renders it.
 *
 *   header (brand + actions) · [main navigation] · main · footer (utility nav + identity)
 *
 * The contract is the semantics, the hierarchy and the behaviour — not the
 * component. Every deployment unit owns its own copy, because a unit that
 * imports a sibling cannot be extracted into its own repository
 * (`test/deployment-unit-boundaries.test.ts`), and a shared UI package would
 * couple five independently deployed Workers to one release.
 *
 * This unit renders no main navigation: it serves a single page, and inventing
 * destinations that do not exist would produce dead links.
 */

type ShellLabels = {
  skipToContent: string;
  utilityNav: string;
  about: string;
};

const LABELS: Record<'en' | 'ja', ShellLabels> = {
  en: {
    skipToContent: 'Skip to main content',
    utilityNav: 'Utility navigation',
    about: 'About',
  },
  ja: {
    skipToContent: '本文へスキップ',
    utilityNav: 'ユーティリティナビゲーション',
    about: 'このサイトについて',
  },
};

function labelsFor(language: string | undefined): ShellLabels {
  return language === 'ja' ? LABELS.ja : LABELS.en;
}

/**
 * Brand is a link to this edition's homepage and deliberately not an `<h1>`:
 * the `<h1>` belongs to the page, inside `<main>`.
 */
export function SiteHeader({ brandName }: { brandName: string }) {
  return (
    <header class="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div class="mx-auto flex min-h-14 w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4">
        <a class="inline-flex min-h-11 items-center text-xl font-bold tracking-wide" href="/">
          {brandName}
        </a>
        {/*
         * Actions slot. Empty today by design — Search, Preferences, Account
         * and a Menu disclosure belong here when those surfaces exist, and a
         * control that toggles nothing is worse than no control at all.
         */}
        <div class="flex min-h-11 items-center gap-2" />
      </div>
    </header>
  );
}

export function SiteFooter({
  brandName,
  year,
  language,
}: {
  brandName: string;
  year: number;
  language: string | undefined;
}) {
  const labels = labelsFor(language);

  return (
    <footer class="mt-auto border-t border-gray-200 bg-white py-4 dark:border-gray-800 dark:bg-gray-900">
      <nav
        class="mx-auto flex w-full max-w-7xl flex-wrap gap-x-6 px-4"
        aria-label={labels.utilityNav}
      >
        <a class="inline-flex min-h-11 items-center text-sm text-brand" href="/about">
          {labels.about}
        </a>
      </nav>
      <p class="mx-auto flex w-full max-w-7xl flex-wrap justify-between gap-2 px-4 text-sm text-gray-600 dark:text-gray-400">
        <span>
          &copy; {year} {brandName}
        </span>
        <a class="text-brand" href={CANONICAL_HOME_URL}>
          {CANONICAL_HOME_URL}
        </a>
      </p>
    </footer>
  );
}

/**
 * The first focusable element in the document, so a keyboard or switch user can
 * reach `<main>` without tabbing through the header (contract §12).
 *
 * Not exported: it is placed once, by `AppShell`, and the contract requires it
 * to be first in the document — an export would invite a second placement.
 *
 * Hidden by translating itself off the top edge rather than by `sr-only`. Both
 * keep the link in the accessibility tree and focusable, which `display: none`
 * and `visibility: hidden` would not, but `sr-only` has to be undone by
 * `not-sr-only`, whose `position: static` then has to be overridden back to
 * `absolute` in the same variant — two utilities fighting over one property,
 * decided by the order Tailwind happens to emit them in. The two `translate`
 * utilities below set one custom property, and the focused one compiles to
 * `.focus\:translate-y-0:focus` — a pseudo-class the base class does not carry
 * — so it wins on specificity rather than on emission order. Checked against
 * the compiled stylesheet, not assumed.
 *
 * There is deliberately no `transition`: an instant position change is not
 * motion, so §12's reduced-motion precondition stays vacuous.
 */
function SkipLink({ label }: { label: string }) {
  return (
    <a
      class="absolute top-0 left-4 z-50 inline-flex min-h-11 -translate-y-full items-center rounded-b-lg border border-t-0 border-gray-200 bg-white px-4 text-brand focus:translate-y-0 dark:border-gray-800 dark:bg-gray-900"
      href="#main-content"
    >
      {label}
    </a>
  );
}

export function AppShell({
  brandName,
  year,
  language,
  children,
}: {
  brandName: string;
  year: number;
  language: string | undefined;
  children?: Child;
}) {
  return (
    <>
      <SkipLink label={labelsFor(language).skipToContent} />
      <SiteHeader brandName={brandName} />
      {/*
       * `tabindex="-1"` is what makes the skip link move focus rather than only
       * scroll: without it the browser jumps to the fragment and leaves focus
       * on the link, so the next Tab returns to the header the reader just
       * skipped. It draws no ring on click, because the focus rule in
       * `style.css` is `:focus-visible` rather than `:focus`.
       */}
      <main class="mx-auto w-full max-w-7xl grow px-4 py-8" id="main-content" tabindex={-1}>
        {children}
      </main>
      <SiteFooter brandName={brandName} year={year} language={language} />
    </>
  );
}
