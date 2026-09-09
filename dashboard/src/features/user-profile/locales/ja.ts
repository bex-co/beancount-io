import type { TranslationEntry } from "@/i18n";

const jaUserProfile: Record<string, TranslationEntry> = {
  "userProfile.follow": {
    message: "フォロー",
    description: "Button label to follow a user",
  },
  "userProfile.unfollow": {
    message: "フォロー解除",
    description: "Button label to unfollow a user",
  },
  "userProfile.recentActivity": {
    message: "最近のアクティビティ",
    description: "Heading for recent activity section",
  },
  "userProfile.noActivity": {
    message: "最近のアクティビティはありません",
    description: "Message shown when user has no recent activity",
  },
  "userProfile.repositories": {
    message: "帳簿",
    description: "Heading for repositories section",
  },
  "userProfile.noRepositories": {
    message: "リポジトリがありません",
    description: "Message shown when user has no repositories",
  },
  "userProfile.joined": {
    message: "参加日",
    description: "Label for account creation date",
  },
  "userProfile.userNotFound": {
    message: "ユーザーが見つかりません",
    description: "Error title when user profile does not exist",
  },
  "userProfile.userNotFoundMessage": {
    message: "ユーザー @{username} が見つかりませんでした。",
    description: "Error message explaining user was not found",
  },
  "userProfile.followSuccess": {
    message: "{username}をフォローしました",
    description: "Success toast message after following a user",
  },
  "userProfile.unfollowSuccess": {
    message: "{username}のフォローを解除しました",
    description: "Success toast message after unfollowing a user",
  },
  "userProfile.followError": {
    message: "ユーザーのフォローに失敗しました",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.unfollowError": {
    message: "ユーザーのフォロー解除に失敗しました",
    description: "Error toast message when unfollow operation fails",
  },
  "userProfile.private": {
    message: "非公開",
    description: "Badge label for private repositories",
  },
  "userProfile.public": {
    message: "公開",
    description: "Badge label for public repositories",
  },
  "userProfile.updated": {
    message: "更新日",
    description: "Label prefix for last updated timestamp",
  },
  "userProfile.errorLoadingProfile": {
    message: "プロファイルの読み込みエラー",
    description: "Error title when profile fails to load",
  },
  "seo.userProfile.title": {
    message: "{username} - ユーザープロファイル",
    description: "SEO title for user profile page",
  },
  "seo.userProfile.description": {
    message:
      "beancount.ioで{username}のプロファイル、リポジトリ、アクティビティを表示。",
    description: "SEO description for user profile page",
  },
  "userProfile.tabs.overview": {
    message: "帳簿",
    description: "Tab label for overview section",
  },
  "userProfile.tabs.followers": {
    message: "フォロワー",
    description: "Tab label for followers list",
  },
  "userProfile.tabs.following": {
    message: "フォロー中",
    description: "Tab label for following list",
  },
  "userProfile.tabs.starred": {
    message: "スター",
    description: "Tab label for starred repositories",
  },
  "userProfile.noFollowers": {
    message: "まだフォロワーがいません",
    description: "Message shown when user has no followers",
  },
  "userProfile.noFollowing": {
    message: "まだ誰もフォローしていません",
    description: "Message shown when user is not following anyone",
  },
  "userProfile.noStarredRepos": {
    message: "スターリポジトリがありません",
    description: "Message shown when user has no starred repos",
  },
  "userProfile.community": {
    message: "コミュニティ",
    description: "Public profile: community",
  },
  "userProfile.ledgerDescription": {
    message: "勘定科目、取引、財務レポートを探索できます。",
    description: "Public profile: ledgerDescription",
  },
  "userProfile.browseDescription": {
    message: "帳簿を見つけて、数字を読み解きましょう。",
    description: "Public profile: browseDescription",
  },
  "userProfile.searchLedgers": {
    message: "帳簿を検索…",
    description: "Public profile: searchLedgers",
  },
  "userProfile.clearSearch": {
    message: "検索をクリア",
    description: "Public profile: clearSearch",
  },
  "userProfile.sortLedgers": {
    message: "帳簿の並び順",
    description: "Public profile: sortLedgers",
  },
  "userProfile.recentlyUpdated": {
    message: "更新が新しい順",
    description: "Public profile: recentlyUpdated",
  },
  "userProfile.nameAZ": {
    message: "名前（A–Z）",
    description: "Public profile: nameAZ",
  },
  "userProfile.noMatches": {
    message: "一致する帳簿がありません。別の名前やキーワードをお試しください。",
    description: "Public profile: noMatches",
  },
  "userProfile.results": {
    message: "{total} 件中 {shown} 件の帳簿を表示",
    description: "Public profile: results",
  },
  "userProfile.showMore": {
    message: "もっと見る",
    description: "Public profile: show more social list items",
  },
  "userProfile.loadMoreError": {
    message: "続きを読み込めませんでした。",
    description: "Public profile: failed to load the next social page",
  },
  "userProfile.showMoreLedgers": {
    message: "帳簿をもっと見る",
    description: "Public profile: showMoreLedgers",
  },
  "userProfile.newToBeancount": {
    message: "Beancount は初めてですか？",
    description: "Public profile: newToBeancount",
  },
  "userProfile.startExample": {
    message: "サンプルから始める",
    description: "Public profile: startExample",
  },
  "userProfile.exampleDescription": {
    message:
      "帳簿の仕組みを体験しましょう。勘定科目、取引、レポートを含むサンプル帳簿を探索できます。",
    description: "Public profile: exampleDescription",
  },
  "userProfile.openExample": {
    message: "サンプルを見る",
    description: "Public profile: openExample",
  },
  "userProfile.showLessActivity": {
    message: "アクティビティを折りたたむ",
    description: "Public profile: showLessActivity",
  },
  "userProfile.showAllActivity": {
    message: "すべてのアクティビティを見る",
    description: "Public profile: showAllActivity",
  },
  "userProfile.linkCopied": {
    message: "プロフィールのリンクをコピーしました",
    description: "Public profile: linkCopied",
  },
  "userProfile.copyLinkError": {
    message:
      "リンクをコピーできませんでした。アドレスバーからコピーしてください。",
    description: "Public profile: copyLinkError",
  },
  "userProfile.tryAgain": {
    message: "再試行",
    description: "Public profile: tryAgain",
  },
  "userProfile.collectionLabel": {
    message: "公開帳簿コレクション",
    description: "Public profile: collectionLabel",
  },
  "userProfile.collectionDescription": {
    message:
      "実際の財務データを自由に探索。企業の帳簿や実用的なサンプルで Beancount の使い方を体験しましょう。",
    description: "Public profile: collectionDescription",
  },
  "userProfile.copyLink": {
    message: "リンクをコピー",
    description: "Public profile: copyLink",
  },
  "userProfile.followDescription": {
    message: "このプロフィールをフォローリストに追加します。",
    description: "Public profile: followDescription",
  },
  "userProfile.footer": {
    message: "開かれた帳簿で、明確な財務へ。Beancount による。",
    description: "Public profile: footer",
  },
  "userProfile.openLedgerName": {
    message: "Open Ledger",
    description:
      "Proper name of the Open Ledger collection; keep the name unchanged",
  },
};

export default jaUserProfile;
