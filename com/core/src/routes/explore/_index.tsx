import { useMemo, useState } from 'react';
import {
  Button,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  SearchField,
  Tag,
  TagGroup,
  TagList,
} from 'react-aria-components';
import type { Selection } from 'react-aria-components';
import { getEnv } from '../../context';
import type { Route } from '../+types/home';

type ExploreCategory = 'products' | 'people' | 'signals' | 'playbooks';

interface ExploreResult {
  id: string;
  title: string;
  summary: string;
  category: ExploreCategory;
  tags: string[];
  signal: string;
}

const filters = [
  { id: 'all', label: 'すべて' },
  { id: 'products', label: 'プロダクト' },
  { id: 'people', label: '担当者' },
  { id: 'signals', label: 'シグナル' },
  { id: 'playbooks', label: 'プレイブック' },
] as const;

const exploreLibrary: ExploreResult[] = [
  {
    category: 'products',
    id: 'edge-discovery',
    signal: '推奨度 92',
    summary: 'エッジで完結する顧客データ収集テンプレート。即時に信号化して施策へ転換できます。',
    tags: ['Workers', 'AI', 'Realtime'],
    title: 'Edge Discovery Kit',
  },
  {
    category: 'products',
    id: 'atlas-console',
    signal: 'アクティブ',
    summary: '複数ブランドの施策状況を1画面で監視。権限や地域ラベルを跨いだ横断検索が可能です。',
    tags: ['Observability', 'Access'],
    title: 'Atlas Console',
  },
  {
    category: 'people',
    id: 'team-liaison',
    signal: '応答 < 4h',
    summary:
      '顧客伴走に特化したコンシェルジュチーム。成功ナレッジをテンプレ化し、再現度を高めます。',
    tags: ['Account', 'Enablement'],
    title: 'Client Liaison Squad',
  },
  {
    category: 'playbooks',
    id: 'signal-hygiene',
    signal: '週次更新',
    summary: '取得したデータをノイズレスに保つための日次チェックリスト。自動化タスク例も付属。',
    tags: ['Ops', 'Checklist'],
    title: 'Signal Hygiene Protocol',
  },
  {
    category: 'signals',
    id: 'latency-graph',
    signal: '83ms / JP',
    summary: '地域別の応答時間をリアルタイムで可視化し、逸脱を検知するとSlackに通知します。',
    tags: ['Monitoring', 'Alert'],
    title: 'Latency Pulse',
  },
  {
    category: 'playbooks',
    id: 'handoff-kit',
    signal: 'v2.4',
    summary:
      '営業から成功支援チームへの引き継ぎテンプレ。背景・チャネル・KPIの抽象度を合わせます。',
    tags: ['Template', 'Alignment'],
    title: 'Handoff Narrative Kit',
  },
];

const savedViews = [
  {
    description: 'アジア・北米リージョンでレイテンシが基準内のエッジだけを抽出します。',
    id: 'latency',
    title: 'Latency under 90ms',
  },
  {
    description: 'QA完了・コンテンツ承認済みのローンチ候補をピックアップ。',
    id: 'launch-ready',
    title: 'Launch-ready products',
  },
  {
    description: '担当者の稼働帯と役割変更をタイムライン表示します。',
    id: 'people-shifts',
    title: 'People shifts',
  },
];

const liveSignals = [
  { id: 'experience', label: '体験安定度', status: 'stable', value: '97%' },
  { id: 'handoff', label: 'ハンドオフ完了率', status: 'at-risk', value: '82%' },
  {
    id: 'insight',
    label: 'インサイト更新',
    status: 'stable',
    value: '12件 / 24h',
  },
];

const categoryStyles: Record<
  ExploreCategory,
  { label: string; accent: string; indicator: string }
> = {
  people: {
    accent: 'from-emerald-500/10 to-transparent border-emerald-300/30',
    indicator: 'text-emerald-500',
    label: '担当者',
  },
  playbooks: {
    accent: 'from-amber-500/10 to-transparent border-amber-300/30',
    indicator: 'text-amber-500',
    label: 'プレイブック',
  },
  products: {
    accent: 'from-blue-500/10 to-transparent border-blue-300/40',
    indicator: 'text-blue-500',
    label: 'プロダクト',
  },
  signals: {
    accent: 'from-purple-500/10 to-transparent border-purple-300/30',
    indicator: 'text-purple-500',
    label: 'シグナル',
  },
};

export const handle = {
  breadcrumb: () => 'Explore',
  titleName: 'Explore',
};

export function meta(_: Route.MetaArgs) {
  return [
    { title: 'Umaxica Commerce | Explore' },
    {
      content: '検索レイアウトでサービスやチームシグナルを横断的に探索します。',
      name: 'description',
    },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  const env = getEnv(context);
  const value = env.VALUE_FROM_CLOUDFLARE ?? 'Calm automation signals are healthy.';
  return { message: value };
}

export default function Explore({ loaderData }: Route.ComponentProps) {
  const [query, setQuery] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Selection>(() => new Set(['all']));

  const activeFilter = useMemo(() => {
    if (selectedKeys === 'all') {
      return 'all';
    }
    const [first] = Array.from(selectedKeys);
    return typeof first === 'string' ? (first as ExploreCategory | 'all') : 'all';
  }, [selectedKeys]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredResults = useMemo(
    () =>
      exploreLibrary.filter((entry) => {
        const matchesCategory = activeFilter === 'all' || entry.category === activeFilter;
        if (!normalizedQuery) {
          return matchesCategory;
        }
        const haystack = [entry.title, entry.summary, ...entry.tags].join(' ').toLowerCase();
        return matchesCategory && haystack.includes(normalizedQuery);
      }),
    [activeFilter, normalizedQuery],
  );

  const helperMessage = loaderData?.message?.trim();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-16 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
            Discovery Surface
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white sm:text-4xl">
            Umaxica を横断検索し、静かなシグナルをすぐに捉える
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            部署やサービスの枠を超えた検索とフィルターで、必要な知恵袋や進行中の
            <span className="font-medium text-slate-800 dark:text-slate-100">
              {' '}
              オペレーション脈拍
            </span>
            を一枚で俯瞰できます。
          </p>
        </header>

        <section className="space-y-6 rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-2xl shadow-slate-500/5 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/70">
          <SearchField
            aria-label="Umaxica内を検索"
            value={query}
            onChange={setQuery}
            className="w-full space-y-3"
          >
            <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              検索キーワード
            </Label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute left-4 text-slate-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <title>検索アイコン</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <Input
                placeholder="例: onboarding, account liaison, latency"
                className="w-full rounded-full border border-transparent bg-slate-100 py-3 pl-12 pr-36 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:bg-gray-800 dark:text-gray-100"
              />
              <div className="absolute right-3 flex gap-1">
                {query && (
                  <Button
                    onPress={() => setQuery('')}
                    className="rounded-full px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-gray-700"
                  >
                    クリア
                  </Button>
                )}
                <Button className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-700 dark:bg-blue-500 dark:hover:bg-blue-400">
                  検索
                </Button>
              </div>
            </div>
          </SearchField>

          <TagGroup
            aria-label="検索フィルター"
            selectionMode="single"
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
          >
            <TagList items={filters} className="flex flex-wrap gap-2">
              {(filter) => (
                <Tag
                  id={filter.id}
                  className="cursor-pointer rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition data-[selected]:border-blue-500 data-[selected]:bg-blue-50 data-[selected]:text-blue-600 dark:border-gray-700 dark:text-gray-300 dark:data-[selected]:bg-blue-500/20 dark:data-[selected]:text-blue-200"
                >
                  {filter.label}
                </Tag>
              )}
            </TagList>
          </TagGroup>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-gray-800 dark:text-gray-200">
              {filteredResults.length} 件の候補
            </span>
            {helperMessage && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200">
                {helperMessage}
              </span>
            )}
            <span>リアルタイムに結果が更新されます。</span>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            {filteredResults.map((result) => {
              const tone = categoryStyles[result.category];
              return (
                <article
                  key={result.id}
                  className={`rounded-3xl border bg-white/80 p-5 shadow-lg shadow-slate-500/5 backdrop-blur ${tone.accent} dark:border-gray-800 dark:bg-gray-900/70`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold uppercase tracking-[0.3em] ${tone.indicator}`}>
                      {tone.label}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500">{result.signal}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">
                    {result.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {result.summary}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-gray-800 dark:text-gray-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}

            {filteredResults.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-8 text-center text-sm text-slate-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300">
                検索条件に一致する結果が見つかりません。フィルターを切り替えるか、別のキーワードをお試しください。
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-lg shadow-slate-500/10 dark:border-gray-800 dark:bg-gray-900/70">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-gray-100">
                保存済みビュー
              </h3>
              <ListBox
                aria-label="保存済みビュー"
                selectionMode="none"
                className="mt-3 space-y-2 outline-none"
              >
                {savedViews.map((view) => (
                  <ListBoxItem
                    id={view.id}
                    key={view.id}
                    className="block rounded-2xl border border-slate-100 px-4 py-3 text-left text-sm text-slate-700 transition hover:border-blue-200 hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:border-gray-700 dark:text-gray-200 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10"
                  >
                    <div className="font-semibold">{view.title}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{view.description}</p>
                  </ListBoxItem>
                ))}
              </ListBox>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-lg shadow-slate-500/10 dark:border-gray-800 dark:bg-gray-900/70">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-gray-100">
                ライブシグナル
              </h3>
              <ul className="mt-4 space-y-4 text-sm">
                {liveSignals.map((signal) => (
                  <li
                    key={signal.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/60"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-gray-100">
                        {signal.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {signal.status === 'stable' ? '安定' : '注視が必要'}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        signal.status === 'stable' ? 'text-emerald-500' : 'text-amber-500'
                      }`}
                    >
                      {signal.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
