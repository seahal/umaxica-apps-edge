import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Label,
  Modal,
  ModalOverlay,
  Radio,
  RadioGroup,
} from 'react-aria-components';

// イベントデータの型
interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: 'conference' | 'meetup' | 'workshop' | 'webinar';
  capacity: number;
  registered: number;
}

// サンプルイベントデータ
const events: Event[] = [
  {
    capacity: 50,
    category: 'workshop',
    date: '2025-11-15',
    description: 'アクセシブルな UI コンポーネントを React Aria で構築する方法を学びます',
    id: '1',
    location: 'オンライン',
    registered: 32,
    time: '14:00 - 17:00',
    title: 'React Aria ハンズオンワークショップ',
  },
  {
    capacity: 200,
    category: 'conference',
    date: '2025-11-22',
    description: '最新のアクセシビリティ技術とベストプラクティスを学ぶ',
    id: '2',
    location: '東京国際フォーラム',
    registered: 156,
    time: '10:00 - 18:00',
    title: 'Web アクセシビリティカンファレンス 2025',
  },
  {
    capacity: 30,
    category: 'meetup',
    date: '2025-11-08',
    description: 'フロントエンド開発者同士の交流会',
    id: '3',
    location: '渋谷カフェスペース',
    registered: 28,
    time: '19:00 - 21:00',
    title: 'フロントエンド開発者ミートアップ',
  },
  {
    capacity: 100,
    category: 'webinar',
    date: '2025-11-30',
    description: 'React Aria を使ったデザインシステムの作り方',
    id: '4',
    location: 'オンライン',
    registered: 67,
    time: '20:00 - 21:30',
    title: 'デザインシステム構築ウェビナー',
  },
];

const categoryNames = {
  conference: 'カンファレンス',
  meetup: 'ミートアップ',
  webinar: 'ウェビナー',
  workshop: 'ワークショップ',
};

const categoryColors = {
  conference: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  meetup: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  webinar: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  workshop: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

/** イベント一覧コンポーネント（組織・団体サイト向け） */
export function EventList() {
  const [filterCategory, setFilterCategory] = useState('all');

  // フィルタリング
  const filteredEvents = events.filter(
    (e) => filterCategory === 'all' || e.category === filterCategory,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">イベント一覧</h1>
          <p className="text-gray-600 dark:text-gray-400">コミュニティイベントに参加しましょう</p>
        </div>

        {/* フィルター（RadioGroup） */}
        <div className="mb-8 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <RadioGroup value={filterCategory} onChange={setFilterCategory} className="space-y-4">
            <Label className="block text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              カテゴリで絞り込み
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Radio
                value="all"
                className="group flex items-center gap-3 cursor-pointer p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors data-[selected]:border-blue-500 data-[selected]:bg-blue-50 dark:data-[selected]:bg-blue-900/20"
              >
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 group-data-[selected]:border-blue-500 flex items-center justify-center flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 opacity-0 group-data-[selected]:opacity-100 transition-opacity" />
                </div>
                <span className="text-gray-900 dark:text-gray-100 font-semibold">すべて</span>
              </Radio>
              <Radio
                value="conference"
                className="group flex items-center gap-3 cursor-pointer p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-500 dark:hover:border-purple-500 transition-colors data-[selected]:border-purple-500 data-[selected]:bg-purple-50 dark:data-[selected]:bg-purple-900/20"
              >
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 group-data-[selected]:border-purple-500 flex items-center justify-center flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 opacity-0 group-data-[selected]:opacity-100 transition-opacity" />
                </div>
                <span className="text-gray-900 dark:text-gray-100 font-semibold text-sm">
                  カンファレンス
                </span>
              </Radio>
              <Radio
                value="meetup"
                className="group flex items-center gap-3 cursor-pointer p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors data-[selected]:border-blue-500 data-[selected]:bg-blue-50 dark:data-[selected]:bg-blue-900/20"
              >
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 group-data-[selected]:border-blue-500 flex items-center justify-center flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 opacity-0 group-data-[selected]:opacity-100 transition-opacity" />
                </div>
                <span className="text-gray-900 dark:text-gray-100 font-semibold text-sm">
                  ミートアップ
                </span>
              </Radio>
              <Radio
                value="workshop"
                className="group flex items-center gap-3 cursor-pointer p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 dark:hover:border-green-500 transition-colors data-[selected]:border-green-500 data-[selected]:bg-green-50 dark:data-[selected]:bg-green-900/20"
              >
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 group-data-[selected]:border-green-500 flex items-center justify-center flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 opacity-0 group-data-[selected]:opacity-100 transition-opacity" />
                </div>
                <span className="text-gray-900 dark:text-gray-100 font-semibold text-sm">
                  ワークショップ
                </span>
              </Radio>
              <Radio
                value="webinar"
                className="group flex items-center gap-3 cursor-pointer p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-orange-500 dark:hover:border-orange-500 transition-colors data-[selected]:border-orange-500 data-[selected]:bg-orange-50 dark:data-[selected]:bg-orange-900/20"
              >
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 group-data-[selected]:border-orange-500 flex items-center justify-center flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500 opacity-0 group-data-[selected]:opacity-100 transition-opacity" />
                </div>
                <span className="text-gray-900 dark:text-gray-100 font-semibold text-sm">
                  ウェビナー
                </span>
              </Radio>
            </div>
          </RadioGroup>
        </div>

        {/* イベントリスト */}
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        {/* 結果がない場合 */}
        {filteredEvents.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl">
            <p className="text-gray-500 dark:text-gray-400">
              該当するイベントが見つかりませんでした
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// イベントカードコンポーネント
function EventCard({ event }: { event: Event }) {
  const remaining = event.capacity - event.registered;
  const fillRate = (event.registered / event.capacity) * 100;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow">
      <div className="flex flex-col md:flex-row gap-6">
        {/* 日付表示 */}
        <div className="flex-shrink-0">
          <div className="bg-gradient-to-br from-teal-400 to-green-500 rounded-xl p-4 text-white text-center min-w-[100px]">
            <div className="text-3xl font-bold">{new Date(event.date).getDate()}</div>
            <div className="text-sm">
              {new Date(event.date).toLocaleDateString('ja-JP', {
                month: 'short',
              })}
            </div>
            <div className="text-xs mt-1">{event.time}</div>
          </div>
        </div>

        {/* イベント情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {event.title}
              </h3>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${categoryColors[event.category]}`}
              >
                {categoryNames[event.category]}
              </span>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-4">{event.description}</p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <title>場所</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {event.location}
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <title>参加者</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              {event.registered} / {event.capacity} 人
            </div>
          </div>

          {/* 参加状況バー */}
          <div className="mb-4">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  fillRate >= 90 ? 'bg-red-500' : fillRate >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${fillRate}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">残り {remaining} 枠</p>
          </div>

          {/* 申し込みボタン */}
          <DialogTrigger>
            <Button
              isDisabled={remaining === 0}
              className="px-6 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              {remaining === 0 ? '満員' : '参加申し込み'}
            </Button>

            {/* 申し込み確認モーダル */}
            <ModalOverlay className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <Modal className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full">
                <Dialog className="outline-none p-6">
                  {({ close }: { close: () => void }) => (
                    <>
                      <Heading
                        slot="title"
                        className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4"
                      >
                        イベント参加申し込み
                      </Heading>
                      <div className="space-y-4 mb-6">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            {event.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {event.date} {event.time}
                          </p>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">
                          このイベントに参加申し込みをしますか？
                          <br />
                          確認メールが送信されます。
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onPress={close}
                          className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                        >
                          キャンセル
                        </Button>
                        <Button
                          onPress={() => {
                            alert(`${event.title} に参加申し込みをしました！`);
                            close();
                          }}
                          className="flex-1 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                        >
                          申し込む
                        </Button>
                      </div>
                    </>
                  )}
                </Dialog>
              </Modal>
            </ModalOverlay>
          </DialogTrigger>
        </div>
      </div>
    </div>
  );
}
