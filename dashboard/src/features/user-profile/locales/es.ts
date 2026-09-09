export interface TranslationEntry {
  message: string;
  description: string;
}

const esUserProfile: Record<string, TranslationEntry> = {
  "userProfile.errorLoadingProfile": {
    message: "Error al cargar el perfil",
    description: "Error title when profile fails to load",
  },
  "userProfile.followError": {
    message: "No se pudo seguir al usuario",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.followSuccess": {
    message: "Ahora sigues a {username}",
    description: "Success toast message after following a user",
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
    message: "Libros",
    description: "Heading for repositories section",
  },
  "userProfile.follow": {
    message: "Seguir",
    description: "Button label to follow a user",
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
    message: "Libros",
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
  "userProfile.community": {
    message: "Comunidad",
    description: "Public profile: community",
  },
  "userProfile.ledgerDescription": {
    message: "Explora cuentas, transacciones e informes financieros.",
    description: "Public profile: ledgerDescription",
  },
  "userProfile.browseDescription": {
    message: "Encuentra un libro. Sigue los números.",
    description: "Public profile: browseDescription",
  },
  "userProfile.searchLedgers": {
    message: "Buscar libros…",
    description: "Public profile: searchLedgers",
  },
  "userProfile.clearSearch": {
    message: "Borrar búsqueda",
    description: "Public profile: clearSearch",
  },
  "userProfile.sortLedgers": {
    message: "Ordenar libros",
    description: "Public profile: sortLedgers",
  },
  "userProfile.recentlyUpdated": {
    message: "Actualizados recientemente",
    description: "Public profile: recentlyUpdated",
  },
  "userProfile.nameAZ": {
    message: "Nombre (A–Z)",
    description: "Public profile: nameAZ",
  },
  "userProfile.noMatches": {
    message:
      "Ningún libro coincide con tu búsqueda. Prueba otro nombre o palabra clave.",
    description: "Public profile: noMatches",
  },
  "userProfile.results": {
    message: "Mostrando {shown} de {total} libros",
    description: "Public profile: results",
  },
  "userProfile.showMore": {
    message: "Mostrar más",
    description: "Public profile: show more social list items",
  },
  "userProfile.loadMoreError": {
    message: "No se pudieron cargar más resultados.",
    description: "Public profile: failed to load the next social page",
  },
  "userProfile.showMoreLedgers": {
    message: "Mostrar más libros",
    description: "Public profile: showMoreLedgers",
  },
  "userProfile.newToBeancount": {
    message: "¿Primera vez en Beancount?",
    description: "Public profile: newToBeancount",
  },
  "userProfile.startExample": {
    message: "Empieza con un ejemplo",
    description: "Public profile: startExample",
  },
  "userProfile.exampleDescription": {
    message:
      "Descubre cómo funcionan los libros. Explora un libro de ejemplo con cuentas, transacciones e informes.",
    description: "Public profile: exampleDescription",
  },
  "userProfile.openExample": {
    message: "Explorar el ejemplo",
    description: "Public profile: openExample",
  },
  "userProfile.showLessActivity": {
    message: "Mostrar menos actividad",
    description: "Public profile: showLessActivity",
  },
  "userProfile.showAllActivity": {
    message: "Mostrar toda la actividad",
    description: "Public profile: showAllActivity",
  },
  "userProfile.linkCopied": {
    message: "Enlace del perfil copiado",
    description: "Public profile: linkCopied",
  },
  "userProfile.copyLinkError": {
    message:
      "No se pudo copiar el enlace. Puedes copiarlo desde la barra de direcciones.",
    description: "Public profile: copyLinkError",
  },
  "userProfile.tryAgain": {
    message: "Reintentar",
    description: "Public profile: tryAgain",
  },
  "userProfile.collectionLabel": {
    message: "Una colección de libros abiertos",
    description: "Public profile: collectionLabel",
  },
  "userProfile.collectionDescription": {
    message:
      "Finanzas reales, abiertas a la exploración. Consulta libros de empresas y ejemplos prácticos para ver Beancount en acción.",
    description: "Public profile: collectionDescription",
  },
  "userProfile.copyLink": {
    message: "Copiar enlace",
    description: "Public profile: copyLink",
  },
  "userProfile.followDescription": {
    message: "Añade este perfil a tu lista de seguidos.",
    description: "Public profile: followDescription",
  },
  "userProfile.footer": {
    message: "Libros abiertos. Finanzas más claras. Con Beancount.",
    description: "Public profile: footer",
  },
  "userProfile.openLedgerName": {
    message: "Open Ledger",
    description:
      "Proper name of the Open Ledger collection; keep the name unchanged",
  },
};

export default esUserProfile;
