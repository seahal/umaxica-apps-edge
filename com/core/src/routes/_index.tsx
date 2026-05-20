import {
  Button,
  Input,
  Label,
  Link,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  TextField,
} from 'react-aria-components';
import { getEnv } from '../context';
import type { Route } from './+types/_index';

const focusAreas = [
  {
    accent: 'from-blue-500/20 to-blue-500/0',
    description: '企業横断で再利用できる抽象度の高い基盤を提供。',
    metric: 'Re-usable Capsules',
    title: 'Modular Platform',
    value: '128',
  },
  {
    accent: 'from-purple-500/20 to-purple-500/0',
    description: '自然なUIレイヤーでブランド体験を迅速に具現化。',
    metric: 'Prototype Cycles',
    title: 'Experience Studio',
    value: '72h',
  },
  {
    accent: 'from-emerald-500/20 to-emerald-500/0',
    description: 'コンテキストに応じて変化する洞察で継続的に最適化。',
    metric: 'Signal Streams',
    title: 'Adaptive Insight',
    value: '∞',
  },
];

const perspectives = [
  {
    body: 'デジタル体験を単なるタッチポイントではなく、企業文化と結びついた有機的なプラットフォームとして再構築します。',
    id: 'vision',
    label: 'Vision',
    title: '遥か先の価値を見据える抽象的な青写真',
  },
  {
    body: 'React Aria を中心に据えたアクセシブルなUIと、Cloudflare Workersによる分散エッジを組み合わせ、柔軟性と安定性を両立します。',
    id: 'platform',
    label: 'Platform',
    title: '静かながら強靭なオペレーションレイヤー',
  },
  {
    body: '抽象的なサービス設計、リズミカルなプロトタイピング、そしてユーザーフィードバックの循環で、常に最適な姿に磨き上げます。',
    id: 'practice',
    label: 'Practice',
    title: '継続する共創プロセス',
  },
];

export function meta(_: Route.MetaArgs) {
  const codeName = _.data?.codeName || 'Umaxica';
  return [
    { title: `${codeName} (com)` },
    {
      content: '抽象的なバリュープロポジションで魅せるコーポレートサイトのサンプル。',
      name: 'description',
    },
    { content: 'index, follow', name: 'robots' },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  const env = getEnv(context);
  return {
    codeName: env.BRAND_NAME?.trim() || 'Umaxica',
    message: env.VALUE_FROM_CLOUDFLARE ?? '',
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const headline = loaderData?.message || 'Sculpting Calm & Capable Experiences';

  return (
    <main className="relative isolate overflow-hidden bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-blue-100 via-white to-transparent opacity-60 blur-3xl dark:from-blue-950/40 dark:via-gray-950 dark:opacity-90" />
        <div className="absolute right-[-10%] top-32 h-72 w-72 rounded-full bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-transparent blur-2xl dark:from-blue-500/40 dark:via-purple-500/20" />
        <div className="absolute left-[-8%] top-64 h-56 w-56 rounded-full bg-gradient-to-br from-emerald-400/20 via-cyan-400/10 to-transparent blur-3xl dark:from-emerald-500/40 dark:via-cyan-500/20" />
      </div>

      <section className="mx-auto max-w-6xl px-4 pb-12 pt-28 sm:pb-16 sm:pt-32 lg:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-100/70 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-blue-600 backdrop-blur-md dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
            Abstract Corporate Sample
          </span>
          <h1 className="mt-8 text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl sm:leading-snug dark:text-white">
            {headline}
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
            感性に寄り添うプロダクトデザインと静かなテクノロジーが出会う場所。
            エッジで完結する体験を通して、企業の「未来のらしさ」を抽出します。
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button className="group inline-flex items-center gap-2 rounded-full border border-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-indigo-600/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950">
            プロジェクトを描写する
            <span aria-hidden className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Button>

          <Link
            href="#insights"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition-all duration-300 hover:bg-white/80 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900/40 dark:hover:text-white"
          >
            抽象的な視点を覗く
          </Link>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {focusAreas.map((feature) => (
            <div
              key={feature.title}
              className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white/70 p-6 shadow-md shadow-slate-200/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-950/40 dark:shadow-none dark:hover:border-slate-700"
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.accent}`}
              />
              <div className="relative space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {feature.description}
                </p>
                <div className="flex items-baseline gap-2 text-slate-900 dark:text-slate-100">
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                    {feature.metric}
                  </span>
                  <span className="text-2xl font-bold">{feature.value}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="insights" className="mx-auto max-w-6xl px-4 py-16 lg:px-6 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              抽象的な視点で切り取る未来像
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              プロダクトは常に変化する仮説の器。React Aria
              のロジックを軸に、体験と運用の双方に静かな余白を残すことで、変化にしなやかに寄り添います。
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="rounded-2xl border border-slate-100/80 bg-white/70 px-5 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Metrics
                </span>
                Time-to-Concept を 1/3 に短縮
              </div>
              <div className="rounded-2xl border border-slate-100/80 bg-white/70 px-5 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Reach
                </span>
                グローバル 14 拠点へ静かに展開
              </div>
            </div>
          </div>

          <Tabs defaultSelectedKey="vision" className="w-full">
            <TabList
              aria-label="Perspective Tabs"
              className="flex gap-2 rounded-2xl border border-slate-100 bg-white/80 p-2 shadow-sm shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950/40 dark:shadow-none"
            >
              {perspectives.map((item) => (
                <Tab
                  key={item.id}
                  id={item.id}
                  className={({ isSelected, isFocusVisible }) =>
                    [
                      'flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 outline-none',
                      isSelected
                        ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white',
                      isFocusVisible
                        ? 'ring-2 ring-offset-2 ring-blue-400 dark:ring-offset-slate-950'
                        : '',
                    ].join(' ')
                  }
                >
                  {item.label}
                </Tab>
              ))}
            </TabList>
            {perspectives.map((item) => (
              <TabPanel
                key={item.id}
                id={item.id}
                className="mt-4 space-y-4 rounded-2xl border border-slate-100 bg-white/80 p-6 shadow-md shadow-slate-200/30 transition-all duration-300 dark:border-slate-800 dark:bg-slate-950/40 dark:shadow-none"
              >
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {item.body}
                </p>
              </TabPanel>
            ))}
          </Tabs>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 lg:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900/80 px-6 py-10 text-white shadow-xl dark:border-slate-700 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/60 sm:px-10 sm:py-12">
          <div className="absolute left-6 top-6 h-32 w-32 rounded-full bg-gradient-to-br from-blue-400/40 via-indigo-500/20 to-transparent blur-2xl" />
          <div className="absolute right-6 bottom-6 h-40 w-40 rounded-full bg-gradient-to-br from-cyan-400/30 via-purple-600/20 to-transparent blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                静かな変革を、そっと始めませんか。
              </h2>
              <p className="text-sm leading-relaxed text-slate-200">
                抽象的なビジョンをリアルな体験に落とし込むプロトタイプセッションを無償でご用意しています。
              </p>
            </div>

            <TextField className="relative flex w-full flex-col gap-3 rounded-2xl border border-white/20 bg-white/5 p-4 backdrop-blur-sm focus-within:border-white/40">
              <Label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">
                コンタクトキー
              </Label>
              <Input
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-300 focus:border-white/60 focus:outline-none"
                placeholder="your.team@abstract.co"
                type="email"
              />
              <Button className="inline-flex items-center justify-center rounded-xl bg-white/90 px-4 py-3 text-sm font-semibold text-slate-900 transition-all duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/60 focus-visible:ring-offset-slate-900">
                アクセスをリクエスト
              </Button>
            </TextField>
          </div>
        </div>
      </section>
    </main>
  );
}
