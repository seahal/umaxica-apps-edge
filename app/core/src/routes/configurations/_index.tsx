import { Link } from 'react-router-dom';
import { SettingLayout } from '../../components/SettingComponents';
import { getEnv } from '../../context';
import type { Route } from '../+types/home';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Umaxica - 設定' }, { content: 'アカウントと環境設定', name: 'description' }];
}

export function loader({ context }: Route.LoaderArgs) {
  const env = getEnv(context) as unknown as Record<string, string | undefined>;
  return { message: env.SECRET_SAMPLE ?? '' };
}

// 設定メニューアイテムのコンポーネント
function SettingMenuItem({
  to,
  icon,
  title,
  description,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="block p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-500 dark:hover:border-blue-500 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        </div>
        <div className="flex-shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <title>移動</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export default function ConfigurationIndex({ loaderData }: Route.ComponentProps) {
  return (
    <SettingLayout title="設定" description="アカウントや表示設定を管理します">
      <div className="grid gap-4 md:grid-cols-2">
        {/* アカウント設定 */}
        <SettingMenuItem
          to="/configuration/account"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <title>アカウント</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          }
          title="アカウント"
          description="メールアドレス、地域設定、アカウント削除"
        />

        {/* 環境設定 */}
        <SettingMenuItem
          to="/configuration/preference"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <title>環境設定</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
          }
          title="環境設定"
          description="言語、タイムゾーン、テーマ、アクセシビリティ"
        />
      </div>

      {/* 開発情報（デバッグ用） */}
      {loaderData.message && (
        <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold">環境変数:</span> {loaderData.message}
          </p>
        </div>
      )}
    </SettingLayout>
  );
}
