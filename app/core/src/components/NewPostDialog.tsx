import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Label,
  Modal,
  ModalOverlay,
  TextArea,
  TextField,
} from 'react-aria-components';

interface NewPostDialogProps {
  onSubmit?: (content: string) => void;
}

/**
 * 新規投稿作成ダイアログコンポーネント
 * React Aria の Dialog, Modal, TextField を使用
 */
export function NewPostDialog({ onSubmit }: NewPostDialogProps) {
  const [content, setContent] = useState('');
  // Twitter風の文字数制限
  const maxLength = 280;

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit?.(content);
      // 送信後にクリア
      setContent('');
    }
  };

  return (
    <DialogTrigger>
      {/* 投稿ボタン */}
      <Button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full transition-colors shadow-lg hover:shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
        新規投稿
      </Button>

      {/* モーダルオーバーレイ（背景の暗い部分） */}
      <ModalOverlay className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        {/* モーダル本体 */}
        <Modal className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
          {/* ダイアログコンテンツ */}
          <Dialog className="outline-none p-6">
            {({ close }) => (
              <>
                {/* ヘッダー */}
                <div className="flex items-center justify-between mb-4">
                  <Heading
                    slot="title"
                    className="text-xl font-bold text-gray-900 dark:text-gray-100"
                  >
                    新規投稿を作成
                  </Heading>
                  <Button
                    onPress={close}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <title>閉じる</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </Button>
                </div>

                {/* 投稿フォーム */}
                <TextField value={content} onChange={setContent} className="mb-4">
                  <Label className="sr-only">投稿内容</Label>
                  <TextArea
                    placeholder="今何してる？"
                    className="w-full min-h-[200px] p-4 text-lg border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={maxLength}
                  />
                </TextField>

                {/* 文字数カウンター */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <span
                      className={
                        content.length > maxLength * 0.9
                          ? 'text-red-500 dark:text-red-400 font-bold'
                          : ''
                      }
                    >
                      {content.length}
                    </span>
                    <span> / {maxLength}</span>
                  </div>

                  {/* 残り文字数の可視化（円形プログレスバー風） */}
                  <div className="relative w-10 h-10">
                    <svg className="w-10 h-10 transform -rotate-90">
                      <title>残り文字数</title>
                      <circle
                        cx="20"
                        cy="20"
                        r="16"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      <circle
                        cx="20"
                        cy="20"
                        r="16"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        className={
                          content.length > maxLength * 0.9 ? 'text-red-500' : 'text-blue-500'
                        }
                        strokeDasharray={`${2 * Math.PI * 16}`}
                        strokeDashoffset={`${2 * Math.PI * 16 * (1 - content.length / maxLength)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex justify-end gap-3">
                  <Button
                    onPress={close}
                    className="px-6 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                  >
                    キャンセル
                  </Button>
                  <Button
                    onPress={() => {
                      handleSubmit();
                      close();
                    }}
                    isDisabled={!content.trim() || content.length > maxLength}
                    className="px-6 py-2 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    投稿する
                  </Button>
                </div>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
