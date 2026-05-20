import { useState } from 'react';
import { Button, Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import { NewPostDialog } from './NewPostDialog';
import { PostCard } from './PostCard';
import type { Post } from './PostCard';

// サンプルデータ
const initialPosts: Post[] = [
  {
    author: '田中太郎',
    content: '今日はいい天気ですね！散歩に行ってきます。',
    id: '1',
    likes: 42,
    replies: 5,
    reposts: 8,
    timestamp: '2時間前',
    username: 'tanaka_taro',
  },
  {
    author: '山田花子',
    content:
      '新しいプロジェクトを始めました！\nReact Aria を使ってアクセシブルなUIを作っています。\n\n#React #ReactAria #アクセシビリティ',
    id: '2',
    likes: 128,
    replies: 15,
    reposts: 23,
    timestamp: '4時間前',
    username: 'yamada_hanako',
  },
  {
    author: '佐藤次郎',
    content: 'コーヒーブレイク中☕\n午後も頑張ります！',
    id: '3',
    likes: 67,
    replies: 8,
    reposts: 3,
    timestamp: '6時間前',
    username: 'sato_jiro',
  },
  {
    author: '鈴木美咲',
    content:
      '最近 Tailwind CSS v4 を触ってるけど、めちゃくちゃ書きやすくなってる！\nカスタマイズも簡単だし、開発体験が最高です。',
    id: '4',
    likes: 234,
    replies: 32,
    reposts: 45,
    timestamp: '8時間前',
    username: 'suzuki_misaki',
  },
  {
    author: '高橋健',
    content: '週末はキャンプに行く予定です🏕️\n久しぶりのアウトドア、楽しみ！',
    id: '5',
    likes: 89,
    replies: 18,
    reposts: 12,
    timestamp: '10時間前',
    username: 'takahashi_ken',
  },
];

// oxlint-disable no-console
function handleReplyDemo(postId: string) {
  console.log(`返信: ${postId}`);
}

/**
 * SNS風のタイムラインコンポーネント
 * React Aria の Tabs を使ってタブ切り替えを実装
 */
export function Timeline() {
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  // 新規投稿の追加
  const handleNewPost = (content: string) => {
    const newPost: Post = {
      author: 'あなた',
      content,
      id: Date.now().toString(),
      likes: 0,
      replies: 0,
      reposts: 0,
      timestamp: 'たった今',
      username: 'current_user',
    };
    setPosts([newPost, ...posts]);
  };

  // いいねの処理
  const handleLike = (postId: string) => {
    setPosts(posts.map((post) => (post.id === postId ? { ...post, likes: post.likes + 1 } : post)));
  };

  // リポストの処理
  const handleRepost = (postId: string) => {
    setPosts(
      posts.map((post) => (post.id === postId ? { ...post, reposts: post.reposts + 1 } : post)),
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* ヘッダーとタブ */}
      <Tabs className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">ホーム</h2>
          <NewPostDialog onSubmit={handleNewPost} />
        </div>

        {/* タブリスト */}
        <TabList className="flex border-b border-gray-200 dark:border-gray-800">
          <Tab
            id="foryou"
            className="flex-1 px-4 py-4 font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 data-[selected]:text-gray-900 dark:data-[selected]:text-gray-100 data-[selected]:border-b-4 data-[selected]:border-blue-500"
          >
            おすすめ
          </Tab>
          <Tab
            id="following"
            className="flex-1 px-4 py-4 font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 data-[selected]:text-gray-900 dark:data-[selected]:text-gray-100 data-[selected]:border-b-4 data-[selected]:border-blue-500"
          >
            フォロー中
          </Tab>
        </TabList>

        {/* おすすめタブの内容 */}
        <TabPanel id="foryou">
          <div>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLike={handleLike}
                onRepost={handleRepost}
                onReply={handleReplyDemo}
              />
            ))}
          </div>

          {/* もっと読み込むボタン */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <Button className="w-full py-3 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              もっと見る
            </Button>
          </div>
        </TabPanel>

        {/* フォロー中タブの内容 */}
        <TabPanel id="following">
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p>フォロー中のユーザーの投稿がここに表示されます</p>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}
