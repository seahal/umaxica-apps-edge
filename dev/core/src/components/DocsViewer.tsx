import { useState } from 'react';
import {
  Link as AriaLink,
  Breadcrumb,
  Breadcrumbs,
  Button,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  SearchField,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from 'react-aria-components';

// ドキュメントデータの型
interface DocSection {
  id: string;
  title: string;
  content: string;
  code?: string;
}

// サンプルドキュメントデータ
const docSections: DocSection[] = [
  {
    code: `import { Button } from 'react-aria-components';

function App() {
  return (
    <Button onPress={() => alert('pressed!')}>
      クリックしてください
    </Button>
  );
}`,
    content:
      'React Aria Components へようこそ。このライブラリは、アクセシブルな UI コンポーネントを簡単に構築できるように設計されています。',
    id: 'getting-started',
    title: 'はじめに',
  },
  {
    code: `import { Button } from 'react-aria-components';

<Button
  onPress={() => console.log('pressed')}
  className="px-4 py-2 bg-blue-500 text-white rounded"
>
  ボタン
</Button>`,
    content:
      'Button は最も基本的なコンポーネントの一つです。onClick ではなく onPress を使うことで、タッチデバイスでも正しく動作します。',
    id: 'button',
    title: 'Button コンポーネント',
  },
  {
    code: `import { Tabs, TabList, Tab, TabPanel } from 'react-aria-components';

<Tabs>
  <TabList>
    <Tab id="tab1">タブ1</Tab>
    <Tab id="tab2">タブ2</Tab>
  </TabList>
  <TabPanel id="tab1">
    コンテンツ1
  </TabPanel>
  <TabPanel id="tab2">
    コンテンツ2
  </TabPanel>
</Tabs>`,
    content:
      'Tabs は複数のコンテンツを切り替えるためのコンポーネントです。キーボードの矢印キーでも操作できます。',
    id: 'tabs',
    title: 'Tabs コンポーネント',
  },
  {
    code: `import {
  DialogTrigger,
  Button,
  Modal,
  Dialog
} from 'react-aria-components';

<DialogTrigger>
  <Button>開く</Button>
  <Modal>
    <Dialog>
      {({ close }) => (
        <>
          <h2>タイトル</h2>
          <p>コンテンツ</p>
          <Button onPress={close}>閉じる</Button>
        </>
      )}
    </Dialog>
  </Modal>
</DialogTrigger>`,
    content:
      'Dialog はモーダルウィンドウを実装するためのコンポーネントです。フォーカストラップや ESC キーでの閉じる機能が自動的に提供されます。',
    id: 'dialog',
    title: 'Dialog コンポーネント',
  },
  {
    code: `import {
  Form,
  TextField,
  Label,
  Input,
  Button
} from 'react-aria-components';

<Form onSubmit={(e) => e.preventDefault()}>
  <TextField isRequired>
    <Label>メールアドレス</Label>
    <Input type="email" />
  </TextField>
  <Button type="submit">送信</Button>
</Form>`,
    content:
      'Form 関連のコンポーネントは、アクセシブルなフォームを簡単に作成できます。バリデーションやエラー表示も組み込まれています。',
    id: 'form',
    title: 'Form コンポーネント',
  },
];

/**
 * ドキュメントビューアコンポーネント（開発者向けサイト）
 * React Aria の SearchField、Tabs、Breadcrumbs を使用
 */
export function DocsViewer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('getting-started');

  // 検索フィルタリング
  const filteredSections = docSections.filter(
    (section) =>
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.content.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const currentSection = docSections.find((s) => s.id === selectedSection);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="flex h-screen">
        {/* サイドバー */}
        <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              ドキュメント
            </h2>

            {/* 検索フィールド */}
            <SearchField value={searchQuery} onChange={setSearchQuery} className="mb-4">
              <Label className="sr-only">ドキュメント検索</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <title>検索</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <Input
                  placeholder="検索..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </SearchField>

            {/* 目次（ListBox） */}
            <ListBox
              items={filteredSections}
              selectionMode="single"
              selectedKeys={[selectedSection]}
              onSelectionChange={(keys: Iterable<string | number>) => {
                const key = [...keys][0];
                if (key) {
                  setSelectedSection(key as string);
                }
              }}
              className="space-y-1 outline-none"
            >
              {(section: DocSection) => (
                <ListBoxItem
                  id={section.id}
                  className="px-3 py-2 rounded-lg cursor-pointer text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 data-[selected]:bg-blue-100 dark:data-[selected]:bg-blue-900/30 data-[selected]:text-blue-700 dark:data-[selected]:text-blue-400 data-[selected]:font-semibold outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {section.title}
                </ListBoxItem>
              )}
            </ListBox>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8">
            {/* パンくずリスト */}
            <Breadcrumbs className="mb-6">
              <Breadcrumb className="text-sm">
                <AriaLink
                  href="#"
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  ホーム
                </AriaLink>
                <span className="mx-2 text-gray-400">/</span>
              </Breadcrumb>
              <Breadcrumb className="text-sm">
                <AriaLink
                  href="#"
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  ドキュメント
                </AriaLink>
                <span className="mx-2 text-gray-400">/</span>
              </Breadcrumb>
              <Breadcrumb className="text-sm">
                <span className="text-gray-900 dark:text-gray-100 font-semibold">
                  {currentSection?.title}
                </span>
              </Breadcrumb>
            </Breadcrumbs>

            {currentSection ? (
              <>
                {/* タイトル */}
                <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                  {currentSection.title}
                </h1>

                {/* コンテンツとコードのタブ */}
                <Tabs>
                  <TabList className="flex gap-2 border-b border-gray-200 dark:border-gray-800 mb-6">
                    <Tab
                      id="content"
                      className="px-4 py-2 font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 data-[selected]:text-blue-600 dark:data-[selected]:text-blue-400 data-[selected]:border-b-2 data-[selected]:border-blue-600"
                    >
                      説明
                    </Tab>
                    {currentSection.code && (
                      <Tab
                        id="code"
                        className="px-4 py-2 font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 data-[selected]:text-blue-600 dark:data-[selected]:text-blue-400 data-[selected]:border-b-2 data-[selected]:border-blue-600"
                      >
                        コード例
                      </Tab>
                    )}
                  </TabList>

                  {/* 説明タブ */}
                  <TabPanel id="content">
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                        {currentSection.content}
                      </p>
                    </div>
                  </TabPanel>

                  {/* コード例タブ */}
                  {currentSection.code && (
                    <TabPanel id="code">
                      <div className="relative">
                        <Button
                          onPress={() => {
                            void navigator.clipboard.writeText(currentSection?.code ?? '');
                            alert('コードをクリップボードにコピーしました！');
                          }}
                          className="absolute top-4 right-4 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          コピー
                        </Button>
                        <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-6 rounded-xl overflow-x-auto">
                          <code>{currentSection?.code ?? ''}</code>
                        </pre>
                      </div>
                    </TabPanel>
                  )}
                </Tabs>

                {/* ナビゲーションボタン */}
                <div className="flex justify-between mt-12 pt-6 border-t border-gray-200 dark:border-gray-800">
                  <Button
                    onPress={() => {
                      const currentIndex = docSections.findIndex((s) => s.id === selectedSection);
                      if (currentIndex > 0) {
                        const previous = docSections[currentIndex - 1];
                        if (previous) {
                          setSelectedSection(previous.id);
                        }
                      }
                    }}
                    isDisabled={docSections.findIndex((s) => s.id === selectedSection) === 0}
                    className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <title>前へ</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    前のページ
                  </Button>
                  <Button
                    onPress={() => {
                      const currentIndex = docSections.findIndex((s) => s.id === selectedSection);
                      if (currentIndex < docSections.length - 1) {
                        const next = docSections[currentIndex + 1];
                        if (next) {
                          setSelectedSection(next.id);
                        }
                      }
                    }}
                    isDisabled={
                      docSections.findIndex((s) => s.id === selectedSection) ===
                      docSections.length - 1
                    }
                    className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
                  >
                    次のページ
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <title>次へ</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  該当するドキュメントが見つかりませんでした
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
