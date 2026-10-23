export interface TranslationEntry {
  message: string;
  description: string;
}

const jaDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.createLedger": {
    message: "台帳を作成",
    description: "Button to create new ledger",
  },
  "page.dashboard.createNewLedger": {
    message: "新しい台帳を作成",
    description: "Dialog title for creating ledger",
  },
  "page.dashboard.createNewLedgerDescription": {
    message: "財務管理を始めるための新しいBeancountの台帳を作成します。",
    description: "Description in create ledger dialog",
  },
  "page.dashboard.dashboard": {
    message: "ダッシュボード",
    description: "Dashboard page title shown in sidebar header",
  },
  "page.dashboard.goToDashboard": {
    message: "ダッシュボードへ移動",
    description:
      "Aria label for the home/logo button navigating to the dashboard",
  },
  "page.dashboard.deleteLedger": {
    message: "台帳を削除",
    description: "Button tooltip or action for deleting ledger",
  },
  "page.dashboard.deleteLedgerConfirm": {
    message:
      '"{name}"を本当に削除してよろしいですか？この操作は元に戻せません。',
    description:
      "Confirmation message for ledger deletion (contains {name} placeholder)",
  },
  "page.dashboard.deleting": {
    message: "削除中...",
    description: "Button state while deleting",
  },
  "page.dashboard.descriptionOptional": {
    message: "説明（任意）",
    description: "Description field label with optional indicator",
  },
  "page.dashboard.editLedger": {
    message: "台帳を編集",
    description: "Button tooltip for editing ledger",
  },
  "page.dashboard.editLedgerSettings": {
    message: "台帳設定を編集",
    description: "Dialog title for editing ledger",
  },
  "page.dashboard.enterDescription": {
    message: "説明を入力",
    description: "Placeholder for description input",
  },
  "page.dashboard.enterLedgerName": {
    message: "台帳名を入力",
    description: "Placeholder for ledger name input",
  },
  "page.dashboard.failedToLoadLedgers": {
    message: "台帳の読み込みに失敗しました",
    description: "Error title when ledgers fail to load",
  },
  "page.dashboard.ledgerCreatedSuccess": {
    message: "台帳が正常に作成されました",
    description: "Toast notification when ledger created",
  },
  "page.dashboard.ledgerDeletedSuccess": {
    message: "台帳が正常に削除されました",
    description: "Toast notification when ledger deleted",
  },
  "page.dashboard.ledgerName": {
    message: "台帳名",
    description: "Form label for ledger name field",
  },
  "page.dashboard.ledgerSettingsFor": {
    message: "{ledger} の設定",
    description:
      "Accessible name and tooltip for a ledger's settings menu; {ledger} is its displayed name",
  },
  "page.dashboard.ledgerUpdatedSuccess": {
    message: "台帳が正常に更新されました",
    description: "Toast notification when ledger updated",
  },
  "page.dashboard.loadingLedgers": {
    message: "台帳を読み込み中...",
    description: "Message shown while loading ledgers",
  },
  "page.dashboard.manageLedgers": {
    message: "Beancountの台帳を管理する",
    description: "Description of ledger management",
  },
  "page.dashboard.nameMaxLength": {
    message: "名前は100文字未満でなければなりません",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "名前は必須です",
    description: "Validation error when name is missing",
  },
  "page.dashboard.presetPersonal": {
    message: "個人用元帳",
    description: "Name of the personal setup preset",
  },
  "page.dashboard.presetPersonalOutcome": {
    message: "購入を記録し、残金への影響を把握します。",
    description: "Outcome of the personal setup preset",
  },
  "page.dashboard.presetFreelance": {
    message: "フリーランス用元帳",
    description: "Name of the freelance setup preset",
  },
  "page.dashboard.presetFreelanceOutcome": {
    message: "顧客収入を記録するか、未払い顧客の残額を確認します。",
    description: "Outcome of the freelance setup preset",
  },
  "page.dashboard.presetBusiness": {
    message: "事業用元帳",
    description: "Name of the business setup preset",
  },
  "page.dashboard.presetBusinessOutcome": {
    message: "開始ポジションを確立し、資金調達と収益を区別します。",
    description: "Outcome of the business setup preset",
  },
  "page.dashboard.presetPortfolio": {
    message: "ポートフォリオ用元帳",
    description: "Name of the portfolio setup preset",
  },
  "page.dashboard.presetPortfolioOutcome": {
    message: "購入を記録し、数量・取得記録・現金の動きを確認します。",
    description: "Outcome of the portfolio setup preset",
  },
  "page.dashboard.presetRental": {
    message: "賃貸用元帳",
    description: "Name of the rental setup preset",
  },
  "page.dashboard.presetRentalOutcome": {
    message: "領収を記録し、家賃と返金可能な敷金を区別します。",
    description: "Outcome of the rental setup preset",
  },
  "page.dashboard.presetShared": {
    message: "共同支出用元帳",
    description: "Name of the shared expenses setup preset",
  },
  "page.dashboard.presetSharedOutcome": {
    message: "立替を記録し、誰が誰に借りがあるか確認します。",
    description: "Outcome of the shared expenses setup preset",
  },
  "page.dashboard.presetCommunity": {
    message: "コミュニティ用元帳",
    description: "Name of the community setup preset",
  },
  "page.dashboard.presetCommunityOutcome": {
    message: "拠出金、プロジェクト支出、残りの資金を説明します。",
    description: "Outcome of the community setup preset",
  },
  "page.dashboard.presetBlank": {
    message: "空白の元帳",
    description: "Name of the blank setup preset",
  },
  "page.dashboard.presetBlankOutcome": {
    message: "不要なカテゴリを削除せず、選んだ構造を追加します。",
    description: "Outcome of the blank setup preset",
  },
  "page.dashboard.setupAmountInvalid": {
    message: "100 や -30.50 のような金額を入力してください",
    description: "Validation error for the opening balance amount",
  },
  "page.dashboard.setupCurrency": {
    message: "運用通貨",
    description: "Label for the currency field in staged ledger creation",
  },
  "page.dashboard.setupHistoryStart": {
    message: "帳簿の開始日",
    description: "Label for the history start date in staged ledger creation",
  },
  "page.dashboard.setupOpeningAccount": {
    message: "開始口座",
    description: "Label for the first account in staged ledger creation",
  },
  "page.dashboard.setupOpeningAmount": {
    message: "開始残高（任意）",
    description: "Label for the optional opening balance in staged creation",
  },
  "page.dashboard.setupOpeningNone": {
    message: "後で決める",
    description: "Choice to skip the opening balance in staged creation",
  },
  "page.dashboard.setupReview": {
    message: "確認",
    description: "Heading for the review step in staged ledger creation",
  },
  "page.dashboard.setupReviewDescription": {
    message: "作成される内容は次のとおりです。変更するには戻ってください。",
    description: "Description for the review step in staged ledger creation",
  },
  "page.dashboard.setupAccounts": {
    message: "口座",
    description: "Label for the account list in the creation review step",
  },
  "page.dashboard.setupStep": {
    message: "ステップ {step} / {total}",
    description: "Progress label in staged ledger creation",
  },
  "page.dashboard.nameInvalid": {
    message:
      "ラテン文字 (A–Z) または数字を少なくとも 1 文字使ってください。名前は帳簿の ウェブアドレスになります。",
    description: "Validation error when name contains only special characters",
  },
  "page.dashboard.repositoryName": {
    message: "リポジトリ名",
    description: "Label for the slugified repository name preview",
  },
  "page.dashboard.noLedgersFound": {
    message: "台帳が見つかりません",
    description: "Message when user has no ledgers",
  },
  "page.dashboard.noLedgersDescription": {
    message: "最初の台帳を作成して、財務の記録を始めましょう。",
    description:
      "Empty state description prompting the user to create their first ledger",
  },
  "page.dashboard.private": {
    message: "プライベート",
    description: "Privacy status: private/not public",
  },
  "page.dashboard.privateAccess": {
    message: "あなたとコラボレーターのみがアクセスできます",
    description: "Description of private access level",
  },
  "page.dashboard.public": {
    message: "パブリック",
    description: "Privacy status: public/visible to all",
  },
  "page.dashboard.publicWarning": {
    message: "リンクを持つ誰でもあなたの財務データを表示できます",
    description: "Warning about public access level",
  },
  "page.dashboard.retry": {
    message: "再試行",
    description: "Button to retry failed operation",
  },
  "page.dashboard.searchLedgers": {
    message: "台帳を検索...",
    description: "Placeholder for ledger search input",
  },
  "page.dashboard.selectLedger": {
    message: "台帳を選択",
    description: "Accessible name for the ledger selection dialog",
  },
  "page.dashboard.switchLedgerFrom": {
    message: "{ledger} — 台帳を切り替える",
    description:
      "Accessible name for the ledger switcher, starting with the visible ledger name ({ledger})",
  },
  "page.dashboard.updateLedgerDetails": {
    message: "台帳の詳細を更新します。",
    description: "Description in edit ledger dialog",
  },
  "page.dashboard.yourLedgers": {
    message: "あなたの台帳",
    description: "Section title for user's ledgers list",
  },
  "page.dashboard.goToAccount": {
    message: "{owner}のアカウントへ",
    description: "Tooltip for navigating to owner's account page",
  },
  "page.dashboard.ledgerLimitReached": {
    message:
      "台帳の上限に達しました。さらに台帳を作成するにはアップグレードしてください。",
    description: "Tooltip shown when save button is disabled due to limit",
  },
  "page.dashboard.feedError": {
    message: "フィードの読み込みに失敗しました",
    description: "Error message when feed fails to load",
  },
  "page.dashboard.showMore": {
    message: "もっと表示",
    description: "Button text to load more feed items",
  },
  "page.dashboard.activity": {
    message: "アクティビティ",
    description:
      "Heading of the user's ledger activity feed on the dashboard home",
  },
  "page.dashboard.activityEmpty": {
    message: "帳簿への変更はここに表示されます。",
    description:
      "Empty state of the activity feed when the user has no ledger commits yet",
  },
  "page.dashboard.activityDescription": {
    message: "閲覧できるすべての帳簿の変更",
    description: "Description under the Activity heading on the dashboard home",
  },
  "page.dashboard.activityRefreshFailed": {
    message:
      "アクティビティを更新できませんでした。以前に読み込んだ内容を表示しています。",
    description:
      "Notice above the activity cards when refreshing them failed; the cards shown are from an earlier load",
  },
};

export default jaDashboardPage;
