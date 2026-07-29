export interface TranslationEntry {
  message: string;
  description: string;
}

const esUserProfile: Record<string, TranslationEntry> = {
  "userProfile.title": {
    message: "Perfil de usuario",
    description: "Header title for user profile page",
  },
  "userProfile.errorLoadingProfile": {
    message: "Error al cargar el perfil",
    description: "Error title when profile fails to load",
  },
  "userProfile.errorMessage": {
    message:
      "Algo salió mal al cargar este perfil. Por favor, inténtelo de nuevo más tarde.",
    description: "Generic error message for profile loading failures",
  },
  "userProfile.followError": {
    message: "No se pudo seguir al usuario",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.followSuccess": {
    message: "Ahora sigues a {username}",
    description: "Success toast message after following a user",
  },
  "userProfile.followers": {
    message: "seguidores",
    description: "Label for followers count",
  },
  "userProfile.following": {
    message: "siguiendo",
    description: "Label for following count",
  },
  "userProfile.joined": {
    message: "Se unió",
    description: "Label for account creation date",
  },
  "userProfile.noActivity": {
    message: "Sin actividad reciente",
    description: "Message shown when user has no recent activity",
  },
  "userProfile.noRepositories": {
    message: "Sin repositorios",
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
    message: "Actividad Reciente",
    description: "Heading for recent activity section",
  },
  "userProfile.repositories": {
    message: "Repositorios",
    description: "Heading for repositories section",
  },
  "userProfile.follow": {
    message: "Seguir",
    description: "Button label to follow a user",
  },
  "userProfile.starredRepos": {
    message: "repositorios destacados",
    description: "Label for starred repositories count",
  },
  "userProfile.unfollowError": {
    message: "No se pudo dejar de seguir al usuario",
    description: "Error toast message when unfollow operation fails",
  },
  "userProfile.unfollowSuccess": {
    message: "Has dejado de seguir a {username}",
    description: "Success toast message after unfollowing a user",
  },
  "userProfile.unfollow": {
    message: "Dejar de seguir",
    description: "Button label to unfollow a user",
  },
  "userProfile.updated": {
    message: "Actualizado",
    description: "Label prefix for last updated timestamp",
  },
  "userProfile.userNotFound": {
    message: "Usuario no encontrado",
    description: "Error title when user profile does not exist",
  },
  "userProfile.userNotFoundMessage": {
    message: "El usuario @{username} no pudo ser encontrado.",
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

export default esUserProfile;
