import { Button } from 'react-aria-components';

// 投稿のデータ型
export interface Post {
  id: string;
  author: string;
  username: string;
  content: string;
  timestamp: string;
  likes: number;
  reposts: number;
  replies: number;
}

interface PostCardProps {
  post: Post;
  onLike?: (postId: string) => void;
  onRepost?: (postId: string) => void;
  onReply?: (postId: string) => void;
}

/**
 * SNS風の投稿カードコンポーネント
 * React Aria の Button を使ってアクセシブルなボタンを実装
 */
export function PostCard({ post, onLike, onRepost, onReply }: PostCardProps) {
  return (
    <article className="border-b border-gray-200 dark:border-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
      {/* ユーザー情報 */}
      <div className="flex items-start gap-3">
        {/* アバター */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
          {post.author?.[0]?.toUpperCase() ?? '?'}
        </div>

        {/* 投稿内容 */}
        <div className="flex-1 min-w-0">
          {/* ヘッダー（名前・ユーザー名・時間） */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 dark:text-gray-100">{post.author}</span>
            <span className="text-gray-500 dark:text-gray-400">@{post.username}</span>
            <span className="text-gray-500 dark:text-gray-400">·</span>
            <span className="text-gray-500 dark:text-gray-400">{post.timestamp}</span>
          </div>

          {/* 投稿本文 */}
          <p className="mt-2 text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
            {post.content}
          </p>

          {/* アクションボタン群 */}
          <div className="flex items-center gap-6 mt-3">
            {/* 返信ボタン */}
            <Button
              onPress={() => onReply?.(post.id)}
              className="group flex items-center gap-2 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full px-2 py-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <title>返信</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span className="text-sm">{post.replies}</span>
            </Button>

            {/* リポストボタン */}
            <Button
              onPress={() => onRepost?.(post.id)}
              className="group flex items-center gap-2 text-gray-500 hover:text-green-500 dark:text-gray-400 dark:hover:text-green-400 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-full px-2 py-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <title>リポスト</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="text-sm">{post.reposts}</span>
            </Button>

            {/* いいねボタン */}
            <Button
              onPress={() => onLike?.(post.id)}
              className="group flex items-center gap-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-full px-2 py-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <title>いいね</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span className="text-sm">{post.likes}</span>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
