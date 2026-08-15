export interface TranslationEntry {
  message: string;
  description: string;
}

const ptUserProfile: Record<string, TranslationEntry> = {
  "userProfile.errorLoadingProfile": {
    message: "Erro ao carregar perfil",
    description: "Error title when profile fails to load",
  },
  "userProfile.followError": {
    message: "Falha ao seguir usuário",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.followSuccess": {
    message: "Você agora segue {username}",
    description: "Success toast message after following a user",
  },
  "userProfile.joined": {
    message: "Entrou",
    description: "Label for account creation date",
  },
  "userProfile.noActivity": {
    message: "Nenhuma atividade recente",
    description: "Message shown when user has no recent activity",
  },
  "userProfile.noRepositories": {
    message: "Sem repositórios",
    description: "Message shown when user has no repositories",
  },
  "userProfile.private": {
    message: "Privado",
    description: "Badge label for private repositories",
  },
  "userProfile.public": {
    message: "Público",
    description: "Badge label for public repositories",
  },
  "userProfile.recentActivity": {
    message: "Atividade Recente",
    description: "Heading for recent activity section",
  },
  "userProfile.repositories": {
    message: "Repositórios",
    description: "Heading for repositories section",
  },
  "userProfile.follow": {
    message: "Seguir",
    description: "Button label to follow a user",
  },
  "userProfile.unfollowError": {
    message: "Falha ao deixar de seguir usuário",
    description: "Error toast message when unfollow operation fails",
  },
  "userProfile.unfollowSuccess": {
    message: "Você deixou de seguir {username}",
    description: "Success toast message after unfollowing a user",
  },
  "userProfile.unfollow": {
    message: "Deixar de seguir",
    description: "Button label to unfollow a user",
  },
  "userProfile.updated": {
    message: "Atualizado",
    description: "Label prefix for last updated timestamp",
  },
  "userProfile.userNotFound": {
    message: "Usuário não encontrado",
    description: "Error title when user profile does not exist",
  },
  "userProfile.userNotFoundMessage": {
    message: "O usuário @{username} não pôde ser encontrado.",
    description: "Error message explaining user was not found",
  },
  "seo.userProfile.title": {
    message: "{username} - User Profile",
    description: "SEO title for user profile page",
  },
  "seo.userProfile.description": {
    message:
      "View {username}'s profile, repositories, and activity on beancount.io.",
    description: "SEO description for user profile page",
  },
  "userProfile.tabs.overview": {
    message: "Overview",
    description: "Tab label for overview section",
  },
  "userProfile.tabs.followers": {
    message: "Followers",
    description: "Tab label for followers list",
  },
  "userProfile.tabs.following": {
    message: "Following",
    description: "Tab label for following list",
  },
  "userProfile.tabs.starred": {
    message: "Starred",
    description: "Tab label for starred repositories",
  },
  "userProfile.noFollowers": {
    message: "No followers yet",
    description: "Message shown when user has no followers",
  },
  "userProfile.noFollowing": {
    message: "Not following anyone yet",
    description: "Message shown when user is not following anyone",
  },
  "userProfile.noStarredRepos": {
    message: "No starred repositories",
    description: "Message shown when user has no starred repos",
  },
};

export default ptUserProfile;
