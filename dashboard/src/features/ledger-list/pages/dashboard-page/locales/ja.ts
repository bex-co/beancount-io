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
  "page.dashboard.nameInvalid": {
    message:
      "名前には少なくとも1つの文字または数字が含まれている必要があります",
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
    description: "Aria label for ledger switcher button",
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
  "page.dashboard.blogFeed": {
    message: "最新の更新",
    description: "Title for blog feed section on dashboard",
  },
  "page.dashboard.feedError": {
    message: "フィードの読み込みに失敗しました",
    description: "Error message when feed fails to load",
  },
  "page.dashboard.noFeedItems": {
    message: "フィードアイテムがありません",
    description: "Empty state message when no feed items exist",
  },
  "page.dashboard.showMore": {
    message: "もっと表示",
    description: "Button text to load more feed items",
  },
};

export default jaDashboardPage;
