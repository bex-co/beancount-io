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
    message: "저장소",
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
    message: "개요",
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
};

export default koUserProfile;
