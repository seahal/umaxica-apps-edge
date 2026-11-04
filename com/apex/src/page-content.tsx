/** @jsxImportSource hono/jsx */
import type { Child } from 'hono/jsx';

import { BRAND_TLD, buildBrandTitle, DEFAULT_BRAND_NAME } from './brand';
import type { AssetEnv } from './security-headers';

const ABOUT_DESCRIPTION =
  'umaxica.com is a UMAXICA platform domain. Services and content are available on dedicated subdomains';

const ABOUT_CANONICAL_URL = 'https://umaxica.com/about';
const ABOUT_ROBOTS = 'index,follow';

/**
 * A UMAXICA domain and what it is for.
 *
 * A host name is an identifier the reader may retype into an address bar, not
 * running copy, so it is set in the monospace family throughout this unit —
 * here, in the homepage heading, and in the health document's data column. The
 * purpose beside it is prose and stays in the body face. That split is the one
 * typographic decision this surface carries: everything else is the shared
 * token set in docs/design/ui-shell-contract.md §9.
 *
 * `--font-mono` is Tailwind's stock stack rather than a token declared in
 * `@theme`. Unlike `--font-sans`, which is named explicitly because Japanese
 * body text depends on which face resolves, every string set in mono here is
 * ASCII — a host name or a version id — so the stock stack has nothing to get
 * wrong and this unit still downloads no font.
 */
type DomainEntry = {
  host: string;
  purpose: string;
};

/**
 * The sibling domains, as a directory rather than a bullet list.
 *
 * This is the substance of the page: an apex host exists to say which UMAXICA
 * domain you are on and where the others are. A bare `<ul>` of underlined
 * links gave that no more weight than a footnote, and gave a phone user a
 * target the height of one line of text.
 *
 * Each row is one link covering the whole row — `min-h-11` is the 44px target
 * from §9 — with the host and its purpose on one baseline. It wraps to two
 * lines on a narrow viewport by `flex-wrap` alone, so this adds no media query
 * and §11's "apex emits none at all" still holds.
 *
 * The hover state is a surface step to `bg-white`, the same surface the header
 * and footer sit on, plus an underline on the host. Both are inside
 * `group-hover` so that hovering anywhere on the row — including the purpose
 * text, which is not itself a link — shows the whole row is the target. The
 * negative margin bleeds that surface past the text column so the copy above
 * and the host names below stay on one left edge.
 */
function DomainList({ entries }: { entries: readonly DomainEntry[] }) {
  return (
    <ul class="-mx-3 flex max-w-prose flex-col">
      {entries.map((entry) => (
        <li key={entry.host}>
          <a
            class="group flex min-h-11 flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg px-3 py-2.5 hover:bg-white dark:hover:bg-gray-900"
            href={`https://${entry.host}`}
          >
            <span class="font-mono text-brand underline-offset-2 group-hover:underline">
              {entry.host}
            </span>
            <span class="text-sm text-gray-600 dark:text-gray-400">{entry.purpose}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * The page's single `<h1>`, which the shell deliberately does not own: the
 * brand in the header is a link, never a heading (contract §3).
 *
 * `tracking-tight` because heading letter-spacing closes at large sizes, and
 * `text-wrap: balance` is already on every heading from `style.css`.
 */
function PageTitle({ children }: { children: Child }) {
  return <h1 class="text-3xl leading-heading font-semibold tracking-tight">{children}</h1>;
}

/**
 * The page is one column with a reading measure, not the shell's full 80rem.
 * `<main>` carries `max-w-7xl` because the header and footer rows do; body copy
 * set that wide runs past 150 characters a line, which is roughly twice what is
 * readable. `max-w-prose` is Tailwind's stock 65ch and needs no new token.
 *
 * Spacing is parent `gap` rather than the `space-y-*` this replaced: `space-y`
 * puts a margin on every child but the first, which collapses against
 * neighbours and has to be re-tuned whenever an element is added or removed.
 */
function PageBody({ children }: { children: Child }) {
  return <div class="flex flex-col gap-8">{children}</div>;
}

function localeOf(language: string | undefined): 'en' | 'ja' {
  return language === 'ja' ? 'ja' : 'en';
}

const ABOUT_DOMAINS: Record<'en' | 'ja', readonly DomainEntry[]> = {
  en: [
    { host: 'umaxica.app', purpose: 'Service' },
    { host: 'umaxica.org', purpose: 'Staff' },
  ],
  ja: [
    { host: 'umaxica.app', purpose: 'サービス' },
    { host: 'umaxica.org', purpose: 'スタッフ' },
  ],
};

function buildApexTitle(_env: AssetEnv, pageName: string): string {
  return buildBrandTitle(pageName, { brandName: DEFAULT_BRAND_NAME, tld: BRAND_TLD });
}

export function getAboutMeta(env: AssetEnv, language?: string) {
  return {
    title: buildApexTitle(env, language === 'ja' ? 'このサイトについて' : 'About'),
    description: ABOUT_DESCRIPTION,
    canonical: ABOUT_CANONICAL_URL,
    robots: ABOUT_ROBOTS,
  };
}

/*
 * Two things on this page were wrong rather than merely plain, and both are
 * worth recording because the wrong version read as perfectly ordinary copy.
 *
 * The host is set as mono text, not as a link to itself. It used to be an
 * `<a>` pointing at this very origin, which everywhere was a control returning
 * the reader to where they already are. It is a label now, which is what it
 * always was.
 *
 * And the page no longer claims the domain "is not operated as a public-facing
 * website", because on none of the five was that true. On the three
 * redirectors `/` answers 302 to a regional host, so this domain is exactly
 * how a visitor reaches the service; on `net` and `dev` it serves an
 * `index,follow` homepage of its own. The sentence also contradicted the
 * `<meta name="description">` this same page emits — "a UMAXICA platform
 * domain. Services and content are..." — so the page disagreed with itself in
 * a way only a reader comparing the two would ever notice. The body now says
 * what the description says.
 */
export function renderAboutContent(language: string | undefined) {
  const locale = localeOf(language);

  return (
    <PageBody>
      <div class="flex flex-col gap-3">
        <PageTitle>{locale === 'ja' ? 'このサイトについて' : 'About this site.'}</PageTitle>
        <p class="max-w-prose text-xl">
          {locale === 'ja' ? (
            <>
              本ドメイン（<span class="font-mono">umaxica.com</span>
              ）は、UMAXICA
              のプラットフォームドメインでございます。トップページへアクセスされますと、ご利用の地域に応じた公式サイトへ転送いたします。
            </>
          ) : (
            <>
              <span class="font-mono">umaxica.com</span> is a UMAXICA platform domain. Opening it
              takes you to the regional site for your area.
            </>
          )}
        </p>
      </div>
      <div class="flex flex-col gap-2">
        <p class="max-w-prose">
          {locale === 'ja'
            ? 'その他のサービスにつきましては、下記の公式ウェブサイトをご利用ください。'
            : 'Our other services have sites of their own.'}
        </p>
        <DomainList entries={ABOUT_DOMAINS[locale]} />
      </div>
    </PageBody>
  );
}
