import { Button } from 'react-aria-components';
import type { Post } from './PostCard';

// ユーザー情報の型
export interface User {
  id: string;
  name: string;
  username: string;
  bio: string;
  followers: number;
  verified: boolean;
}

// トレンド情報の型
export interface Trend {
  id: string;
  topic: string;
  category: string;
  posts: number;
}

interface SearchResultsProps {
  query: string;
  posts?: Post[];
  users?: User[];
  trends?: Trend[];
  type: 'all' | 'users' | 'posts' | 'trends';
}

/**
 * 検索結果を表示するコンポーネント
 */
export function SearchResults({
  query,
  posts = [],
  users = [],
  trends = [],
  type,
}: SearchResultsProps) {
  // 検索クエリがない場合
  if (!query.trim()) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <svg
          className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <title>検索</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <p className="text-lg font-semibold mb-2">何かを検索してみましょう</p>
        <p className="text-sm">ユーザー名、投稿内容、トレンドなどを検索できます</p>
      </div>
    );
  }

  // すべてのタブ：ユーザー、投稿、トレンドをまとめて表示
  if (type === 'all') {
    const hasResults = users.length > 0 || posts.length > 0 || trends.length > 0;

    if (!hasResults) {
      return <NoResults query={query} />;
    }

    return (
      <div className="space-y-6">
        {users.length > 0 && (
          <section>
            <h3 className="px-4 py-3 font-bold text-lg border-b dark:border-gray-800">ユーザー</h3>
            {users.slice(0, 3).map((user) => (
              <UserResult key={user.id} user={user} />
            ))}
          </section>
        )}

        {posts.length > 0 && (
          <section>
            <h3 className="px-4 py-3 font-bold text-lg border-b dark:border-gray-800">投稿</h3>
            {posts.slice(0, 3).map((post) => (
              <PostResult key={post.id} post={post} query={query} />
            ))}
          </section>
        )}

        {trends.length > 0 && (
          <section>
            <h3 className="px-4 py-3 font-bold text-lg border-b dark:border-gray-800">トレンド</h3>
            {trends.slice(0, 3).map((trend) => (
              <TrendResult key={trend.id} trend={trend} />
            ))}
          </section>
        )}
      </div>
    );
  }

  // ユーザー検索結果
  if (type === 'users') {
    if (users.length === 0) {
      return <NoResults query={query} />;
    }

    return (
      <div>
        {users.map((user) => (
          <UserResult key={user.id} user={user} />
        ))}
      </div>
    );
  }

  // 投稿検索結果
  if (type === 'posts') {
    if (posts.length === 0) {
      return <NoResults query={query} />;
    }

    return (
      <div>
        {posts.map((post) => (
          <PostResult key={post.id} post={post} query={query} />
        ))}
      </div>
    );
  }

  // トレンド検索結果
  if (type === 'trends') {
    if (trends.length === 0) {
      return <NoResults query={query} />;
    }

    return (
      <div>
        {trends.map((trend) => (
          <TrendResult key={trend.id} trend={trend} />
        ))}
      </div>
    );
  }

  return null;
}

// 検索結果なしの表示
function NoResults({ query }: { query: string }) {
  return (
    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
      <p className="text-lg font-semibold mb-2">「{query}」に一致する結果が見つかりませんでした</p>
      <p className="text-sm">別のキーワードで検索するか、スペルを確認してください</p>
    </div>
  );
}

// ユーザー検索結果の表示
function UserResult({ user }: { user: User }) {
  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex gap-3 flex-1 min-w-0">
          {/* アバター */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
            {user.name?.[0]?.toUpperCase() ?? '?'}
          </div>

          {/* ユーザー情報 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-bold text-gray-900 dark:text-gray-100 truncate">
                {user.name}
              </span>
              {user.verified && (
                <svg
                  className="w-5 h-5 text-blue-500 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <title>認証済み</title>
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm truncate">@{user.username}</p>
            <p className="text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">{user.bio}</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {user.followers.toLocaleString()} フォロワー
            </p>
          </div>
        </div>

        {/* フォローボタン */}
        <Button className="ml-4 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex-shrink-0">
          フォロー
        </Button>
      </div>
    </div>
  );
}

// 検索クエリをハイライト表示する
function highlightText(text: string, highlight: string) {
  if (!highlight.trim()) {
    return text;
  }

  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === highlight.toLowerCase() ? (
      <mark
        key={`${part}-${i}`}
        className="bg-yellow-200 dark:bg-yellow-800 text-gray-900 dark:text-gray-100"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

// 投稿検索結果の表示
function PostResult({ post, query }: { post: Post; query: string }) {
  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
          {post.author?.[0]?.toUpperCase() ?? '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 dark:text-gray-100">{post.author}</span>
            <span className="text-gray-500 dark:text-gray-400">@{post.username}</span>
            <span className="text-gray-500 dark:text-gray-400">·</span>
            <span className="text-gray-500 dark:text-gray-400">{post.timestamp}</span>
          </div>

          <p className="mt-2 text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
            {highlightText(post.content, query)}
          </p>
        </div>
      </div>
    </div>
  );
}

// トレンド検索結果の表示
function TrendResult({ trend }: { trend: Trend }) {
  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer">
      <div className="text-sm text-gray-500 dark:text-gray-400">{trend.category}でトレンド</div>
      <div className="font-bold text-gray-900 dark:text-gray-100 mt-1">{trend.topic}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {trend.posts.toLocaleString()} 件の投稿
      </div>
    </div>
  );
}
