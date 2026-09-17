# UMAXICA Edge 並行実装計画 — 2026-09

## 目的と判定

Rails の大規模改修を待たずに、Rails が不要な Edge 境界を安全に整備する。
対象はこの作業コピーの Edge だけであり、Rails リポジトリ、Rails の実行環境、
Cloudflare、remote GitHub は変更しない。

この計画は実装前のP0成果物である。各工程は、工程内の failing test、最小修正、
green、差分レビュー、対象pathだけのstage、ローカルcommitを完了してから次へ進む。
工程の独立性が失われた場合、その工程を保留し、別工程だけを進める。

### P0時点の事実

- 作業root: `/home/edge/workspace`
- branch: `develop`
- 実際のHEAD: `3bc0edbed69ffb6548d23b8aeba78913df0c08a3`
- 参照されたEdge feature `b1d786b22ad329c52a4cc41acb0f5e92ec0c386e` は現在のHEADの祖先。
  resetや履歴改変は行わない。
- 既存の利用者差分は `pnpm-workspace.yaml` と `pnpm-lock.yaml` の2ファイル。
  内容を移動、破棄、stash、commitせず、全工程でstage対象から除外する。
- worktreeは1つだけで、別worktree、別branch、untracked/staged差分はP0確認時点でない。
- Rails参照SHA `7bee4819ffe2a402c63a04af2a368bfcaf253c0d` のローカルコピーは見つからなかった。
  `/home/edge/umaxica-apps-jit-global` などの候補も存在しない。RailsのPreference実装、
  `PreferenceGlobal`、`PreferenceLocalization`、`RequestContextContract`、Cookie定義は
  この環境で確認できないため、そこから値を推測する工程をGOにしない。
- `pnpm install --frozen-lockfile` は `pnpm 12.0.0` で成功した。

### 引継ぎ後の実績

前工程の作業ツリーを確認した時点では、実装済みの先頭は
`86404e2e`（request ID と完了ログ）で、`develop` は remote にpushしていない。
P0のbaseline以降、次の工程commitがローカルに積まれている。

`48712246`（計画）、`4929730c`、`5bc6538c`、`eca6a58b`、`963377c3`、
`f92e2c8e`、`8fc13a12`、`9b78df1e`、`88a2f907`、`f8fadf08`、
`0f83b4d6`、`86404e2e`、`d9c32ce2`、`bd3d3ec5`、`f41b9634`、
`3fc469fd`、`46c778d4`、`84d6f22f`、`197b5e8b`。

その後、`6e26c49e`でstale metadata・型/lint衛生を解消し、`0084cafa`で現行コードと
運用文書に残っていた旧Astroの実装記述をTanStack/Viteへ整合させた。どちらもRails、認証、
通信契約、公開URLを変更しない独立したP6後続sliceである。

現行HEADは、これらの記録を確定した`37f76d96`である。2026-09-17に現行HEADの総合check、
20面build/unit test/Hurl/Chromiumを再実行し、結果を
`evidence/2026-09-17-edge-final-audit.md`へ記録した。

P3dのParaglide生成境界とCoreのrequest-local locale接続まで、公開URL/SEO契約から
切り離せる範囲を追加実装した。P3bの公開`lx` URL接続は引き続き保留である。

引継ぎ時に `package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`、12 public unit の
`wrangler.jsonc`、および root の一部文書に、所有者を確認できない未commit差分が
残っていた。これらは移動・破棄・stash・commitせず、今回のstageから除外する。
実装工程はその差分と衝突しないpathだけで完了させる。

引継ぎ後、Railsの指定SHAはEdge作業コピーの外にある一時bare repositoryへ
読み取り専用で取得できた。Edgeのbranch、Rails作業ツリー、Railsの実行環境は変更していない。
Preference契約の確認結果は `evidence/2026-09-15-rails-preference-reference.md` に記録する。

### 対象deployment unit

Hono apex 5面:

`app/apex`, `com/apex`, `org/apex`, `net/apex`, `dev/apex`

TanStack Start 15面:

`{app,com,org}/core`, `{app,com,org}/{docs,help,info,news}`

合計20面。各unitの `.oxlintrc.json`、`.oxfmtrc.json`、`tsconfig.json`、
`vitest.config.ts`、`vitest.setup.ts`、`knip.jsonc`、stylesheetを維持し、共有frameworkや
root configへの置換は行わない。

## 適用する契約

### Rails通信の3分割

1. **公開content client（12面）**

   現行の `src/lib/publishing-cell.ts` が持つ固定のprivate Rails originと、
   `CLOUDFLARE_ENV=vpc` / 明示的local transportの境界を維持する。受信Cookie、
   Authorization、Access秘密値は転送しない。pathは固定relative pathだけにし、受信値で
   originを選べるproxyにしない。2,000msは要求開始から本文の上限付き読み取り完了まで、
   content JSONはUTF-8 byteで1MiBまでとする。自動retryはしない。

2. **Core client（3面）**

   ADR 018どおり、`RAILS_ORIGIN`への通常の公開HTTPS `fetch`だけを使う。Workers VPC、
   private content client、VPC→Internet fallbackは使わない。既存のhealth等の非認証通信、
   credential strip、固定origin、2,000msの通信制限を維持・補強する。JWT、JWKS、認証判定、
   新認証APIは今回作らない。

3. **CoreのRails-owned透過中継**

   `worker.ts` / `core-dispatch.ts` のpath所有権をA/Bと別契約で扱う。Railsが返した
   status、Location、Set-Cookie、Content-Type、bodyとCookie/CSRF等の正当な転送を保つ。
   Railsの3xx/401/403/404/405/5xxをCMS用502へ変換しない。request bodyを一律bufferせず、
   透過中継へJSON schemaや通常入力64KiBを一律適用しない。単体通信の2,000ms timeoutは
   504、通常の接続不能は503とし、retry/fall-throughはしない。

### 言語、region、URL

- Honoは現行の検出順、query key、Accept-Language、fallback、Varyを維持し、
  language detectorの保存副作用だけを止める。Cookie writerを新設しない。
- TanStack 15面は `lx` → Rails発行language Cookie → `ja` を採用するまでを保留する。
  許可値と正規化はP3aで確認したRails契約を根拠にするが、公開URL・SEO契約が未承認のため、
  大文字、空値、重複query、配列queryのEdge上の扱いを先回りして実装しない。
  Accept-Language、navigator、path prefixを新たなfallbackにしない。
- info 3面は現行Vite allowlistの `info.umaxica.{app,com,org}` を根拠にregionなし、
  docs/help/news 9面は現行の `surface-jp/us.umaxica.<tld>` を根拠にregion付きとする。
  query/Cookieでregionを変更しない。canonical query採用は未決定なのでSEO変更を行わない。
- Railsのauth/base等への既存Jump link、署名対象、region文脈は保留中のRails契約確認まで触らない。

### 入口、上限、headers、ログ

- unknown Hostは外向き通信やregion決定より前に拒否する。既存の本番custom host、正規の
  local/preview/workers.dev経路は現物のwrangler/Vite設定から保つ。X-Forwarded-Hostを
  無条件に採用しない。新規hostを推測で許可しない。契約がない拒否statusは421を第一候補とする。
- Edge自身の応答生成は3,000ms。timeout用のAbortSignal、timer cleanup、遅れてrejectする
  Promise、reader解放をテストする。stream開始後のstatus変更を仮定しない。
- Honoの通常Edge-owned body/form/server function入力は固定版 `hono/body-limit` の
  `bodyLimit({ maxSize: 65536 })` を使う。TanStackは固定版のserver entry/公式middleware
  の実装を確認し、parser前にRequest metadataを壊さない最小境界を実装する。Content-Length
  なし、stream、巨大単一chunk、日本語、64KiBちょうど/+1をbyteで検証する。
- 上流content responseはstreamを読みながら1MiBを超えたら502。Content-Lengthだけを信頼せず、
  圧縮や未対応Content-Encodingを無制限展開しない。不正JSON/schema/Content-Type/空bodyも502。
  既存の `readBoundedText` は文字数上限なのでbyte契約へ置き換える場合に回帰を置く。
  clone/teeの片枝cancelが処理を止める実装にしない。事前Node検証で現行実装の欠陥を断定しない。
- Edge生成応答には必要なsecurity headersを付け、Rails応答のheadersは上書きしない。
  CSPはproductionでwildcard、unsafe-inline、unsafe-evalを許可しない。TanStackのnonceと
  hydrationを実ブラウザで確認する。CORSは今回新規許可しない。
- request IDはEdge入口で生成し、外部の同名headerを無条件採用しない。内部hopには生成値だけを
  伝え、ログは固定service/env/method/route class/status/duration/粗い分類のallowlistとする。
  Cookie、Authorization、Set-Cookie、JWT、任意query/path、body、例外message/stackは出さない。
  既存のsanctioned emitter以外にconsoleを追加しない。

### cacheとService Worker

- Hono 5面はoffline route/markup、登録script、SW本体、offline目的のmanifest参照、関連する
  header/import/test/docsを追跡して撤去する。favicon等の無関係なbranding assetは残す。
  既に登録されたbrowser SWをこのlocal変更だけで撤去済みとは主張しない。deployment/登録の
  事実が確認できず、deployも禁止されているため、同じscript URLの撤去更新が必要かは別の
  rollout工程として記録する。
- TanStack 15面はoffline文書と最低限の静的assetだけを保存し、認証HTML、JWT、API/RPC、
  個人化response、Cookie依存dashboardを保存しない。Rails-owned path、OIDC、sign-out、API、
  RPC、JS/CSSをoffline HTMLへfallbackさせない。HTTP 404/500はnetwork failureにしない。

## やること、やらないこと、Rails待ち

### 今回やること

- Honoのlanguage Cookie保存停止。
- Hono offline撤去と既存HTTP/API/assetテストの実契約への更新。
- Edge-owned入口のHost、request ID、security headers、3秒応答制限、body上限。
- 12面public clientと3面Core clientの2秒制限、byte本文上限、schema/HTTP写像の境界。
- Core Rails-owned透過中継の2秒制限、504/503区別、所有権・header・Cookie・bodyの回帰。
- TanStack offlineのpath除外と個人化response非cacheの回帰。
- TanStack 15面のParaglide生成カタログ、request isolation、Cookie保存なしのlocale境界。
- 現行ADR/docsとの整合記録、実行した検証のevidence。

### 今回やらないこと

新JWT/JWKS/ES384/claim、OIDC/login/logout/refresh/revoke/session/AAL/認可再設計、Rails修正・
DB/migration・認証設定、deadline propagation、CORS許可、retry/circuit breaker/tracing、
独自HTML cache、jump.umaxica.net署名仕様、production binding fail-fast、dashboard認証の
偽装・匿名公開、query canonical採用、英語canonical統合、全体noindexを行わない。

### Rails完成待ちまたは実環境待ち

- Rails Preferenceの参照契約は指定SHAで確認済み。TanStackの公開`lx` routing、公開SSR/CSR初期locale、
  invalid `lx` URL正規化への接続は、現行のpath localeと未承認のquery canonical方針が衝突するため保留。
  Core 3面のrequest-local locale境界と、15面の生成カタログ自体はP3dでRails不要の範囲を実装した。
- Rails-owned URLの残存routeとauth/base linkの最終照合。
- production VPC/Bindingの存在、実RailsのContent-Type/schema/status、Railsがrequest IDを
  採用するか、実ネットワークのtimeout/途中切断。
- 既存Hono SW登録者への限定撤去更新を実施するかと、そのrollout後のscript削除。
- canonical/hreflang/sitemapとlocale URLの公開方針。

## 工程とcommit境界

各工程は `狙い → 現行挙動を固定する/変更を表す failing test → 最小修正 → green →
refactor → 回帰 → commit` の順にする。redだけのcommitは作らない。

### P0 — 計画、baseline、審査（このcommit）

対象: この計画とbaseline evidenceのみ。

受入条件: 20面、dirty diff、Rails待ち、契約分割、適用除外、現物根拠、検証層、復帰境界、
未確定事項を記載し、自己レビューでGO/保留を判定する。P0のGOは全体完成のGOではなく、
Rails不要で隔離できるP1/P2/P4/P5の着手GOである。

想定commit: `docs: record parallel Edge implementation plan`

### P1 — HonoのCookie保存停止とoffline撤去

対象: 5 apexのlanguage detector、offline route/markup、登録script/SW、offline目的の
manifest/link/header/import/test/docs。HonoのAccept-Language検出とVaryは維持する。

受入: `Set-Cookie`が出ないこと、既存i18n/Vary/health/status/CSRF/404/429が実HTTPでgreen、
offline資材がHonoに残っていないことをVitest/Hurlで確認する。既存登録済みSWの撤去完了は
判定しない。

想定commit: `fix: stop Hono preference writes and remove offline fallback`

復帰境界: P1 commit単位でHono 5面のソース撤去を戻せる。利用者差分はstageしない。

### P2 — Edge入口と安全な応答境界

対象: apex、Core、12 public frameの入口。Host allowlist、request ID、3,000ms Edge応答、
Hono標準bodyLimit、TanStack公式CSRF/request middlewareの固定版適用位置、Edge生成応答の
security headersを実装する。CoreのRails-owned responseはEdge headersで上書きしない。

受入: unknown Hostで外向きmockが呼ばれない、正規local/previewを拒否しない、405/415/413/
429/500/timeoutにheadersと正しいstatusが付く、Server Function正規CSRFと拒否が実動作で確認できる。

想定commit（規模が大きければテストとgreenが保てる単位に再分割）:
`feat: harden Edge request boundaries`

P2は契約衝突を隠さないため、次の独立sliceへ分ける。**P2a**はRailsを必要としないapex
5面のrequest ID、allowlist logger、Edge生成応答へのrequest ID header、エラー時のログ一本化で、
実装してgreenになったらcommitする。**P2b**はHost allowlist、Coreの生成応答、12 public frameの
入口、TanStackのCSRF/request middleware位置とbody上限である。infoのregionなし契約、Rails Preference
契約の読み取り、
Coreの透過中継境界と同じ変更で混ぜると誤判定になるため、P2bの各sliceは現物契約を固定してから
個別にGO判定する。P2a完了はP2全体や20面完了を意味しない。

**P2b-apex** は5 apexのHost境界だけを先行実装した。現行の各`vite.config.ts`の公開Host、
`wrangler.jsonc`のWorker名、`workers_dev`/`preview_urls`、`EDGE_ENV`を根拠に、公開Hostと当該
Workerのworkers.dev previewを許可し、非productionだけlocalhost/loopbackを許可する。判定には
`new URL(request.url).hostname`だけを使い、`X-Forwarded-Host`を使わない。request ID、security
headers、構造化ログを有効にした後、rate limiter・CSRF・routeより前に未知Hostを421で止める。
CSRF origin判定も同じunit内の導出値を参照し、allowlistを二重管理しない。実装と受入結果は
`evidence/2026-09-15-apex-host-boundary.md`に記録する。Core、12 public frame、TanStackの
入口はこのcommitの対象外で、各々のHost/transport/region契約を確認してから別GO判定する。

**P2b-core** は3 CoreのHost境界を追加した。各unitのcanonical origin、Viteの`jp`/`us`
`allowedHosts`、wranglerのWorker名と`workers_dev`設定から公開Hostと当該Workerの
`workers.dev` host形状を導出し、非productionだけlocalhost/loopbackを許可する。未知Hostは
`X-Forwarded-Host`を参照せず、rate limit、Rails dispatch、application handlerより前に421で
終了する。Railsの`RAILS_ORIGIN`は現行wrangler設定にまだ存在しないため、dispatchの環境値は
防御的に読み、未設定時のfail-closed契約を維持する。CoreのRails透過中継、public 12面、
TanStack入口はこのsliceの対象外である。実装と受入結果は
`evidence/2026-09-15-core-host-boundary.md`に記録する。

**P2c — Edge-owned request boundary completed.** 5 apex、3 Core、12 public frameに、
未知Hostをlimiter・外向き通信・routerより前に421で拒否する入口を適用した。正規custom host、
現行Workerのpreview host、非productionのlocal hostは設定由来で許可し、`X-Forwarded-Host`は
使わない。apexは固定版Honoの公式`bodyLimit({ maxSize: 65_536 })`を使い、public/Coreは
parserへ渡す前にContent-LengthなしのstreamもUTF-8 byteで読み、上限超過を413、非identity
Content-Encodingを415とした。CoreのRails-owned中継はこの上限から除外し、通常のapplication
requestだけをCookie除去後にbounded Requestへ再構成する。各入口の応答生成は3,000msで、
timeout時は固定503とし、signal、timer、遅延reject、reader解放を回帰へ置いた。

さらに15 TanStack unitへ、unit内のrequest-local isolationを使う生成UUID、外部
`X-Request-ID`の不採用、最終statusを付けた一件の`edge_request`完了ログを導入した。
public/Core clientにはこの生成値だけを許可されたRails hopへ渡し、CoreのRails-owned
透過中継は`rails_dispatch`を一件の完了ログとして使って重複を避ける。ログのroute、method、
environment、status、duration、outcomeは閉じた値だけで、query、path、header、body、
例外文字列は出さない。

TDDのgreenはapex各16件、Core各54件、public各35件のfocused Vitestで、対象20面すべて
passした。変更pathのOxfmt・Oxlint・type-aware Oxlint、apex/Coreのtypecheckもpassした。
publicのunit-wide typecheckは既存の`test/uncovered-components.test.tsx`型エラーで停止し、
unit-wide lintは既存生成`.astro`型宣言の診断で停止した。Hostの偽プレビュー受入を追加で
検出・修正し、stage差分とpre-commit hookを通過させた。実装・検証の詳細はP2境界commitに
記録され、Rails、JWT、VPC、production変更はない。実装・検証の詳細は
`evidence/2026-09-15-edge-request-logging.md`にも記録する。

### P3 — TanStack locale/region/public shell

#### P3a — Rails Preference契約の読み取りレビュー（完了）

指定SHAの現物から、次の契約を固定した。

- `config/initializers/locale.rb` の有効localeは `en` と `ja`。Railsの
  `PreferenceBase#normalized_locale` は入力を小文字化し、`I18n.available_locales` にない値を
  無効として扱う。
- `app/controllers/concerns/preference_io_keys.rb` のlanguage Cookie名は `language`。
  `PreferenceBase::LANGUAGE_COOKIE_KEY`も同じ値を参照する。`PreferenceGlobal`の`lx`は
  request-local overlayで、入力を正規化してから有効値だけを残す。
- `RequestContextContract`のregionは`jp`/`us`、defaultは`jp`。`lx`は`ri`と異なり、
  有効localeかどうかをRailsのavailable localeで判定する。
- `PreferenceLocalization`はActorのPreferenceとdefault localeからRailsのI18n localeを決める。
  Railsのlanguage Cookieはブラウザ向けの書き込みミラーであり、Rails自身のPreference JWTや
  DBの代替ソースとして信頼しない。Edgeが公開表示用に読み取る場合も、Cookie値を認証・認可や
  Rails credential hopへ渡さない。

この確認により、固定値を推測することを理由にしたP3の阻害は解消した。

#### P3b — 公開URLへのlocale接続（保留）

現行TanStack 12面は `/{lang}/...` をroute、canonical、hreflang、sitemap、Railsの
`locale=`に一貫して使っている。ユーザー決定の新契約は有効な`lx` → Rails発行の有効な
`language` Cookie → `ja`であり、Accept-Language、navigator、path prefixを新しいfallbackに
しない。ここで`lx`またはCookieを画面localeへ接続すると、たとえば`/ja/?lx=en`のHTMLが英語に
なり、現在の`/ja/` canonicalと矛盾する。

query付きcanonicalを採用する明確な承認はまだない。path URLからquery URLへの移行、旧URLの
redirect、相互hreflang、sitemap、公開画面への`lx`接続、無効`lx`の有限な同一origin正規化は
一つの公開URL/SEO工程として審査するまで変更しない。認証依存のdashboard接続と
region linkも同じく保留し、現在の認証ガードを弱めない。

判定: **P3aはGO（契約確認のみ）、P3bはNO-GO（公開URL・SEO契約未承認）**。P3全体を完了扱い
にせず、現行locale実装をAccept-Languageの都合で改変しない。

#### P3c — info 3面のglobal host境界（今回追加、GO）

既存の `docs/operations/cloudflare-tunnel-development.md`、`adr/008`、現物の各
`info/vite.config.ts`のallowlistは、`info.umaxica.{app,com,org}`をregionなしのhostとして
扱っている。一方、各infoのcell定義だけが`info-jp`/`info-us`を生成し、canonicalとHurlの
期待値を誤ったhostへ向けていた。

P3cではinfo 3面のcell-owned canonical originを同一のglobal hostへ揃え、cell invariantと
実HTTPのmetadata期待値を更新する。docs/news/help 9面の`<surface>-jp/us`、infoのRails
private origin、`PUBLIC_REGION`による他surfaceのregional buildは変更しない。これはlocale
query、Paraglide、認証、canonical方針の移行ではなく、既に確認済みのinfo host表への修正である。

受入条件は、info 3面のcellテスト・host policy・canonical regionテスト、rootの12-cell
invariant、各infoのHurl metadata、変更pathのformat/lintがgreenになること。専用portの
`test:api`でinfo 3面を再確認し、docs/news/helpのregional hostテストも回帰させる。

判定: **GO（info hostの既存設定と実測文書が一致し、locale/SEO移行から隔離できる）**。

実装と検証は `84d6f22f` で完了した。結果は
`evidence/2026-09-15-info-global-host.md` に記録する。

#### P3d — Paraglide生成境界とrequest isolation（完了、P3bとは分離）

Railsの指定SHAで確認した`ja`/`en`、`language` Cookie、`lx`の正規化を根拠に、公開URLの
採否を決めずにTanStackの翻訳実装境界だけを進める。15面それぞれに`project.inlang`、
`messages/{ja,en}.json`、Paraglide Vite plugin、ローカルの生成出力設定を置き、unit固有の
単独build/test境界を維持する。strategyは`custom-edge-locale`と`baseLocale`だけとし、
Cookie、Accept-Language、navigator、localStorage、path prefixをParaglideのfallbackや
永続化へ使わない。

12 public面は既存の`/{lang}/...` route、canonical、hreflang、sitemapを維持したまま、既存の
URL locale adapterから生成メッセージを参照する。公開`lx`をroute表示へ接続する変更はP3bの
審査対象なので行わない。公開面の表示locale resolverと境界テストは、Rails契約の値を固定する
純粋処理として実装し、公開URL移行の判断とは分離する。

3 Core面は、Worker入口で`lx`またはRails発行の`language` Cookieを検証してからCookieを
TanStackへ渡さず、request-localな内部locale headerへ変換する。偽造された同名内部headerは
上書きし、server-side Paraglide middlewareのrequest isolationと、HTMLの`lang`を基準にした
client strategyを使う。`setLocale()`はCookie、JWT、DB、localStorage、URLを書き換えない。
認証Cookie、JWT decode、dashboard認証はこの工程に含めない。

TDDでは旧辞書前提のroot title invariantが6件FAILになったため、生成catalog/page title契約を
検査する最小更新を行いgreenへ戻した。15面のunit test、変更pathのformat/lint、Paraglide
invariant、Coreの同時`ja`/`en` request isolationを確認した。P3dの受入は「生成catalogが各unitで
再現可能」「Coreのlocaleがrequest-local」「Cookie保存なし」「公開URL/SEO未変更」である。

判定: **GO（Paraglide生成境界とCore request isolationの独立slice）**。`197b5e8b`で実装・
テスト・commitを完了した。P3bの公開`lx` URL/SEO接続、invalid `lx` URL正規化、region link、
認証依存shellはNO-GOのまま残す。詳細は
`evidence/2026-09-15-paraglide-locale-boundary.md`に記録する。

### P4 — API clientと通信上限

対象: 12 public `rails-client`/entries系、3 Core `rails-client`/health、Core dispatchの
外向き通信。A/B/Cのtransportを混ぜない。

受入: 2秒をheader受信で止めずbody完了まで測定、遅いheader/body/途中停止/reader cleanup、
64KiB/1MiB境界、Content-Lengthなし/不正値/単一巨大chunk/日本語、JSON media type/schema、
404/429/3xx/401/403/5xx/接続不能/timeoutの案件固有写像をVitestとHurlで確認する。

想定commit: `feat: enforce bounded Rails client contracts`

**P4a — public content client boundary completed.** The twelve public cells now
use a direct UTF-8 byte reader for Rails response bodies. The fixed external
request signal is 2,000 ms and is carried from the client into Entries and
Health body reads, so headers arriving before a stalled body do not end the
timeout window. Entries require the existing JSON shape, an
`application/json` media type, identity content encoding, and a 1,048,576-byte
body. Health keeps its existing 65,536-byte JSON contract and reports a body
timeout as unreachable. The existing fixed origin, credential stripping,
manual redirects, VPC-only public transport, and status mapping remain in
place; no Internet fallback or Rails change was introduced.

The TDD red state was four failures in the new byte/signal tests against the
character reader. The green state is the complete public suite for each cell:
27 test files and 290 tests passed, plus the focused client/reader suites of
five files and 93 tests per cell. A body timeout after headers was injected
through the client result signal; an actual delayed-header timeout was tested
with the fixed 2,000 ms signal. The twelve shared-file copies were checked for
identity. Unit-wide lint/typecheck still encounter generated `.astro` lint
diagnostics and an existing `test/uncovered-components.test.tsx` type error;
the changed files pass targeted Oxfmt and Oxlint checks. This slice is approved
and independently reversible, but Core client/dispatch and the 1 MiB
production HTTP evidence remain separate P4/P5 work.

**P4b — Core client and Rails-owned dispatch boundary completed.** The three
Core cells now use the same 2,000 ms external request budget for the health
client and browser-facing Rails dispatch. The client carries its abort signal
through response body reads; Core Health keeps its existing JSON contract with
a 65,536-byte byte limit. A body timeout after headers becomes an unreachable
health result. The Core dispatcher remains a separate transparent relay: it
streams POST bodies, does not apply the public client JSON limits, does not
follow redirects, and returns Rails status, `Location`, `Set-Cookie`,
`Content-Type`, cache headers, and body unchanged. Missing or unreachable Rails
is 503; an upstream timeout is 504; neither failure reaches the TanStack
handler. The current Core configurations still have no `RAILS_ORIGIN`, so the
production path remains fail-closed and no VPC or Internet fallback was added.

The TDD red state included the three new bounded-reader suites failing before
the new module existed and the existing worker tests rejecting the intentional
503-to-504 timeout contract change. Green verification is 354 tests in each of
`app/core` and `com/core`, 361 in `org/core`, the five-file focused suite with
126 tests per Core, root Core/health invariants with 205 tests, all three Core
Hurl suites with 34 requests each, and target plus unit lint, type-aware lint,
Knip, and typecheck. The three Core copies of the shared health/client/reader
files were checked for identity. Production Cloudflare bindings, live Rails,
and browser E2E were not exercised. This slice is independently reversible.
The TanStack offline policy and its browser/runtime verification were completed
in P5a; final combined verification is tracked in P6.

**P4c — Public 404 contract completed.** 12 public cells now distinguish the
fixed endpoint shapes already present in `rails-entries.ts`: a 404 from the
detail path `/api/v0/entries/{public_id}` confirms that the requested Entry is
absent, while a 404 from the collection path `/api/v0/entries` does not identify
a missing page and remains an upstream error. The latter reaches the existing
public mapping as 502; the former remains 404. No Rails error field or new
route was invented. The three-file focused suite (`rails-entries`, publishing
API and publishing data) passed 59 tests in every cell, and the collection
404-to-502 behavior is asserted at the page view boundary. The twelve copies
were checked for identity. This is an independently reversible client contract
slice; the Rails fixed SHA and live response contract remain unverified.

### P5 — TanStack offlineとCore透過中継

対象: 15 frameのSW、3 CoreのRails-owned path tests。Hono offline撤去とは別に扱う。

受入: network failure時だけ許可pathのoffline文書、Rails-owned/OIDC/sign-out/API/RPC/JS/CSS
ではfallbackしない、HTTP errorは隠さない、Cache Storageにpersonalized responseを保存しない。
Rails中継ではstatus/Location/Set-Cookie/Content-Type/body、Cookie/CSRF、POST stream、
3xx/401/403/404/405/5xxを維持し、timeoutは504、失敗時はfall-throughしない。

想定commit: `test: lock offline and Rails passthrough boundaries`

**P5a — TanStack offline boundary completed.** The fifteen TanStack cells now
serve a fixed, nonce-free offline HTML response only for same-origin GET
document navigations whose network fetch rejects. HTTP 404/500 responses remain
HTTP error documents. API, Rails-owned, OIDC, sign-out, health, metadata,
cross-origin, non-GET, JS/CSS and RPC requests never receive the HTML fallback.
Only the fixed response is stored in a namespaced Cache Storage entry; old
entries owned by this SW may be removed, while unrelated origin caches remain.
The online `/offline` route remains for its normal HTTP contract, but it is not
the response cached by the SW, so authentication, Preference and request nonce
state cannot enter the offline document.

The TDD red state was the new SW contract test against the previous
`offline-v1` implementation. Green verification is the complete suite in all
fifteen frames, plus Chromium e2e in all fifteen frames: public cells passed
15 tests each and Core cells passed 10 tests each. The source and shared test
copies were hash-checked. A first parallel Vitest attempt hit the machine's
thread/process limit; the same checks were rerun sequentially and passed. The
P5 Core passthrough portion is covered by the completed P4b dispatch slice and
its 3-Core Vitest/Hurl regression evidence. This slice is independently
reversible; production Cloudflare, workerd binding and live Rails remain
unverified.

### P6 — 回帰、build、docs、最終審査

対象: 20面の必要なunit check/typecheck/test/build、Hurl、利用可能なPlaywright、root
architecture/dependency/evidence/invariant、ADR/docsと未解決課題。

受入: `pnpm run build` 後に `pnpm run check:size`、client-observable変更後に安全な専用portの
`pnpm run test:api`、CSP/SW/hydrationはChromiumが利用可能な場合に`pnpm run test:e2e`を実行。
実行不能、既存失敗、Rails未接続はPASSにしない。production相当buildとVite devを混同しない。

想定commit: `docs: record final Edge verification and remaining holds`

**実施結果（2026-09-15、P3d後）**。20 unitのproduction相当build、各unitの専用port Hurl、
sequential Playwright、unit test、worker manifest/generated checks、root invariantを実行した。
最終結果と既存環境要因によるFAILは
`evidence/2026-09-15-edge-final-verification.md`に集約する。

- `pnpm -r --workspace-concurrency=1 run build`: 20 unitすべてPASS。Wranglerのsandbox内ログpath
  警告はあったがartifactは生成され、deployは行っていない。
- `pnpm -r --workspace-concurrency=1 run test`: 20 unitすべてPASS。apexは各107または88、
  Coreはapp/com各432・org439、public 12面は各369 tests。
- `pnpm exec vitest run --dir test`: root invariant 18 files、626 passed / 1 skipped。
- `pnpm --dir <unit> run test:api`: 20 unitすべてPASS。各runnerは専用local serverだけを起動し、
  Railsやproduction endpointへ接続していない。
- `pnpm --dir <unit> run test:e2e`: 20 unitすべてPASS、Chromium 239 cases。sandboxのbind制限を
  切り分けたうえで、各unitをsequentialに実行した。
- `pnpm run check:workers`、`check:generated`、`check:architecture`、`check:deps`、`knip`、
  `check:spelling`: PASS。変更pathのOxfmt/Oxlint/type-aware OxlintとP3dのpre-commit hookもPASS。
- unitごとのtypecheck: 20面すべてPASS。public fixtureの`document.body.append`はWorkers/DOM型の
  overloadに合わせて`appendChild`へ変更し、Paraglide由来の型エラーはない。
- `pnpm run check`: 20面のstatic checksとunit test、root invariantを含めてPASS。過去に追跡された
  stale `.astro`生成物と、timeout状態のtype-aware lint警告を別工程で解消した。
- `pnpm run check:size`: apex 5面は48.46–48.56 kB gzip / 52 kBでPASS。Coreは
  129.82/129、129.83/129、132.97/129 kBでFAIL、public 12面は122.65–122.69/112 kBでFAIL。
  publicの変更前比較は約120.66–120.68 kBで既にbudget超過し、Paraglide後の増分を確認した。
  budget変更や無関係な最適化は行わず、性能後続課題として保留する。
- `git diff --check`とcommit直前のstaged差分レビュー: PASS。owner-unknownの差分は未stageのまま。

P6の文書整合と最終自己審査は完了した。P3aのRails Preference契約監査、P3cのinfo global host
境界、P3dのParaglide生成/request isolation境界は完了した。一方、P3bの公開locale URL接続は
現行path canonicalと未承認のquery canonicalが衝突するためNO-GOのまま、JWT/authentication、
production binding、実workerd/VPC、live Rails、Railsのrequest ID採用、既存browserへのHono SW
撤去rollout、SEO方針は保留である。size budgetは後続課題として、今回の完了判定を広げる理由にはしない。
P6は実装全体をproduction-readyとする判定ではない。

#### P6a — stale Astro生成物・root衛生・型/lintの完了（追加、GO）

現行の12 public unitは`astro.config.mjs`、Astro依存、Astro routeを持たないが、過去のAstro
切替時に生成された追跡済み`.astro` metadataが64ファイル残り、root Oxfmtの対象になっていた。
コードからの参照がないことと、既存の「publicはTanStack Start、Astroなし」invariantを確認し、
metadataを削除して`.gitignore`へ`**/.astro/`を追加した。public matrix invariantにもdirectory
残存チェックを追加した。

同じ静的工程で、Workers/DOM型の`Body.append` overloadに当たる12 public fixtureを
`appendChild`へ修正し、18面のtimeout状態をmutable objectへ保持してtype-aware lintの誤検出を
抑制なしで解消した。rootの4ファイルはOxfmtだけを適用した。業務挙動、HTTP契約、Rails通信、
認証境界は変更していない。

削除前のmatrix invariantは`app/info`の`.astro` directoryを検出してFAILし、削除後は42/42
PASSした。`pnpm run format:check`、`pnpm run lint:types`、全20面typecheck、`pnpm run check`
を再実行し、すべてPASSした。実装・検証は後続の衛生commitとして完了させる。

実装と検証は`6e26c49e`でcommitした。

#### P6b — 現行コード・運用文書の構成記述整合（追加、GO）

現行の5 apex、3 Core、20面のAPI runner、root title invariant、revision/tunnel/ui-shell文書、
ADR 008に残っていた「Astroが現在の実装である」という記述を、現行のTanStack Start/Vite境界へ
最小修正した。履歴としてのADR 004/011/013/015、過去計画、旧構成の再侵入を検出するinvariant
のAstro言及は履歴・検出条件として保持した。

root invariant 18 files（626 passed / 1 skipped）、`pnpm run format:check`、
`git diff --check`を再実行し、実装pathのstaged差分を確認した。実装・検証は`0084cafa`で
commitした。このsliceはコメント、表、検査説明だけの変更であり、HTTP応答、Rails transport、
認証、Cookie、SWの動作を変更しない。

#### P6c — 現行HEAD最終監査（2026-09-17、GO）

`pnpm run check`を権限付きの単独実行で完了させ、`pnpm run build`、20面のunit test、20面の
専用port Hurl、20面の直列Chromium、root invariantを現行HEADで再確認した。sandboxの並列
実行で発生した`spawn EAGAIN`/`EPERM`は、同じコマンドを低負荷・権限付きで再実行して切り分けた。
`pnpm run check:size`は既知のCore/public予算超過を再現したためFAILとして記録し、budget変更や
閾値低下は行っていない。詳細は`evidence/2026-09-17-edge-final-audit.md`にある。

現行worktreeの所有者不明差分は`AGENTS.md`、`package.json`、12 publicの`wrangler.jsonc`、
`pnpm-workspace.yaml`、`pnpm-lock.yaml`であり、今回のstage対象から除外した。P3bの公開locale
URL/SEO接続、Rails/auth、production binding、既存browserへのHono SW撤去rolloutは、契約または
実環境待ちのNO-GO/保留のままである。

## TDDと検証の配置

- 純粋なparser、host/route分類、byte reader、timer、binding差し替え、logger allowlist、
  reader故障は各unitのVitest。
- status/header/body/cookie/redirect/Content-Type等のresponse契約は、そのunitの実サーバーを
  専用portで起動するHurl。既存portに他プロセスがいる場合は停止せず、そのunit検証を保留する。
- hydration、CSP実ブロック、SW登録/撤去/offline、画面復帰はPlaywright。Chromium未導入なら
  install結果を記録し、Vitest/Hurlの代用をbrowser PASSと記載しない。
- 各commit直前: 対象test、必要なunit lint/typecheck、`git diff --check`、staged差分を確認。
  `git add -A` や `git add .` は使わず、変更pathを列挙する。

## P0 baseline（2026-09-15）

実行済み:

- `pnpm install --frozen-lockfile`: PASS。
- `pnpm run check`: FAIL。最初のformat:checkで、既存の無視対象生成物
  `app/{docs,help,info,news}/.astro/*` にformat差分が検出され、後続checkは未実行。
- `pnpm run check:architecture`: PASS。dependency-cruiserは29 modules / 51 depsで違反なし。
- `pnpm run check:deps`: PASS。
- `pnpm run check:spelling`: FAIL。既存の12 Hurlにあるpublic-id fixture markerと、
  `scripts/check-ai-tools`のsandbox tool tokenが合計16件。
- `pnpm run test`: 20 unit suiteはPASS。ただしroot invariant 17 filesは622 passed / 1 skipped / 1 failed。
  `test/dependency-architecture-invariants.test.ts`が`node_modules/.bin/depcruise`のspawnで
  `EPERM`となった。`pnpm run check:architecture`の同じdependency-cruiser検査はPASSしている。

このbaselineのFAILは、P0時点で今回の変更より前に発生したものとして扱う。変更後は同じ
コマンドを再実行し、差分による失敗を既存失敗と分けて記録する。

## 既存文書との衝突と記録方針

- ADR 007/009/010/016/017/018および `docs/development/edge-self-health-api.md` の
  現行path/transport契約は維持する。Coreの公開Internet方針（ADR 018）を12面VPC方針へ
  誤って拡張しない。
- ADR 011/012/013、`docs/design/ui-shell-contract.md`、
  `docs/development/browser-cookie-access.md` のunit境界・Hono/TanStack分離・Cookie API・
  non-stream SSR・Tailwind/asset規則は維持する。
- 古い「Honoがlanguage Cookieを保存する」「Hono offlineが継続する」「Rails通信5秒」の
  記述は、実装commit後に新しいADR/amendmentまたは該当docsの最小範囲だけを更新する。
  closed ADRを履歴ごと書き換えない。
- CORSは「現状は同一origin/server-to-serverで要件を満たし、将来APIが必要ならorigin/method/
  headerを最小許可してテスト・レビューする」と記録する。production binding fail-fastは
  Issue番号を確認できないため番号を作らず、既存Issueの後続課題として扱う。

## P0自己レビューとGO判定

### レビュー観点

1. **契約分離** — public client、Core client、Rails透過中継が同じstatus/body/header処理へ
   流れ込んでいないか。
2. **安全境界** — Rails変更、JWT、認証偽装、Cookie保存、外向きfallback、未知Host、秘密ログ、
   大容量bufferを前提にしていないか。
3. **実行可能性** — RailsなしでP1/P2/P4/P5のfake binding/local stub/TDDが可能か。
4. **現行境界** — 20面の単独build/test、unit固有config、Vite/TanStackの非stream SSR、
   既存のRails Set-Cookie透過を壊さないか。
5. **保留の妥当性** — 確認済みのRails Preference契約と、未決定のcanonical/locale URLを
   混同して推測実装していないか。
6. **検証の誠実性** — baseline FAIL、未実施production/VPC/Chromium検証をPASSにしないか。

### 結果

- P1は、Hono固定版に既に `languageDetector({ caches: false })` の公式型/APIがあり、
  Rails不要の5面変更としてGO。
- P2は、Honoの標準bodyLimitと現行TanStack Start固定版のdefault CSRF middlewareの実装を
  ローカルnode_modulesで確認でき、入口境界をfake bindingでテストできる範囲はGO。ただし、
  独自`start.ts`を追加してCSRFを再構成する工程は、追加APIの必要性が証明されるまで行わない。
- P4は、既存clientの固定origin、schema validator、status mapping、local/fake fetcherがあり、
  Rails接続なしでbyte reader/timer/body/schemaをテストできるためGO。
- P5は、SW sourceとCore dispatchの純粋なpath境界をlocal fixtureで検証できるためGO。
- P3aは指定SHAのPreference実装・テスト・ADRを静的に照合できたためGO。P3bは現行path
  canonicalと未承認のquery canonicalが衝突するためNO-GOとした。公開locale URL、invalid `lx`の
  URL正規化、SEO、認証依存shellは実装しない。後続のP3dでは、この判断に触れないParaglide生成
  catalogとCore request isolationだけを独立して実装する。
- P6のproduction build、専用port Hurl、Chromium、実workerd/VPC、Rails統合は、各工程で
  実行可能性を再確認してから判定する。P0のGOはこれらを実施済みという意味ではない。

P0レビュー後の判定は、Rails待ちのP3bを切り離した **P1/P2/P4/P5とP3a/P3cの限定GO** である。
全20面の最終完成、公開locale URLの移行、production readinessのGOではない。

### P3d 実装後の再審査

- **GO（生成境界とCore request isolation限定）**。固定Rails SHAのlocale/Cookie契約を根拠に、
  15面のParaglide catalogとunit内plugin設定、Core 3面の検証済みdisplay locale header、
  server/clientのrequest isolationを実装した。Cookie、JWT、DB、localStorage、Accept-Language、
  公開path URLを新たな保存/fallbackへ使わないことをテストした。
- **NO-GO（公開URL/SEO slice）**。既存`/{lang}`とcanonical/hreflang/sitemapを維持しており、
  `lx`を公開画面へ接続するquery policy、invalid `lx` URL正規化、region link、認証依存dashboard
  は未承認またはRails/auth契約待ちである。
- **検証範囲**。15面の生成・unit test、Core同時locale isolation、root invariant、production build、
  local Hurl/Chromiumを実行した。実Rails、production VPC/binding、Rails認証、公開SEO方針は未確認。

### P2b-apex 実装後の再審査

- **GO（apex Host slice限定）**。5 apexすべてで公開Host、preview、開発localの現物設定を確認し、
  pure policy、実appの421、limiter前停止、request ID/security headers/最終statusログ、
  `X-Forwarded-Host`無視をテストできた。Rails、JWT、認証、外向き通信に依存しない。
- **未着手・別審査**。CoreのRails-owned透過中継、public 12面のregion/VPC client、TanStack 15面の
  Host/CSRF/body境界は、同じ変更へ混ぜていない。P3bの公開locale URL/SEO契約によるNO-GOも変わらない。
- **環境上の確認範囲**。unknown Hostを実Vite Hurlで送るとViteの`allowedHosts`がWorkerより前に
  拒否し得るため、Workerの未知Host境界はVitestの実app driverで確認し、実HTTPでは許可Hostに
  `X-Forwarded-Host`を付けても選択が変わらないことを確認した。production custom domainや
  workers.devの実配備、実Cloudflare bindingは未確認である。

### P2b-core 実装後の再審査

- **GO（3 Core Host slice限定）**。3 Coreで設定由来の公開Host、workers.dev host形状、非production
  local/loopbackをpure policyで固定し、実Worker entryで未知Hostを421、limiter/Rails/application
  前で拒否する回帰を置いた。`X-Forwarded-Host`は選択に使わない。Rails変更、JWT、認証、VPCに依存しない。
- **未着手・別審査**。3 CoreのRails透過中継のtimeout・header・Cookie・body契約、12 public frameの
  VPC client、TanStack 15面のHost/CSRF/body境界はこのsliceに含めない。P3bの公開locale URL/SEO
  契約によるNO-GOも変わらない。
- **環境上の確認範囲**。各Coreの専用local serverに対する既存HurlとHost headerケースは実行したが、
  production custom domain、実workers.dev配備、Cloudflare binding、Rails接続は未確認である。

## 復帰・残件・最終報告

各機能commitは単独でrevert可能な境界にする。generated `routeTree.gen.ts` はbuild/pluginの
生成結果として必要な場合だけ更新し、user差分を含むfileをrestoreしない。新しい非阻害の
設計問題は `misc.md` の現行形式を確認してから後続課題へ記録し、安全性に直結する問題は
現工程で解消する。

最終報告には、P0レビュー結果、実装/保留工程、commit SHA、実コマンド結果、baselineと新規FAIL、
未実施検証、Rails待ち・SEO未決定・SW撤去rollout、plan/evidence/ADR/misc path、Railsコード・
実環境・remote GitHubを変更していないことを日本語で記載する。
