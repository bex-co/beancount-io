export interface TranslationEntry {
  message: string;
  description: string;
}

const jaSeo: Record<string, TranslationEntry> = {
  "seo.authCallback.description": {
    message: "Beancountへのサインインを完了しています。",
    description: "Auth callback page meta description",
  },
  "seo.authCallback.title": {
    message: "サインイン中",
    description: "Auth callback page title",
  },
  "seo.deviceAuth.description": {
    message: "Authorize CLI access to your Beancount account.",
    description: "Device auth page meta description",
  },
  "seo.deviceAuth.title": {
    message: "Authorize CLI Access",
    description: "Device auth page title",
  },
  "seo.dashboard.description": {
    message:
      "Beancountダッシュボード。台帳にアクセスして財務データを管理できます。",
    description: "Dashboard page meta description",
  },
  "seo.dashboard.title": {
    message: "ダッシュボード",
    description: "Dashboard page title",
  },
  "seo.forgotPassword.description": {
    message:
      "メールアドレスを入力してBeancountアカウントのパスワードをリセットします。",
    description: "Forgot password page meta description",
  },
  "seo.forgotPassword.title": {
    message: "パスワードを忘れた場合",
    description: "Forgot password page title",
  },
  "seo.home.description": {
    message:
      "Beancountによるプロフェッショナルなプレーンテキスト会計。強力で正確、監査可能な会計で財務を追跡し、台帳を管理し、レポートを生成できます。",
    description: "Home page meta description",
  },
  "seo.home.title": {
    message: "Beancount ダッシュボード - プレーンテキスト会計",
    description: "Home page title",
  },
  "seo.ledgerAccount.description": {
    message: "{ledgerName}の{accountName}のアカウント詳細と取引履歴。",
    description: "Account detail page meta description",
  },
  "seo.ledgerAccount.title": {
    message: "{accountName} - {ledgerName}",
    description: "Account detail page title with account and ledger name",
  },
  "seo.ledgerAsk.description": {
    message:
      "AIを使用して{ledgerName}の財務データについて質問します。取引の分析、口座残高の確認、トレンドの把握、会計インサイトの即時取得が可能です。",
    description: "Ask AI page meta description for SEO",
  },
  "seo.ledgerAsk.title": {
    message: "{ledgerName}について質問する - AI財務アシスタント",
    description: "Ask AI page title with ledger name for SEO",
  },
  "seo.ledgerBalanceSheet.description": {
    message:
      "{ledgerName}の貸借対照表レポート。資産、負債、純資産を一目で確認できます。",
    description: "Balance sheet page meta description",
  },
  "seo.ledgerBalanceSheet.title": {
    message: "貸借対照表 - {ledgerName}",
    description: "Balance sheet page title with ledger name",
  },
  "seo.ledgerCommodities.description": {
    message:
      "{ledgerName}の商品リストと価格。通貨、株式、その他の資産を追跡できます。",
    description: "Commodities page meta description",
  },
  "seo.ledgerCommodities.title": {
    message: "商品 - {ledgerName}",
    description: "Commodities page title with ledger name",
  },
  "seo.ledgerDashboard.description": {
    message:
      "すべてのBeancount台帳を表示・管理します。新しい台帳を作成したり、既存の台帳にアクセスしたり、財務記録を整理できます。",
    description: "Ledger dashboard page meta description",
  },
  "seo.ledgerDashboard.title": {
    message: "マイ台帳",
    description: "Ledger dashboard page title",
  },
  "seo.ledgerDocuments.description": {
    message:
      "{ledgerName}のドキュメント添付と領収書。取引のサポートファイルを整理できます。",
    description: "Documents page meta description",
  },
  "seo.ledgerDocuments.title": {
    message: "ドキュメント - {ledgerName}",
    description: "Documents page title with ledger name",
  },
  "seo.ledgerErrors.description": {
    message:
      "{ledgerName}の検証エラーと警告。台帳の問題を確認して修正できます。",
    description: "Errors page meta description",
  },
  "seo.ledgerErrors.title": {
    message: "エラー - {ledgerName}",
    description: "Errors page title with ledger name",
  },
  "seo.ledgerEvents.description": {
    message:
      "{ledgerName}のイベントタイムライン。重要な財務イベントとマイルストーンを追跡できます。",
    description: "Events page meta description",
  },
  "seo.ledgerEvents.title": {
    message: "イベント - {ledgerName}",
    description: "Events page title with ledger name",
  },
  "seo.ledgerFiles.description": {
    message:
      "{ledgerName}の台帳ファイルを編集します。Beancountの会計ファイルを表示・変更できます。",
    description: "File editor page meta description",
  },
  "seo.ledgerFiles.title": {
    message: "ファイル - {ledgerName}",
    description: "File editor page title with ledger name",
  },
  "seo.ledgerFilesCreate.description": {
    message:
      "{ledgerName}に新しいファイルを作成します。アカウント、取引、その他のBeancountエントリを追加できます。",
    description: "Create file page meta description",
  },
  "seo.ledgerFilesCreate.title": {
    message: "ファイルを作成 - {ledgerName}",
    description: "Create file page title with ledger name",
  },
  "seo.ledgerFilesUpload.description": {
    message:
      "{ledgerName}にファイルをアップロードします。既存のBeancountファイルやドキュメントをインポートできます。",
    description: "Upload files page meta description",
  },
  "seo.ledgerFilesUpload.title": {
    message: "ファイルをアップロード - {ledgerName}",
    description: "Upload files page title with ledger name",
  },
  "seo.ledgerGallery.description": {
    message:
      "公開Beancount台帳のサンプルとテンプレートを閲覧します。自分の財務管理設定のインスピレーションを見つけましょう。",
    description: "Ledger gallery page meta description",
  },
  "seo.ledgerGallery.title": {
    message: "台帳ギャラリー",
    description: "Ledger gallery page title",
  },
  "seo.ledgerHoldings.description": {
    message:
      "{ledgerName}の投資保有資産とポートフォリオ。現在のポジションと評価額を表示できます。",
    description: "Holdings page meta description",
  },
  "seo.ledgerHoldings.title": {
    message: "保有資産 - {ledgerName}",
    description: "Holdings page title with ledger name",
  },
  "seo.ledgerImport.description": {
    message:
      "CSV、PDF、OFX、または画像ファイルから{ledgerName}に取引をインポートします。銀行明細と領収書のAI搭載解析機能付き。",
    description: "Import page meta description",
  },
  "seo.ledgerImport.title": {
    message: "スマートインポート - {ledgerName}",
    description: "Import page title with ledger name",
  },
  "seo.ledgerIncomeStatement.description": {
    message:
      "{ledgerName}の損益計算書レポート。収益、支出、純利益を時系列で追跡できます。",
    description: "Income statement page meta description",
  },
  "seo.ledgerIncomeStatement.title": {
    message: "損益計算書 - {ledgerName}",
    description: "Income statement page title with ledger name",
  },
  "seo.ledgerJournal.description": {
    message:
      "{ledgerName}の取引仕訳帳。すべての会計エントリを表示、検索、フィルタリングできます。",
    description: "Journal page meta description",
  },
  "seo.ledgerJournal.title": {
    message: "仕訳帳 - {ledgerName}",
    description: "Journal page title with ledger name",
  },
  "seo.ledgerOverview.description": {
    message:
      "{ledgerName}の財務概要とレポート。純資産、収入、支出、資産配分を表示できます。",
    description: "Ledger overview page meta description",
  },
  "seo.ledgerOverview.title": {
    message: "概要 - {ledgerName}",
    description: "Ledger overview page title with ledger name",
  },
  "seo.ledgerQuery.description": {
    message:
      "BQL構文で{ledgerName}を照会します。カスタムクエリを実行して財務データを分析できます。",
    description: "BQL query page meta description",
  },
  "seo.ledgerQuery.title": {
    message: "BQLクエリ - {ledgerName}",
    description: "BQL query page title with ledger name",
  },
  "seo.ledgerSettings.description": {
    message:
      "{ledgerName}の台帳設定を構成します。台帳の設定、アクセス、オプションを管理できます。",
    description: "Ledger settings page meta description",
  },
  "seo.ledgerSettings.title": {
    message: "台帳設定 - {ledgerName}",
    description: "Ledger settings page title with ledger name",
  },
  "seo.ledgerStatistics.description": {
    message:
      "{ledgerName}の統計分析。財務データの指標、トレンド、インサイトを表示できます。",
    description: "Statistics page meta description",
  },
  "seo.ledgerStatistics.title": {
    message: "統計 - {ledgerName}",
    description: "Statistics page title with ledger name",
  },
  "seo.ledgerTrialBalance.description": {
    message:
      "{ledgerName}の試算表レポート。アカウントの借方と貸方の等式を検証できます。",
    description: "Trial balance page meta description",
  },
  "seo.ledgerTrialBalance.title": {
    message: "試算表 - {ledgerName}",
    description: "Trial balance page title with ledger name",
  },
  "seo.login.description": {
    message:
      "Beancountアカウントにサインインして、財務台帳と会計記録を管理します。",
    description: "Login page meta description",
  },
  "seo.login.title": {
    message: "サインイン",
    description: "Login page title",
  },
  "seo.logout.description": {
    message: "Beancountアカウントからサインアウトしています。",
    description: "Logout page meta description",
  },
  "seo.logout.title": {
    message: "サインアウト",
    description: "Logout page title",
  },
  "seo.notFound.description": {
    message:
      "お探しのページは存在しません。移動または削除された可能性があります。",
    description: "404 page meta description",
  },
  "seo.notFound.title": {
    message: "ページが見つかりません",
    description: "404 page title",
  },
  "seo.resetPassword.description": {
    message: "Beancountアカウントの新しいパスワードを作成します。",
    description: "Reset password page meta description",
  },
  "seo.resetPassword.title": {
    message: "パスワードをリセット",
    description: "Reset password page title",
  },
  "seo.settingsDangerZone.description": {
    message:
      "アカウントとすべてのデータの完全削除などの破壊的なアカウント操作を管理します。",
    description: "Danger zone settings page meta description",
  },
  "seo.settingsDangerZone.title": {
    message: "危険ゾーン",
    description: "Danger zone settings page title",
  },
  "seo.settingsGeneral.description": {
    message: "プロフィール情報、言語設定、一般的なアカウント設定を更新します。",
    description: "General settings page meta description",
  },
  "seo.settingsGeneral.title": {
    message: "一般設定",
    description: "General settings page title",
  },
  "seo.settingsSshKeys.description": {
    message:
      "Git経由でBeancountの台帳に安全にアクセスするためのSSHキーを管理します。",
    description: "SSH keys settings page meta description",
  },
  "seo.settingsSshKeys.title": {
    message: "SSHキー",
    description: "SSH keys settings page title",
  },
  "seo.signUp.description": {
    message:
      "無料のBeancountアカウントを作成して、プレーンテキスト会計で財務管理を始めましょう。",
    description: "Sign up page meta description",
  },
  "seo.signUp.title": {
    message: "アカウントを作成",
    description: "Sign up page title",
  },
  "seo.signUpOtp.description": {
    message: "メールアドレスを確認してBeancountアカウントの登録を完了します。",
    description: "OTP verification page meta description",
  },
  "seo.signUpOtp.title": {
    message: "メールを確認",
    description: "OTP verification page title",
  },
  "seo.welcome.description": {
    message:
      "Beancountへようこそ！プレーンテキスト会計と財務管理を始めましょう。",
    description: "Welcome page meta description",
  },
  "seo.welcome.title": {
    message: "ようこそ",
    description: "Welcome page title",
  },
  "seo.error.description": {
    message:
      "このページの読み込み中にエラーが発生しました。再試行するか、ホームページに戻ってください。",
    description: "Error page meta description",
  },
  "seo.error.title": {
    message: "エラー",
    description: "Error page title",
  },
  "seo.ledgerCommits.description": {
    message:
      "{ledgerName}のコミット履歴とバージョン管理を表示します。台帳ファイルへの変更を時系列で追跡できます。",
    description: "Commits page meta description",
  },
  "seo.ledgerCommits.title": {
    message: "コミット - {ledgerName}",
    description: "Commits page title with ledger name",
  },
  "seo.ledgerPullRequest.description": {
    message:
      "{ledgerName}のプルリクエストの変更をレビューします。台帳への変更提案を承認または却下できます。",
    description: "Pull request page meta description",
  },
  "seo.ledgerPullRequest.title": {
    message: "プルリクエスト #{prNumber} - {ledgerName}",
    description: "Pull request page title with PR number and ledger name",
  },
  "seo.plaidSettings.description": {
    message:
      "Plaidを使用して{ledgerName}に銀行口座を接続します。取引を自動インポートして財務データを同期できます。",
    description: "Plaid settings page meta description",
  },
  "seo.plaidSettings.title": {
    message: "接続済みの口座 - {ledgerName}",
    description: "Plaid settings page title with ledger name",
  },
  "seo.plaidConnections.description": {
    message:
      "Manage your connected bank accounts for {ledgerName} — link new banks, update account mappings, sync, or disconnect.",
    description: "Plaid connections management page meta description",
  },
  "seo.plaidConnections.title": {
    message: "Manage Bank Connections - {ledgerName}",
    description: "Plaid connections management page title with ledger name",
  },
};

export default jaSeo;
