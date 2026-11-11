export interface TranslationEntry {
  message: string;
  description: string;
}

const ptGalleryPage: Record<string, TranslationEntry> = {
  "page.gallery.minimumSearchCharacters": {
    message: "Digite pelo menos 2 caracteres para pesquisar.",
    description:
      "Polite search status when fewer than two characters have been entered",
  },
  "page.gallery.noMatchingLedgers": {
    message: "Nenhum livro-razão corresponde a {query}",
    description:
      "Polite status naming the completed search that found no ledgers",
  },
  "page.gallery.ledgersFound_one": {
    message: "{count} livro-razão encontrado",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersFound_many": {
    message: "{count} livros-razão encontrados",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersFound_other": {
    message: "{count} livros-razão encontrados",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersShownMoreAvailable_one": {
    message: "Mostrando {count} livro-razão — há mais disponíveis",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.ledgersShownMoreAvailable_many": {
    message:
      "Mostrando os primeiros {count} livros-razão — há mais disponíveis",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.ledgersShownMoreAvailable_other": {
    message:
      "Mostrando os primeiros {count} livros-razão — há mais disponíveis",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.showMoreLedgers": {
    message: "Mostrar mais livros-razão",
    description: "Button that loads the next page of ledger search results",
  },
  "page.gallery.failedToSearchLedgers": {
    message: "Falha ao pesquisar livros-razão",
    description: "Error message when search fails",
  },
  "page.gallery.ledgerGallery": {
    message: "Galeria de Livros-Razão",
    description: "Title for gallery page",
  },
  "page.gallery.ledgerGalleryDescription": {
    message:
      "Descubra e explore todos os livros-razão disponíveis. Pesquise por nome para encontrar e navegar rapidamente para qualquer livro-razão.",
    description: "Description for gallery page",
  },
  "page.gallery.noLedgersFound": {
    message: "Nenhum livro-razão encontrado",
    description: "Message when user has no ledgers",
  },
  "page.gallery.searchLedgersPlaceholder": {
    message:
      "Pesquise livros-razão e navegue até eles. Digite pelo menos 2 caracteres para pesquisar.",
    description: "Placeholder for ledger search input",
  },
  "page.gallery.tryAdjustingSearchQuery": {
    message:
      "Tente ajustar sua consulta de pesquisa para encontrar mais livros-razão.",
    description: "Suggestion to adjust search query",
  },
};

export default ptGalleryPage;
