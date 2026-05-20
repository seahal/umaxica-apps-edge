import type { ReactNode } from 'react';

/**
 * 設定セクションのコンテナ
 */
export function SettingSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-800">{children}</div>
    </section>
  );
}

/**
 * 設定項目のコンテナ
 */
export function SettingItem({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="p-6 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 dark:text-gray-100">{label}</div>
        {description && (
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</div>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

/**
 * 設定ページのレイアウト
 */
export function SettingLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          {description && <p className="mt-2 text-gray-600 dark:text-gray-400">{description}</p>}
        </div>

        {/* コンテンツ */}
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
