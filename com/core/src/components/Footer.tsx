import { Link, Tooltip, TooltipTrigger } from 'react-aria-components';

interface FooterProps {
  codeName?: string;
}

export function Footer({ codeName = '' }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-auto border-t border-gray-200 bg-gradient-to-b from-white to-gray-50 dark:border-gray-800 dark:from-gray-950 dark:to-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-12">
          {/* Brand section */}
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
              {codeName || '???'}
            </h3>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              最先端技術でモダンなWeb体験を構築
            </p>
          </div>

          {/* Quick links */}
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">
              クイックリンク
            </h4>
            <nav className="flex flex-col space-y-3">
              <TooltipTrigger delay={200}>
                <Link
                  href="/"
                  className="group inline-flex w-fit items-center text-sm text-gray-600 transition-all duration-300 hover:translate-x-1 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  <span className="relative">
                    ホーム
                    <span className="absolute bottom-0 left-0 h-px w-0 bg-current transition-all duration-300 group-hover:w-full" />
                  </span>
                </Link>
                <Tooltip className="animate-in fade-in zoom-in-95 rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white shadow-lg dark:bg-gray-100 dark:text-gray-900">
                  トップページに戻る
                </Tooltip>
              </TooltipTrigger>
              <TooltipTrigger delay={200}>
                <Link
                  href="https://jp.help.umaxica.com/contacts/new"
                  className="group inline-flex w-fit items-center text-sm text-gray-600 transition-all duration-300 hover:translate-x-1 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  <span className="relative">
                    お問い合わせ
                    <span className="absolute bottom-0 left-0 h-px w-0 bg-current transition-all duration-300 group-hover:w-full" />
                  </span>
                </Link>
                <Tooltip className="animate-in fade-in zoom-in-95 rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white shadow-lg dark:bg-gray-100 dark:text-gray-900">
                  ご質問・ご相談はこちら
                </Tooltip>
              </TooltipTrigger>
            </nav>
          </div>

          {/* Social & legal */}
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">
              つながる
            </h4>
            <div className="flex flex-wrap gap-4">
              <TooltipTrigger delay={0}>
                <Link
                  href="https://github.com/seahal/umaxica-app-edge"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-all duration-300 hover:scale-110 hover:rotate-6 hover:bg-gray-900 hover:text-white dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white dark:hover:text-gray-900"
                  aria-label="GitHub"
                >
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <title>GitHub</title>
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Link>
                <Tooltip className="animate-in fade-in zoom-in-95 rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white shadow-lg dark:bg-gray-100 dark:text-gray-900">
                  GitHubでソースコードを見る
                </Tooltip>
              </TooltipTrigger>
              <TooltipTrigger delay={0}>
                <Link
                  href="https://x.com/umaxica"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-all duration-300 hover:scale-110 hover:rotate-6 hover:bg-blue-500 hover:text-white dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-blue-500"
                  aria-label="Twitter"
                >
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <title>Twitter</title>
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </Link>
                <Tooltip className="animate-in fade-in zoom-in-95 rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white shadow-lg dark:bg-gray-100 dark:text-gray-900">
                  Twitterでフォロー
                </Tooltip>
              </TooltipTrigger>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 animate-in fade-in duration-700 delay-500 border-t border-gray-200 pt-8 dark:border-gray-800">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              © {currentYear} {codeName || 'Umaxica'}.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <TooltipTrigger delay={200}>
                <Link
                  href="https://jp.docs.umaxica.com/privacy"
                  className="text-sm text-gray-600 transition-all duration-200 hover:scale-105 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  プライバシーポリシー
                </Link>
                <Tooltip className="animate-in fade-in zoom-in-95 rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white shadow-lg dark:bg-gray-100 dark:text-gray-900">
                  個人情報の取り扱いについて
                </Tooltip>
              </TooltipTrigger>
              <TooltipTrigger delay={200}>
                <Link
                  href="https://jp.docs.umaxica.com/privacy"
                  className="text-sm text-gray-600 transition-all duration-200 hover:scale-105 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  利用規約
                </Link>
                <Tooltip className="animate-in fade-in zoom-in-95 rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white shadow-lg dark:bg-gray-100 dark:text-gray-900">
                  サービス利用の規約
                </Tooltip>
              </TooltipTrigger>
              <TooltipTrigger delay={200}>
                <Link
                  href="https://status.umaxica.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 transition-all duration-200 hover:scale-105 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  ステータス
                </Link>
              </TooltipTrigger>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent animate-pulse dark:via-gray-700" />
    </footer>
  );
}
