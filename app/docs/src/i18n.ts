/*
 * This unit's language machinery and shell vocabulary — byte-identical across
 * all twelve frames (like `src/i18n/config.ts` was, only wider).
 *
 * The TanStack unit carried `export const defaultLocale = 'ja'` and every UI
 * string as an inline Japanese literal. The Astro build adds `en` as a real
 * second locale (plan: "Astro 移行と同時に実装"). Page copy that varies by frame
 * (info / news / docs / help) stays in the route components, exactly as it did
 * in `routes/index.tsx` and `routes/about.tsx`; this file holds only what every
 * frame shares. `<html lang>` always agrees with the routed locale.
 *
 * Region (jp/us) is orthogonal and lives in `lib/canonical.ts` — a build-time
 * origin choice, not a translation.
 */

export const LOCALES = ['ja', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ja';

export function isLocale(value: string | undefined): value is Locale {
  return value === 'ja' || value === 'en';
}

/**
 * Negotiate a locale from an `Accept-Language` header. No default is assumed; a
 * request that expresses no preference for either supported language falls back
 * to `DEFAULT_LOCALE`.
 */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .toLowerCase()
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag, q: q === undefined ? 1 : Number(q) };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    if (!tag) continue;
    if (tag.startsWith('ja')) return 'ja';
    if (tag.startsWith('en')) return 'en';
  }
  return DEFAULT_LOCALE;
}

interface ShellStrings {
  htmlDir: 'ltr';
  skipToMain: string;
  brand: string;
  utilityNavLabel: string;
  aboutLink: string;
  offline: { title: string; heading: string; body: string; reload: string };
  serverError: {
    title: string;
    heading: string;
    body: string;
    statusPage: string;
    status: string;
  };
  notFound: { title: string; heading: string; status: string; backHome: string };
}

export const SHELL: Record<Locale, ShellStrings> = {
  ja: {
    htmlDir: 'ltr',
    skipToMain: '本文へスキップ',
    brand: 'UMAXICA',
    utilityNavLabel: 'ユーティリティナビゲーション',
    aboutLink: 'このサイトについて',
    offline: {
      title: 'オフライン',
      heading: 'オフラインです',
      body: 'ネットワーク接続を確認して再読み込みしてください。',
      reload: '再読み込み',
    },
    serverError: {
      title: 'サーバーエラー',
      heading: 'サーバーエラーです',
      body: '一時的にページを表示できません。稼働状況はステータスページで確認できます。',
      statusPage: '稼働状況を見る',
      status: 'HTTP 500',
    },
    notFound: {
      title: 'ページが見つかりません',
      heading: 'ページが見つかりません',
      status: 'HTTP 404',
      backHome: 'トップへ戻る',
    },
  },
  en: {
    htmlDir: 'ltr',
    skipToMain: 'Skip to main content',
    brand: 'UMAXICA',
    utilityNavLabel: 'Utility navigation',
    aboutLink: 'About this site',
    offline: {
      title: 'Offline',
      heading: 'You are offline',
      body: 'Check your network connection and reload the page.',
      reload: 'Reload',
    },
    serverError: {
      title: 'Server error',
      heading: 'Server error',
      body: 'This page cannot be shown right now. Check the status page for updates.',
      statusPage: 'View system status',
      status: 'HTTP 500',
    },
    notFound: {
      title: 'Page not found',
      heading: 'Page not found',
      status: 'HTTP 404',
      backHome: 'Back to top',
    },
  },
};

/** Page copy that varies by frame. Each route component supplies one of these. */
export interface PageCopy {
  siteName: string;
  title: string;
  heading: string;
  description: string;
  paragraphs: string[];
}
