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
    message: "Livros",
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
    message: "Livros",
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
    message: "Comunidade",
    description: "Public profile: community",
  },
  "userProfile.ledgerDescription": {
    message: "Explore contas, transações e relatórios financeiros.",
    description: "Public profile: ledgerDescription",
  },
  "userProfile.browseDescription": {
    message: "Encontre um livro. Acompanhe os números.",
    description: "Public profile: browseDescription",
  },
  "userProfile.searchLedgers": {
    message: "Pesquisar livros…",
    description: "Public profile: searchLedgers",
  },
  "userProfile.clearSearch": {
    message: "Limpar pesquisa",
    description: "Public profile: clearSearch",
  },
  "userProfile.sortLedgers": {
    message: "Ordenar livros",
    description: "Public profile: sortLedgers",
  },
  "userProfile.recentlyUpdated": {
    message: "Atualizados recentemente",
    description: "Public profile: recentlyUpdated",
  },
  "userProfile.nameAZ": {
    message: "Nome (A–Z)",
    description: "Public profile: nameAZ",
  },
  "userProfile.noMatches": {
    message:
      "Nenhum livro corresponde à pesquisa. Tente outro nome ou palavra-chave.",
    description: "Public profile: noMatches",
  },
  "userProfile.results": {
    message: "Mostrando {shown} de {total} livros",
    description: "Public profile: results",
  },
  "userProfile.showMore": {
    message: "Mostrar mais",
    description: "Public profile: show more social list items",
  },
  "userProfile.loadMoreError": {
    message: "Não foi possível carregar mais resultados.",
    description: "Public profile: failed to load the next social page",
  },
  "userProfile.showMoreLedgers": {
    message: "Mostrar mais livros",
    description: "Public profile: showMoreLedgers",
  },
  "userProfile.newToBeancount": {
    message: "Novo no Beancount?",
    description: "Public profile: newToBeancount",
  },
  "userProfile.startExample": {
    message: "Comece com um exemplo",
    description: "Public profile: startExample",
  },
  "userProfile.exampleDescription": {
    message:
      "Conheça os livros. Explore um livro de exemplo com contas, transações e relatórios.",
    description: "Public profile: exampleDescription",
  },
  "userProfile.openExample": {
    message: "Explorar o exemplo",
    description: "Public profile: openExample",
  },
  "userProfile.showLessActivity": {
    message: "Mostrar menos atividade",
    description: "Public profile: showLessActivity",
  },
  "userProfile.showAllActivity": {
    message: "Mostrar toda a atividade",
    description: "Public profile: showAllActivity",
  },
  "userProfile.linkCopied": {
    message: "Link do perfil copiado",
    description: "Public profile: linkCopied",
  },
  "userProfile.copyLinkError": {
    message:
      "Não foi possível copiar o link. Pode copiá-lo da barra de endereços.",
    description: "Public profile: copyLinkError",
  },
  "userProfile.tryAgain": {
    message: "Tentar novamente",
    description: "Public profile: tryAgain",
  },
  "userProfile.collectionLabel": {
    message: "Uma coleção de livros abertos",
    description: "Public profile: collectionLabel",
  },
  "userProfile.collectionDescription": {
    message:
      "Finanças reais, abertas à exploração. Consulte livros de empresas e exemplos práticos para ver o Beancount em ação.",
    description: "Public profile: collectionDescription",
  },
  "userProfile.copyLink": {
    message: "Copiar link",
    description: "Public profile: copyLink",
  },
  "userProfile.followDescription": {
    message: "Adicione este perfil à sua lista de perfis seguidos.",
    description: "Public profile: followDescription",
  },
  "userProfile.footer": {
    message: "Livros abertos. Finanças mais claras. Com Beancount.",
    description: "Public profile: footer",
  },
  "userProfile.openLedgerName": {
    message: "Open Ledger",
    description:
      "Proper name of the Open Ledger collection; keep the name unchanged",
  },
};

export default ptUserProfile;
