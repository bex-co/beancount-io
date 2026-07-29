export interface TranslationEntry {
  message: string;
  description: string;
}

const ptGalleryPage: Record<string, TranslationEntry> = {
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
