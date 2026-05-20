import { useState } from 'react';
import {
  Button,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
  Switch,
} from 'react-aria-components';
import { SettingItem, SettingLayout, SettingSection } from '../../components/SettingComponents';
import type { Route } from '../+types/about';

export function meta(_: Route.MetaArgs) {
  return [
    { title: 'Umaxica - 環境設定' },
    { content: '表示や動作に関する設定', name: 'description' },
  ];
}

function handleSaveSettings() {
  alert('設定を保存しました！');
}

export default function Preference() {
  const [darkMode, setDarkMode] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [language, setLanguage] = useState('ja');
  const [timezone, setTimezone] = useState('Asia/Tokyo');

  return (
    <SettingLayout title="環境設定" description="アプリの表示や動作に関する設定を変更できます">
      {/* 表示設定 */}
      <SettingSection title="表示設定" description="テーマやカラースキームの設定">
        {/* ダークモード */}
        <SettingItem label="ダークモード" description="画面を暗い色調で表示します">
          <Switch
            isSelected={darkMode}
            onChange={setDarkMode}
            aria-label="ダークモード"
            className="group inline-flex items-center"
          >
            <div className="flex h-7 w-12 items-center rounded-full bg-gray-300 px-1 transition group-data-[selected]:bg-blue-500">
              <span className="h-5 w-5 rounded-full bg-white shadow-sm transition group-data-[selected]:translate-x-5" />
            </div>
          </Switch>
        </SettingItem>

        {/* 高コントラスト */}
        <SettingItem
          label="高コントラスト"
          description="テキストと背景の差を大きくして読みやすくします"
        >
          <Switch
            isSelected={highContrast}
            onChange={setHighContrast}
            aria-label="高コントラスト"
            className="group inline-flex items-center"
          >
            <div className="flex h-7 w-12 items-center rounded-full bg-gray-300 px-1 transition group-data-[selected]:bg-blue-500">
              <span className="h-5 w-5 rounded-full bg-white shadow-sm transition group-data-[selected]:translate-x-5" />
            </div>
          </Switch>
        </SettingItem>
      </SettingSection>

      {/* 言語・地域設定 */}
      <SettingSection title="言語・地域" description="表示言語とタイムゾーンの設定">
        {/* 言語選択 */}
        <SettingItem label="言語" description="インターフェースの表示言語">
          <Select
            selectedKey={language}
            onSelectionChange={(key) => setLanguage(key as string)}
            className="min-w-[200px]"
          >
            <Button className="flex items-center justify-between gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <SelectValue />
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <title>選択</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </Button>
            <Popover className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg mt-2 min-w-[200px] overflow-hidden">
              <ListBox className="outline-none">
                <ListBoxItem
                  id="ja"
                  className="px-4 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 data-[selected]:bg-blue-100 dark:data-[selected]:bg-blue-900/40 data-[selected]:text-blue-600 dark:data-[selected]:text-blue-400 outline-none focus-visible:bg-blue-50 dark:focus-visible:bg-blue-900/20"
                >
                  日本語
                </ListBoxItem>
                <ListBoxItem
                  id="en"
                  className="px-4 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 data-[selected]:bg-blue-100 dark:data-[selected]:bg-blue-900/40 data-[selected]:text-blue-600 dark:data-[selected]:text-blue-400 outline-none focus-visible:bg-blue-50 dark:focus-visible:bg-blue-900/20"
                >
                  English
                </ListBoxItem>
                <ListBoxItem
                  id="zh"
                  className="px-4 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 data-[selected]:bg-blue-100 dark:data-[selected]:bg-blue-900/40 data-[selected]:text-blue-600 dark:data-[selected]:text-blue-400 outline-none focus-visible:bg-blue-50 dark:focus-visible:bg-blue-900/20"
                >
                  中文
                </ListBoxItem>
                <ListBoxItem
                  id="ko"
                  className="px-4 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 data-[selected]:bg-blue-100 dark:data-[selected]:bg-blue-900/40 data-[selected]:text-blue-600 dark:data-[selected]:text-blue-400 outline-none focus-visible:bg-blue-50 dark:focus-visible:bg-blue-900/20"
                >
                  한국어
                </ListBoxItem>
              </ListBox>
            </Popover>
          </Select>
        </SettingItem>

        {/* タイムゾーン選択 */}
        <SettingItem label="タイムゾーン" description="投稿時刻などの表示に使用されます">
          <Select
            selectedKey={timezone}
            onSelectionChange={(key) => setTimezone(key as string)}
            className="min-w-[200px]"
          >
            <Button className="flex items-center justify-between gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <SelectValue />
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <title>選択</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </Button>
            <Popover className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg mt-2 min-w-[200px] max-h-60 overflow-auto">
              <ListBox className="outline-none">
                <ListBoxItem
                  id="Asia/Tokyo"
                  className="px-4 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 data-[selected]:bg-blue-100 dark:data-[selected]:bg-blue-900/40 data-[selected]:text-blue-600 dark:data-[selected]:text-blue-400 outline-none focus-visible:bg-blue-50 dark:focus-visible:bg-blue-900/20"
                >
                  Asia/Tokyo (JST)
                </ListBoxItem>
                <ListBoxItem
                  id="America/New_York"
                  className="px-4 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 data-[selected]:bg-blue-100 dark:data-[selected]:bg-blue-900/40 data-[selected]:text-blue-600 dark:data-[selected]:text-blue-400 outline-none focus-visible:bg-blue-50 dark:focus-visible:bg-blue-900/20"
                >
                  America/New_York (EST)
                </ListBoxItem>
                <ListBoxItem
                  id="Europe/London"
                  className="px-4 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 data-[selected]:bg-blue-100 dark:data-[selected]:bg-blue-900/40 data-[selected]:text-blue-600 dark:data-[selected]:text-blue-400 outline-none focus-visible:bg-blue-50 dark:focus-visible:bg-blue-900/20"
                >
                  Europe/London (GMT)
                </ListBoxItem>
                <ListBoxItem
                  id="Australia/Sydney"
                  className="px-4 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 data-[selected]:bg-blue-100 dark:data-[selected]:bg-blue-900/40 data-[selected]:text-blue-600 dark:data-[selected]:text-blue-400 outline-none focus-visible:bg-blue-50 dark:focus-visible:bg-blue-900/20"
                >
                  Australia/Sydney (AEDT)
                </ListBoxItem>
              </ListBox>
            </Popover>
          </Select>
        </SettingItem>
      </SettingSection>

      {/* アクセシビリティ設定 */}
      <SettingSection title="アクセシビリティ" description="操作性や読みやすさの向上">
        {/* アニメーション削減 */}
        <SettingItem
          label="アニメーションを削減"
          description="画面遷移やエフェクトのアニメーションを無効化します"
        >
          <Switch
            isSelected={reduceMotion}
            onChange={setReduceMotion}
            aria-label="アニメーションを削減"
            className="group inline-flex items-center"
          >
            <div className="flex h-7 w-12 items-center rounded-full bg-gray-300 px-1 transition group-data-[selected]:bg-blue-500">
              <span className="h-5 w-5 rounded-full bg-white shadow-sm transition group-data-[selected]:translate-x-5" />
            </div>
          </Switch>
        </SettingItem>
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
          onPress={handleSaveSettings}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-lg hover:shadow-xl"
        >
          変更を保存
        </Button>
      </div>
    </SettingLayout>
  );
}
