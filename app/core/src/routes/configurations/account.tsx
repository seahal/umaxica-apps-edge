import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Input,
  Label,
  Modal,
  ModalOverlay,
  Radio,
  RadioGroup,
  TextField,
} from 'react-aria-components';
import { SettingLayout, SettingSection } from '../../components/SettingComponents';
import type { Route } from '../+types/about';

export function meta(_: Route.MetaArgs) {
  return [
    { title: 'Umaxica - アカウント設定' },
    { content: 'アカウント情報の管理', name: 'description' },
  ];
}

function handleDeleteAccountDemo() {
  alert('アカウント削除機能は現在デモモードです');
}

export default function Account() {
  const [email, setEmail] = useState('user@example.com');
  const [region, setRegion] = useState('ja');

  const handleEmailChange = () => {
    alert(`メールアドレスを ${email} に変更しました！`);
  };

  return (
    <SettingLayout title="アカウント設定" description="メールアドレスや地域の設定を変更できます">
      {/* メールアドレス設定 */}
      <SettingSection title="メールアドレス" description="ログインや通知に使用されます">
        <div className="p-6">
          <TextField value={email} onChange={setEmail} isRequired className="space-y-2">
            <Label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              メールアドレス
            </Label>
            <Input
              type="email"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            />
          </TextField>
          <div className="mt-4 flex justify-end">
            <Button
              onPress={handleEmailChange}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              メールアドレスを変更
            </Button>
          </div>
        </div>
      </SettingSection>

      {/* 地域設定 */}
      <SettingSection title="地域" description="コンテンツの表示地域を設定">
        <div className="p-6">
          <RadioGroup value={region} onChange={setRegion} className="space-y-3">
            <Label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              地域を選択
            </Label>
            <Radio value="ja" className="group flex items-center gap-3 cursor-pointer">
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 group-data-[selected]:border-blue-500 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 opacity-0 group-data-[selected]:opacity-100 transition-opacity" />
              </div>
              <span className="text-gray-900 dark:text-gray-100">日本</span>
            </Radio>
            <Radio value="us" className="group flex items-center gap-3 cursor-pointer">
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 group-data-[selected]:border-blue-500 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 opacity-0 group-data-[selected]:opacity-100 transition-opacity" />
              </div>
              <span className="text-gray-900 dark:text-gray-100">アメリカ合衆国</span>
            </Radio>
            <Radio value="uk" className="group flex items-center gap-3 cursor-pointer">
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 group-data-[selected]:border-blue-500 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 opacity-0 group-data-[selected]:opacity-100 transition-opacity" />
              </div>
              <span className="text-gray-900 dark:text-gray-100">イギリス</span>
            </Radio>
            <Radio value="au" className="group flex items-center gap-3 cursor-pointer">
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 group-data-[selected]:border-blue-500 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 opacity-0 group-data-[selected]:opacity-100 transition-opacity" />
              </div>
              <span className="text-gray-900 dark:text-gray-100">オーストラリア</span>
            </Radio>
          </RadioGroup>
        </div>
      </SettingSection>

      {/* 危険なアクション */}
      <SettingSection title="危険なアクション" description="これらの操作は元に戻せません">
        <div className="p-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">アカウントを削除</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              アカウントを完全に削除します。この操作は取り消せません。すべてのデータが永久に失われます。
            </p>

            {/* React Aria の DialogTrigger で確認ダイアログ */}
            <DialogTrigger>
              <Button className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-red-500">
                アカウントを削除
              </Button>

              {/* 確認ダイアログ */}
              <ModalOverlay className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <Modal className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full">
                  <Dialog className="outline-none p-6">
                    {({ close }) => (
                      <>
                        <Heading
                          slot="title"
                          className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
                        >
                          アカウントを削除しますか？
                        </Heading>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                          この操作は取り消せません。すべての投稿、いいね、フォロー情報が完全に削除されます。
                        </p>
                        <div className="flex gap-3 justify-end">
                          <Button
                            onPress={close}
                            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                          >
                            キャンセル
                          </Button>
                          <Button
                            onPress={() => {
                              handleDeleteAccountDemo();
                              close();
                            }}
                            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          >
                            削除する
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
      </SettingSection>

      {/* 保存ボタン */}
      <div className="flex justify-end gap-3">
        <Button
          onPress={() => window.history.back()}
          className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
        >
          キャンセル
        </Button>
        <Button
          onPress={() => alert('設定を保存しました！')}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-lg hover:shadow-xl"
        >
          変更を保存
        </Button>
      </div>
    </SettingLayout>
  );
}
