import { createExportLocale } from "../export-locale";

export default createExportLocale({
  action: "エクスポート",
  markdown: "Markdown レポート",
  csv: "CSV スプレッドシート",
  printSavePdf: "印刷 / PDFとして保存",
  completed: "レポートのエクスポートを準備しました。",
  failed: "レポートをエクスポートできませんでした。",
  context: "範囲と表示基準",
  generatedAt: "生成日時: {generatedAt}",
  asOf: "基準日",
  period: "対象期間",
  accountFilter: "勘定フィルター",
  advancedFilter: "詳細フィルター",
  interval: "間隔",
  conversion: "換算",
  notApplied: "適用なし",
  currency: "通貨",
  unit: "単位",
  amount: "金額",
  unauditedManagementReport: "未監査の管理報告書",
  unauditedMultiUnitManagementReport: "未監査の複数単位管理明細",
  unauditedInternalDraft: "未監査の社内用草案",
  statementSummary: "計算書の要約",
  lineItem: "項目",
  totalAssets: "資産合計",
  totalLiabilities: "負債合計",
  totalEquity: "純資産合計",
  totalLiabilitiesAndEquity: "負債および純資産合計",
  reconciliationDifference: "照合差額",
  totalRevenue: "収益およびその他の収入合計",
  totalExpenses: "費用合計",
  netLoss: "純損失",
  netCashOperating: "営業活動によるネットキャッシュフロー",
  netCashInvesting: "投資活動によるネットキャッシュフロー",
  netCashFinancing: "財務活動によるネットキャッシュフロー",
  netChangeInCash: "現金および現金同等物の純増減",
  openingCash: "期首の現金および現金同等物",
  closingCash: "期末の現金および現金同等物",
  supportingAccountDetail: "補足勘定明細",
  allActivity: "利用可能なすべての帳簿活動（終了日）",
  dateUnavailable: "報告日を確認できません",
  presentationCurrency: "表示通貨",
  ledgerUnits: "表示する帳簿単位",
  sourceLedger: "元帳",
  importantNotices: "重要なお知らせ",
  reportingEntity: "報告主体",
  netIncome: "純利益",
  reportingEntityFallbackNotice:
    '報告主体が設定されていないため、元帳名を使用しています。外部利用前に Beancount の option "title" を設定してください。',
  placeholderDataNotice:
    "報告主体または元帳にサンプルデータが含まれているようです。外部利用前に置き換えてください。",
  inferredPeriodNotice:
    "この報告書は {startDate} から {endDate} までの帳簿活動を対象としています。日付は利用可能な報告データから算出されています。",
  periodNotExplicitNotice:
    "完全な報告期間を特定できませんでした。この報告書は社内用の草案です。",
  inferredAsOfDateNotice:
    "明示的な基準日が選択されていません。この計算書では報告書で利用可能な最新日を使用します：{asOfDate}。",
  asOfDateUnavailableNotice:
    "貸借対照表の基準日を特定できませんでした。この計算書は社内用の草案です。",
  subtotalRowsNotice:
    "太字の行は小計または合計であり、その内訳行と重複して加算しないでください。",
  partialReportNotice:
    "勘定または詳細フィルターにより範囲が限定されているため、完全な財務諸表ではありません。",
  balanceSheetClassificationNotice:
    "元帳には流動・非流動の分類情報がないため、勘定は元帳の順序で表示されます。",
  balanceSheetDoesNotReconcileNotice:
    "1つ以上の単位で会計等式が一致していません。外部利用前に、未締切損益、部分フィルター、評価・換算の影響、および元帳エラーを確認してください。この計算書は社内用の草案です。",
  cashFlowClassificationNotice:
    "営業活動・投資活動・財務活動の区分は、cash-flow-role が宣言されていない勘定科目については種類と名前から推定されます。宣言のある勘定科目は記載どおりに分類されます。",
  cashFlowCashEquivalentsNotice:
    "現金および現金同等物の範囲は勘定科目名から推定されます（当座預金・普通預金・現金系の資産勘定など）。外部利用の前に対象勘定を確認してください。",
  customUnitsNotice: "確認が必要なカスタム帳簿単位:",
  customUnitsDefinitionNotice:
    "このエクスポートには各単位の意味が含まれていません。外部利用前に添付注記で説明してください。",
  multiUnitScheduleNotice:
    "この複数単位レポートは管理明細であり、単一の表示通貨による財務諸表ではありません。異なる単位の金額を合算せず、外部利用前に表示通貨を選択してください。",
  noAssurance:
    "保証は提供されません。ユーザー提供の帳簿記録から作成されており、主体、完全性、評価および会計基準への準拠は検証されていません。",
  generatedBy: "Beancount.io が {generatedAt} に生成",
});
