export interface TranslationEntry {
  message: string;
  description: string;
}

const jaCommon: Record<string, TranslationEntry> = {
  "common.accountColumn": {
    message: "アカウント",
    description: "Table column header for account names",
  },
  "common.actions": {
    message: "アクション",
    description: "Plural form of actions",
  },
  "common.back": {
    message: "戻る",
    description: "Button label to go back to previous page",
  },
  "common.beancountLogo": {
    message: "Beancount ロゴ",
    description: "Alt text for Beancount logo",
  },
  "common.cancel": {
    message: "キャンセル",
    description: "Button label to cancel action",
  },
  "common.clearInput": {
    message: "クリア",
    description: "Aria label for clear input button",
  },
  "common.closeDialog": {
    message: "閉じる",
    description: "Screen reader label for close dialog button",
  },
  "common.collaboratorsLimit": {
    message: "コラボレーター制限",
    description: "Title for collaborator limit information",
  },
  "common.collaboratorsLimitReached": {
    message: "コラボレーター制限に達しました",
    description: "Title when collaborator limit is reached",
  },
  "common.copied": {
    message: "コピーしました",
    description: "Status message indicating content was copied",
  },
  "common.copy": {
    message: "コピー",
    description: "Button label to copy content",
  },
  "common.delete": {
    message: "削除",
    description: "Button label to delete item",
  },
  "common.directives": {
    message: "directives",
    description:
      "Unit label for beancount directive count (e.g. '842 / 1000 directives')",
  },
  "common.directivesLimitApproaching": {
    message: "Approaching your free plan limit",
    description:
      "Secondary text shown when a ledger's directive usage is between 90% and 100% of the free-tier limit",
  },
  "common.directivesLimitReached": {
    message: "Free plan limit reached",
    description:
      "Secondary text shown when a ledger's directive usage is at or over the free-tier limit",
  },
  "common.edit": {
    message: "編集",
    description: "Button label to edit item",
  },
  "common.errorDescription": {
    message:
      "予期しないエラーが発生しました。もう一度お試しいただくか、前のページに戻ってください。",
    description: "Error page description",
  },
  "common.errorDetails": {
    message: "エラーの詳細",
    description: "Label for expandable error details section",
  },
  "common.errorOccurred": {
    message: "エラーが発生しました",
    description: "Generic error message for error pages",
  },
  "common.errorTitle": {
    message: "問題が発生しました",
    description: "Error page title",
  },
  "common.failedToLoadData": {
    message: "データの読み込みに失敗しました",
    description: "Error title when data fails to load",
  },
  "common.failedToLoadLedger": {
    message: "台帳の読み込みに失敗しました",
    description: "Error title when ledger fails to load",
  },
  "common.goBack": {
    message: "戻る",
    description: "Button text to go back to previous page",
  },
  "common.goHome": {
    message: "ホームへ",
    description: "Button text to return to home page",
  },
  "common.goToNextPage": {
    message: "次のページへ",
    description: "Aria label for next page button",
  },
  "common.goToPreviousPage": {
    message: "前のページへ",
    description: "Aria label for previous page button",
  },
  "common.import": {
    message: "インポート",
    description: "Label for import dropdown button",
  },
  "common.manualImport": {
    message: "エントリを追加",
    description: "Label for add entry menu item (opens new entry dialog)",
  },
  "common.manualImportDesc": {
    message: "取引、残高、またはメモ",
    description: "Description for add entry menu item",
  },
  "common.smartImport": {
    message: "スマートインポート",
    description: "Label for smart import menu item (navigates to import page)",
  },
  "common.smartImportDesc": {
    message: "銀行明細、CSV、PDF、またはスキャン画像",
    description: "Description for smart import menu item",
  },
  "common.linkImport": {
    message: "銀行を接続",
    description:
      "Label for link account menu item (navigates to Plaid bank linking page)",
  },
  "common.linkImportDesc": {
    message: "取引を自動的に同期",
    description:
      "Description for link account menu item, emphasizing automatic sync via Plaid vs. manual/file import",
  },
  "common.uploadReceipt": {
    message: "領収書をアップロード",
    description:
      "Label for upload receipt menu item (navigates to receipt page)",
  },
  "common.uploadReceiptDesc": {
    message: "AIでレシートをスキャン",
    description: "Description for upload receipt menu item",
  },
  "common.invalidParameters": {
    message: "URLパラメーターが無効です",
    description: "Title for validation error page",
  },
  "common.invalidParametersDescription": {
    message:
      "指定されたURLパラメーターは有効ではありません。リンクを確認してもう一度お試しください。",
    description: "Description for validation error page",
  },
  "common.lastUpdated": {
    message: "最終更新",
    description: "Table column header for last update time",
  },
  "common.ledgerSettings": {
    message: "台帳設定",
    description:
      "Navigation label for ledger-specific settings page in sidebar",
  },
  "common.ledgersLimit": {
    message: "台帳制限",
    description: "Title for ledger limit information",
  },
  "common.ledgersLimitReached": {
    message: "台帳制限に達しました",
    description: "Title when ledger limit is reached",
  },
  "common.loading": {
    message: "読み込み中...",
    description: "Loading state message",
  },
  "common.loadingData": {
    message: "データを読み込み中...",
    description: "Generic loading state message",
  },
  "common.morePages": {
    message: "さらにページ",
    description: "Screen reader label for pagination ellipsis",
  },
  "common.name": {
    message: "名前",
    description: "Table column header for name",
  },
  "common.nearLimit": {
    message: "制限に近づいています",
    description: "Indicator that user is close to their limit",
  },
  "common.networkConnectionFailed": {
    message: "ネットワーク接続に失敗しました",
    description: "Error title when network connection fails",
  },
  "common.networkErrorDescription": {
    message:
      "サーバーに接続できません。インターネット接続を確認してもう一度お試しください。",
    description: "Detailed description of network error",
  },
  "common.next": {
    message: "次へ",
    description: "Button label to proceed to next step",
  },
  "common.nextPage": {
    message: "次へ",
    description: "Text label for next page button",
  },
  "common.noDataFound": {
    message: "データが見つかりません。",
    description: "Message when no data is available",
  },
  "common.noResultsFound": {
    message: "結果が見つかりません。",
    description: "Message when search returns no results",
  },
  "common.otherColumn": {
    message: "その他",
    description: "Table column header for other currencies/amounts",
  },
  "common.owner": {
    message: "オーナー",
    description: "Table column header for owner",
  },
  "common.pageNotFound": {
    message: "ページが見つかりません",
    description: "Title for 404 page",
  },
  "common.pageNotFoundDescription": {
    message: "お探しのページは存在しないか、別の場所に移動されました。",
    description: "Description for 404 page",
  },
  "common.paginationNav": {
    message: "ページネーション",
    description: "Aria label for pagination navigation",
  },
  "common.previous": {
    message: "前へ",
    description: "Text label for previous page button",
  },
  "common.relatedPages": {
    message: "関連ページ",
    description: "Aria label for related pages navigation",
  },
  "common.save": {
    message: "保存",
    description: "Button label to save changes",
  },
  "common.saving": {
    message: "保存中...",
    description: "Saving state message",
  },
  "common.seeAlso": {
    message: "関連ページ",
    description: "Heading for related pages navigation section",
  },
  "common.selectAView": {
    message: "ビューを選択",
    description: "Placeholder for responsive tab trigger",
  },
  "common.selectDate": {
    message: "日付を選択",
    description: "Screen reader label for date picker button",
  },
  "common.settings": {
    message: "設定",
    description: "Navigation label for settings page",
  },
  "common.sidebar": {
    message: "サイドバー",
    description: "Title for sidebar",
  },
  "common.sidebarDescription": {
    message: "モバイルサイドバーを表示します。",
    description: "Description of mobile sidebar for screen readers",
  },
  "common.stars": {
    message: "スター",
    description: "Navigation label for starred ledgers page",
  },
  "common.status": {
    message: "ステータス",
    description: "Table column header for status",
  },
  "common.toggleSidebar": {
    message: "サイドバーを切り替え",
    description: "Tooltip for toggle sidebar button",
  },
  "common.tryAgain": {
    message: "再試行",
    description: "Button to retry failed action",
  },
  "common.unexpectedError": {
    message: "台帳の読み込み中に予期しないエラーが発生しました。",
    description: "Generic unexpected error message",
  },
  "common.unknown": {
    message: "不明",
    description: "Placeholder for unknown or missing values",
  },
  "common.updating": {
    message: "更新中...",
    description: "Updating state message",
  },
  "common.upgradeToPro": {
    message: "Pro にアップグレード",
    description:
      "Short CTA button shown in the sidebar directive-usage indicator once a ledger is approaching or over its free-tier directive limit",
  },
  "common.upgradeToUnlock": {
    message: "アップグレードしてロック解除",
    description: "Button text to upgrade subscription",
  },
  "common.userEmailFallback": {
    message: "user@example.com",
    description: "Fallback email when user email is not available",
  },
  "common.userFallback": {
    message: "ユーザー",
    description: "Fallback username when user data is not available",
  },
  "common.download": {
    message: "ダウンロード",
    description: "Auto-generated from code usage",
  },
  "common.moreActions": {
    message: "その他のアクション",
    description: "Label for dropdown menu with additional actions",
  },
  "common.learnMore": {
    message: "詳細を見る",
    description: "Link text to learn more about a topic",
  },
  "common.pageDescription.account": {
    message:
      "{ledgerName}の詳細なアカウント情報を表示します。取引、残高、アカウント履歴を分析できます。",
    description: "Description for account page",
  },
  "common.pageDescription.ask": {
    message:
      "AIを使用して{ledgerName}の財務データについて質問します。取引の分析、口座残高の確認、トレンドの把握、会計インサイトの即時取得が可能です。",
    description: "Description for AI ask page",
  },
  "common.pageDescription.balanceSheet": {
    message:
      "{ledgerName}の貸借対照表を表示します。任意の時点での資産、負債、純資産を分析できます。",
    description: "Description for balance sheet page",
  },
  "common.pageDescription.commodities": {
    message:
      "{ledgerName}で使用されている商品（通貨、株式、資産）を表示・管理します。為替レートと価格履歴を追跡できます。",
    description: "Description for commodities page",
  },
  "common.pageDescription.createFile": {
    message:
      "{ledgerName}に新しいファイルを作成します。Beancountの台帳ファイルやドキュメントをリポジトリに追加できます。",
    description: "Description for create file page",
  },
  "common.pageDescription.documents": {
    message:
      "{ledgerName}の取引に添付されたドキュメントを閲覧します。領収書、請求書、サポート資料を表示できます。",
    description: "Description for documents page",
  },
  "common.pageDescription.errors": {
    message:
      "{ledgerName}の解析・検証エラーを表示します。正確な財務レポートのために問題を修正してください。",
    description: "Description for errors page",
  },
  "common.pageDescription.events": {
    message:
      "{ledgerName}の重要なイベントとマイルストーンを表示します。口座開設、閉鎖、ライフサイクルイベントを追跡できます。",
    description: "Description for events page",
  },
  "common.pageDescription.files": {
    message:
      "{ledgerName}のBeancountソースファイルを閲覧・編集します。勘定科目表と取引履歴を管理できます。",
    description: "Description for files page",
  },
  "common.pageDescription.holdings": {
    message:
      "{ledgerName}の現在の保有資産とポートフォリオを分析します。資産配分、市場価値、未実現損益を表示できます。",
    description: "Description for holdings page",
  },
  "common.pageDescription.import": {
    message:
      "銀行明細、スプレッドシート、または領収書から{ledgerName}に取引を追加します。CSV、PDF、OFX、10MB以下の画像ファイルに対応しています。",
    description: "Description for import page",
  },
  "common.pageDescription.incomeStatement": {
    message:
      "{ledgerName}の収入と支出を表示します。収益、コスト、収益性を時系列で追跡できます。",
    description: "Description for income statement page",
  },
  "common.pageDescription.journal": {
    message:
      "{ledgerName}のすべての取引を閲覧・フィルタリングします。日付、アカウント、説明、または支払先で検索できます。",
    description: "Description for journal page",
  },
  "common.pageDescription.overview": {
    message:
      "{ledgerName}の財務ダッシュボード。口座残高、純資産トレンド、収入/支出の概要を表示できます。",
    description: "Description for overview page",
  },
  "common.pageDescription.query": {
    message:
      "{ledgerName}でBQL（Beancount Query Language）クエリを実行します。SQLに似た構文で財務データをフィルタリング・分析できます。",
    description: "Description for query page",
  },
  "common.pageDescription.settings": {
    message:
      "{ledgerName}の設定を構成します。基本通貨、コラボレーター、プライバシー設定を管理できます。",
    description: "Description for settings page",
  },
  "common.pageDescription.statistics": {
    message:
      "{ledgerName}の台帳統計を表示します。取引数、アカウント利用状況、データ品質指標を分析できます。",
    description: "Description for statistics page",
  },
  "common.pageDescription.trialBalance": {
    message:
      "{ledgerName}の試算表を表示します。すべてのアカウントで借方と貸方が一致していることを確認できます。",
    description: "Description for trial balance page",
  },
  "common.pageDescription.uploadFiles": {
    message:
      "{ledgerName}にファイルをアップロードします。既存のBeancountファイルやドキュメントをインポートできます。",
    description: "Description for upload files page",
  },
  "common.postings": {
    message: "転記",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.balanceSheet": {
    message: "貸借対照表",
    description: "Link label for balance sheet page",
  },
  "common.relatedLinks.commodities": {
    message: "商品",
    description: "Link label for commodities page",
  },
  "common.relatedLinks.createFile": {
    message: "ファイルを作成",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.documents": {
    message: "ドキュメント",
    description: "Link label for documents page",
  },
  "common.relatedLinks.errors": {
    message: "エラー",
    description: "Link label for errors page",
  },
  "common.relatedLinks.events": {
    message: "イベント",
    description: "Link label for events page",
  },
  "common.relatedLinks.files": {
    message: "ファイル",
    description: "Link label for files page",
  },
  "common.relatedLinks.holdings": {
    message: "保有資産",
    description: "Link label for holdings page",
  },
  "common.relatedLinks.import": {
    message: "インポート",
    description: "Link label for import page",
  },
  "common.relatedLinks.incomeStatement": {
    message: "損益計算書",
    description: "Link label for income statement page",
  },
  "common.relatedLinks.journal": {
    message: "仕訳帳",
    description: "Link label for journal page",
  },
  "common.relatedLinks.overview": {
    message: "概要",
    description: "Link label for overview page",
  },
  "common.relatedLinks.query": {
    message: "クエリ",
    description: "Link label for query page",
  },
  "common.relatedLinks.statistics": {
    message: "統計",
    description: "Link label for statistics page",
  },
  "common.relatedLinks.trialBalance": {
    message: "試算表",
    description: "Link label for trial balance page",
  },
  "common.relatedLinks.uploadFiles": {
    message: "ファイルをアップロード",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.versionHistory": {
    message: "バージョン履歴",
    description: "Link label for version history page",
  },
  "common.results": {
    message: "結果",
    description: "Auto-generated from code usage",
  },
  "common.rows": {
    message: "行",
    description: "Auto-generated from code usage",
  },
  "common.success": {
    message: "成功",
    description: "Auto-generated from code usage",
  },
  "common.assets": {
    message: "資産",
    description: "Assets category in accounting",
  },
  "component.conversionSelect.atCost": {
    message: "コストで",
    description: "Conversion option for cost-based display",
  },
  "component.conversionSelect.atMarketValue": {
    message: "市場価値で",
    description: "Conversion option for market value display",
  },
  "common.reports": {
    message: "レポート",
    description: "Navigation group label for financial reports",
  },
  "common.advanced": {
    message: "詳細",
    description: "Navigation group label for advanced ledger tools",
  },
  "common.helpAndSupport": {
    message: "ヘルプとサポート",
    description: "Accessible label for the help and support menu",
  },
  "common.helpCenter": {
    message: "ヘルプセンター",
    description: "Menu item linking to product documentation",
  },
  "common.helpCenterDescription": {
    message: "ガイドとドキュメントを見る",
    description: "Description for the help center menu item",
  },
  "common.communitySupport": {
    message: "コミュニティサポート",
    description: "Menu item linking to the community support channel",
  },
  "common.communitySupportDescription": {
    message: "Telegramでコミュニティに質問する",
    description: "Description for the community support menu item",
  },
  "common.balanceSheet": {
    message: "貸借対照表",
    description: "Navigation label for balance sheet financial report",
  },
  "component.searchControls.clearAll": {
    message: "すべてクリア",
    description: "Button text to clear all filters",
  },
  "component.conversionSelect.convertedTo": {
    message: "に変換",
    description: "Prefix for currency conversion option",
  },
  "component.intervalSelect.daily": {
    message: "毎日",
    description: "Daily interval option",
  },
  "common.equity": {
    message: "純資産",
    description: "Equity category in accounting",
  },
  "component.errorState.title": {
    message: "データの読み込みエラー",
    description: "Error message when data fails to load",
  },
  "common.expenses": {
    message: "費用",
    description: "Expenses category in accounting",
  },
  "component.searchControls.failedToLoad": {
    message: "フィルターオプションの読み込みに失敗しました",
    description: "Error message when filter options fail to load",
  },
  "component.searchControls.filterByTagPayee": {
    message: "タグ、支払先などでフィルター...",
    description: "Placeholder for filter input with tags and payees",
  },
  "page.reports.hierarchyListDescription": {
    message: "{ledgerName}の{sectionName}の詳細内訳（USDおよびその他の商品値）",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "{sectionName}リスト",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "{sectionName}階層",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "{ledgerName}の{sectionName}構成の視覚的表示",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "common.income": {
    message: "収入",
    description: "Income category in accounting",
  },
  "common.incomeStatement": {
    message: "損益計算書",
    description: "Navigation label for income statement financial report",
  },
  "common.liabilities": {
    message: "負債",
    description: "Liabilities category in accounting",
  },
  "common.netProfit": {
    message: "純利益",
    description: "Label for net profit section",
  },
  "common.netWorth": {
    message: "純資産",
    description: "Label for net worth section",
  },
  "component.accountCombobox.noAccountsFound": {
    message: "口座が見つかりません",
    description: "Message when no accounts match search",
  },
  "component.sourceFileCombobox.placeholder": {
    message: "ファイルを検索...",
    description: "Placeholder for ledger file search",
  },
  "component.sourceFileCombobox.noFilesFound": {
    message: "ファイルが見つかりません",
    description: "Message when no ledger files match search",
  },
  "component.emptyState.title": {
    message: "データがありません",
    description: "Title when no data is available",
  },
  "component.emptyState.noDataForFilters": {
    message: "選択したフィルターのデータがありません",
    description: "Auto-generated from code usage",
  },
  "component.combobox.noMatchesFound": {
    message: "一致するものが見つかりません",
    description: "Message when search returns no results in combobox",
  },
  "common.overview": {
    message: "概要",
    description: "Navigation label for overview/dashboard page",
  },
  "component.errorState.retry": {
    message: "後でもう一度お試しください",
    description: "Generic retry message",
  },
  "component.intervalSelect.quarterly": {
    message: "四半期",
    description: "Quarterly interval option",
  },
  "component.accountCombobox.placeholder": {
    message: "口座を検索...",
    description: "Placeholder for account search",
  },
  "component.conversionSelect.placeholder": {
    message: "変換を選択",
    description: "Placeholder for conversion select dropdown",
  },
  "component.intervalSelect.placeholder": {
    message: "期間を選択",
    description: "Placeholder for interval select dropdown",
  },
  "component.searchControls.time": {
    message: "期間",
    description: "Placeholder for time filter",
  },
  "common.trialBalance": {
    message: "試算表",
    description: "Navigation label for trial balance report",
  },
  "component.combobox.placeholder": {
    message: "検索するには入力...",
    description: "Placeholder for search input in filter combobox",
  },
  "component.conversionSelect.units": {
    message: "単位",
    description: "Conversion option for unit display",
  },
  "component.intervalSelect.yearly": {
    message: "年次",
    description: "Yearly interval option",
  },
  "component.searchControls.account": {
    message: "口座",
    description: "Placeholder for account filter",
  },
  "common.error": {
    message: "エラー",
    description: "Generic error label",
  },
  "common.sessionExpiredTitle": {
    message: "セッションが期限切れです",
    description:
      "Title shown when a page load fails because the auth session expired",
  },
  "common.sessionExpiredDescription": {
    message:
      "ログインセッションの有効期限が切れました。続行するには再度ログインしてください。",
    description:
      "Description shown when a page load fails because the auth session expired",
  },
  "common.errors.unauthenticated": {
    message: "続行するにはサインインしてください。",
    description: "Error shown when the user must sign in (UNAUTHENTICATED)",
  },
  "common.errors.forbidden": {
    message: "この操作を行う権限がありません。",
    description: "Error shown when the user lacks permission (FORBIDDEN)",
  },
  "common.errors.notFound": {
    message: "要求されたリソースが見つかりませんでした。",
    description: "Error shown when a resource does not exist (NOT_FOUND)",
  },
  "common.errors.badUserInput": {
    message:
      "入力された情報の一部が無効です。確認してからもう一度お試しください。",
    description: "Error shown for invalid client input (BAD_USER_INPUT)",
  },
  "common.errors.validationFailed": {
    message:
      "検証に失敗しました。入力内容を確認してからもう一度お試しください。",
    description: "Error shown when input validation fails (VALIDATION_FAILED)",
  },
  "common.errors.conflict": {
    message:
      "この変更は現在の状態と競合しています。ページを更新してからもう一度お試しください。",
    description:
      "Error shown when a change conflicts with current state (CONFLICT)",
  },
  "common.errors.rateLimited": {
    message:
      "リクエストが多すぎます。しばらく待ってからもう一度お試しください。",
    description: "Error shown when the user is rate limited (RATE_LIMITED)",
  },
  "common.errors.internal": {
    message: "サーバー側で問題が発生しました。後でもう一度お試しください。",
    description:
      "Error shown for unexpected server errors (INTERNAL_SERVER_ERROR)",
  },
  "common.errors.serviceUnavailable": {
    message:
      "サービスは一時的に利用できません。しばらくしてからもう一度お試しください。",
    description:
      "Error shown when a backing service is down (SERVICE_UNAVAILABLE)",
  },
  "common.errors.resourceLimitReached": {
    message:
      "プランの上限に達しました。続行するにはアップグレードしてください。",
    description:
      "Error shown when a plan resource limit is hit (RESOURCE_LIMIT_REACHED)",
  },
  "common.errors.operationNotAllowed": {
    message: "この操作は許可されていません。",
    description:
      "Error shown when business rules forbid the action (OPERATION_NOT_ALLOWED)",
  },
  "common.errors.premiumRequired": {
    message: "この機能にはプレミアムサブスクリプションが必要です。",
    description:
      "Error shown when a feature needs a premium plan (PREMIUM_REQUIRED)",
  },
  "common.errors.network": {
    message:
      "接続に問題があります。インターネット接続を確認してからもう一度お試しください。",
    description:
      "Error shown when the network request itself fails (offline, DNS)",
  },
  "common.errors.generic": {
    message: "問題が発生しました。もう一度お試しください。",
    description: "Generic fallback error message for unrecognized errors",
  },
  "common.errorBoundary.title": {
    message: "問題が発生しました",
    description: "Title of the error boundary fallback panel",
  },
  "common.errorBoundary.description": {
    message:
      "このセクションを表示できませんでした。ページの他の部分は引き続き利用できます。",
    description: "Body of the error boundary fallback panel",
  },
  "common.copyCode": {
    message: "コードをコピー",
    description: "Aria label for the copy button on code blocks",
  },
  "common.copiedToClipboard": {
    message: "クリップボードにコピーしました",
    description: "Toast after content was copied to the clipboard",
  },
  "common.copyFailed": {
    message: "コピーに失敗しました",
    description: "Toast when copying to the clipboard failed",
  },
};

export default jaCommon;
