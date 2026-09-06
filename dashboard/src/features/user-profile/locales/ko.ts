import type { TranslationEntry } from "@/i18n";

const koUserProfile: Record<string, TranslationEntry> = {
  "userProfile.follow": {
    message: "팔로우",
    description: "Button label to follow a user",
  },
  "userProfile.unfollow": {
    message: "팔로우 취소",
    description: "Button label to unfollow a user",
  },
  "userProfile.recentActivity": {
    message: "최근 활동",
    description: "Heading for recent activity section",
  },
  "userProfile.noActivity": {
    message: "최근 활동 없음",
    description: "Message shown when user has no recent activity",
  },
  "userProfile.repositories": {
    message: "장부",
    description: "Heading for repositories section",
  },
  "userProfile.noRepositories": {
    message: "저장소 없음",
    description: "Message shown when user has no repositories",
  },
  "userProfile.joined": {
    message: "가입일",
    description: "Label for account creation date",
  },
  "userProfile.userNotFound": {
    message: "사용자를 찾을 수 없습니다",
    description: "Error title when user profile does not exist",
  },
  "userProfile.userNotFoundMessage": {
    message: "@{username} 사용자를 찾을 수 없습니다.",
    description: "Error message explaining user was not found",
  },
  "userProfile.followSuccess": {
    message: "{username}님을 팔로우했습니다",
    description: "Success toast message after following a user",
  },
  "userProfile.unfollowSuccess": {
    message: "{username}님 팔로우를 취소했습니다",
    description: "Success toast message after unfollowing a user",
  },
  "userProfile.followError": {
    message: "사용자 팔로우 실패",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.unfollowError": {
    message: "사용자 팔로우 취소 실패",
    description: "Error toast message when unfollow operation fails",
  },
  "userProfile.private": {
    message: "비공개",
    description: "Badge label for private repositories",
  },
  "userProfile.public": {
    message: "공개",
    description: "Badge label for public repositories",
  },
  "userProfile.updated": {
    message: "업데이트됨",
    description: "Label prefix for last updated timestamp",
  },
  "userProfile.errorLoadingProfile": {
    message: "프로필 불러오기 오류",
    description: "Error title when profile fails to load",
  },
  "seo.userProfile.title": {
    message: "{username} - 사용자 프로필",
    description: "SEO title for user profile page",
  },
  "seo.userProfile.description": {
    message: "beancount.io에서 {username}의 프로필, 저장소, 활동을 확인하세요.",
    description: "SEO description for user profile page",
  },
  "userProfile.tabs.overview": {
    message: "장부",
    description: "Tab label for overview section",
  },
  "userProfile.tabs.followers": {
    message: "팔로워",
    description: "Tab label for followers list",
  },
  "userProfile.tabs.following": {
    message: "팔로잉",
    description: "Tab label for following list",
  },
  "userProfile.tabs.starred": {
    message: "즐겨찾기",
    description: "Tab label for starred repositories",
  },
  "userProfile.noFollowers": {
    message: "아직 팔로워가 없습니다",
    description: "Message shown when user has no followers",
  },
  "userProfile.noFollowing": {
    message: "아직 아무도 팔로우하지 않습니다",
    description: "Message shown when user is not following anyone",
  },
  "userProfile.noStarredRepos": {
    message: "즐겨찾기한 저장소 없음",
    description: "Message shown when user has no starred repos",
  },
  "userProfile.community": {
    message: "커뮤니티",
    description: "Public profile: community",
  },
  "userProfile.ledgerDescription": {
    message: "계정, 거래 및 재무 보고서를 살펴보세요.",
    description: "Public profile: ledgerDescription",
  },
  "userProfile.browseDescription": {
    message: "장부를 찾고 숫자를 따라가 보세요.",
    description: "Public profile: browseDescription",
  },
  "userProfile.searchLedgers": {
    message: "장부 검색…",
    description: "Public profile: searchLedgers",
  },
  "userProfile.clearSearch": {
    message: "검색 지우기",
    description: "Public profile: clearSearch",
  },
  "userProfile.sortLedgers": {
    message: "장부 정렬",
    description: "Public profile: sortLedgers",
  },
  "userProfile.recentlyUpdated": {
    message: "최근 업데이트순",
    description: "Public profile: recentlyUpdated",
  },
  "userProfile.nameAZ": {
    message: "이름순 (A–Z)",
    description: "Public profile: nameAZ",
  },
  "userProfile.noMatches": {
    message:
      "검색과 일치하는 장부가 없습니다. 다른 이름이나 키워드를 입력해 보세요.",
    description: "Public profile: noMatches",
  },
  "userProfile.results": {
    message: "장부 {total}개 중 {shown}개 표시",
    description: "Public profile: results",
  },
  "userProfile.showMoreLedgers": {
    message: "장부 더 보기",
    description: "Public profile: showMoreLedgers",
  },
  "userProfile.newToBeancount": {
    message: "Beancount가 처음이신가요?",
    description: "Public profile: newToBeancount",
  },
  "userProfile.startExample": {
    message: "예제로 시작하기",
    description: "Public profile: startExample",
  },
  "userProfile.exampleDescription": {
    message:
      "장부의 구조를 알아보세요. 계정, 거래 및 보고서가 포함된 예제 장부를 살펴볼 수 있습니다.",
    description: "Public profile: exampleDescription",
  },
  "userProfile.openExample": {
    message: "예제 살펴보기",
    description: "Public profile: openExample",
  },
  "userProfile.showLessActivity": {
    message: "활동 접기",
    description: "Public profile: showLessActivity",
  },
  "userProfile.showAllActivity": {
    message: "모든 활동 보기",
    description: "Public profile: showAllActivity",
  },
  "userProfile.linkCopied": {
    message: "프로필 링크가 복사되었습니다",
    description: "Public profile: linkCopied",
  },
  "userProfile.copyLinkError": {
    message: "링크를 복사할 수 없습니다. 주소 표시줄에서 복사해 주세요.",
    description: "Public profile: copyLinkError",
  },
  "userProfile.tryAgain": {
    message: "다시 시도",
    description: "Public profile: tryAgain",
  },
  "userProfile.collectionLabel": {
    message: "공개 장부 모음",
    description: "Public profile: collectionLabel",
  },
  "userProfile.collectionDescription": {
    message:
      "실제 재무 데이터를 자유롭게 살펴보세요. 기업 장부와 실용적인 예제를 통해 Beancount를 경험해 보세요.",
    description: "Public profile: collectionDescription",
  },
  "userProfile.copyLink": {
    message: "링크 복사",
    description: "Public profile: copyLink",
  },
  "userProfile.followDescription": {
    message: "이 프로필을 팔로잉 목록에 추가하세요.",
    description: "Public profile: followDescription",
  },
  "userProfile.footer": {
    message: "열린 장부, 명확한 재무. Beancount 제공.",
    description: "Public profile: footer",
  },
  "userProfile.openLedgerName": {
    message: "Open Ledger",
    description:
      "Proper name of the Open Ledger collection; keep the name unchanged",
  },
};

export default koUserProfile;
