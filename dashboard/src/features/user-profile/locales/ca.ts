export interface TranslationEntry {
  message: string;
  description: string;
}

const caUserProfile: Record<string, TranslationEntry> = {
  "userProfile.errorLoadingProfile": {
    message: "Error en carregar el perfil",
    description: "Error title when profile fails to load",
  },
  "userProfile.followError": {
    message: "No s'ha pogut seguir l'usuari",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.followSuccess": {
    message: "Heu seguit {username} correctament",
    description: "Success toast message after following a user",
  },
  "userProfile.joined": {
    message: "Unit",
    description: "Label for account creation date",
  },
  "userProfile.noActivity": {
    message: "Sense activitat recent",
    description: "Message shown when user has no recent activity",
  },
  "userProfile.noRepositories": {
    message: "Sense repositoris",
    description: "Message shown when user has no repositories",
  },
  "userProfile.private": {
    message: "Privat",
    description: "Badge label for private repositories",
  },
  "userProfile.public": {
    message: "Públic",
    description: "Badge label for public repositories",
  },
  "userProfile.recentActivity": {
    message: "Activitat Recent",
    description: "Heading for recent activity section",
  },
  "userProfile.repositories": {
    message: "Llibres",
    description: "Heading for repositories section",
  },
  "userProfile.follow": {
    message: "Segueix",
    description: "Button label to follow a user",
  },
  "userProfile.unfollowError": {
    message: "No s'ha pogut deixar de seguir l'usuari",
    description: "Error toast message when unfollow operation fails",
  },
  "userProfile.unfollowSuccess": {
    message: "Heu deixat de seguir {username} correctament",
    description: "Success toast message after unfollowing a user",
  },
  "userProfile.unfollow": {
    message: "Deixa de seguir",
    description: "Button label to unfollow a user",
  },
  "userProfile.updated": {
    message: "Actualitzat",
    description: "Label prefix for last updated timestamp",
  },
  "userProfile.userNotFound": {
    message: "Usuari no trobat",
    description: "Error title when user profile does not exist",
  },
  "userProfile.userNotFoundMessage": {
    message: "L'usuari @{username} no s'ha pogut trobar.",
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
    message: "Llibres",
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
    message: "Comunitat",
    description: "Public profile: community",
  },
  "userProfile.ledgerDescription": {
    message: "Explora comptes, transaccions i informes financers.",
    description: "Public profile: ledgerDescription",
  },
  "userProfile.browseDescription": {
    message: "Troba un llibre. Segueix els números.",
    description: "Public profile: browseDescription",
  },
  "userProfile.searchLedgers": {
    message: "Cerca llibres…",
    description: "Public profile: searchLedgers",
  },
  "userProfile.clearSearch": {
    message: "Esborra la cerca",
    description: "Public profile: clearSearch",
  },
  "userProfile.sortLedgers": {
    message: "Ordena els llibres",
    description: "Public profile: sortLedgers",
  },
  "userProfile.recentlyUpdated": {
    message: "Actualitzats recentment",
    description: "Public profile: recentlyUpdated",
  },
  "userProfile.nameAZ": {
    message: "Nom (A–Z)",
    description: "Public profile: nameAZ",
  },
  "userProfile.noMatches": {
    message:
      "Cap llibre coincideix amb la cerca. Prova un altre nom o paraula clau.",
    description: "Public profile: noMatches",
  },
  "userProfile.results": {
    message: "Es mostren {shown} de {total} llibres",
    description: "Public profile: results",
  },
  "userProfile.showMoreLedgers": {
    message: "Mostra més llibres",
    description: "Public profile: showMoreLedgers",
  },
  "userProfile.newToBeancount": {
    message: "És el teu primer cop a Beancount?",
    description: "Public profile: newToBeancount",
  },
  "userProfile.startExample": {
    message: "Comença amb un exemple",
    description: "Public profile: startExample",
  },
  "userProfile.exampleDescription": {
    message:
      "Descobreix com funcionen els llibres. Explora un llibre d’exemple amb comptes, transaccions i informes.",
    description: "Public profile: exampleDescription",
  },
  "userProfile.openExample": {
    message: "Explora l’exemple",
    description: "Public profile: openExample",
  },
  "userProfile.showLessActivity": {
    message: "Mostra menys activitat",
    description: "Public profile: showLessActivity",
  },
  "userProfile.showAllActivity": {
    message: "Mostra tota l’activitat",
    description: "Public profile: showAllActivity",
  },
  "userProfile.linkCopied": {
    message: "S’ha copiat l’enllaç del perfil",
    description: "Public profile: linkCopied",
  },
  "userProfile.copyLinkError": {
    message:
      "No s’ha pogut copiar l’enllaç. El pots copiar de la barra d’adreces.",
    description: "Public profile: copyLinkError",
  },
  "userProfile.tryAgain": {
    message: "Torna-ho a provar",
    description: "Public profile: tryAgain",
  },
  "userProfile.collectionLabel": {
    message: "Una col·lecció de llibres oberts",
    description: "Public profile: collectionLabel",
  },
  "userProfile.collectionDescription": {
    message:
      "Finances reals, obertes a l’exploració. Consulta llibres d’empreses i exemples pràctics per veure Beancount en acció.",
    description: "Public profile: collectionDescription",
  },
  "userProfile.copyLink": {
    message: "Copia l’enllaç",
    description: "Public profile: copyLink",
  },
  "userProfile.followDescription": {
    message: "Afegeix aquest perfil a la llista de perfils que segueixes.",
    description: "Public profile: followDescription",
  },
  "userProfile.footer": {
    message: "Llibres oberts. Finances més clares. Amb Beancount.",
    description: "Public profile: footer",
  },
  "userProfile.openLedgerName": {
    message: "Open Ledger",
    description:
      "Proper name of the Open Ledger collection; keep the name unchanged",
  },
};

export default caUserProfile;
