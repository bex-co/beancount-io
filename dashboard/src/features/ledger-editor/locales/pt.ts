import ptDirectoryBrowse from "../directory-browse/locales/pt";
import ptFileEditor from "../file-editor/locales/pt";
import ptCreateFile from "../create-file/locales/pt";
import ptUploadFiles from "../upload-files/locales/pt";

const ptLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Criar Arquivo",
      description: "Button label to create file",
    },
    "ledgerEditor.branchNotFound": {
      message:
        "O branch “{branch}” não está disponível aqui. Os arquivos são exibidos a partir de {main}.",
      description:
        "404 for a Files URL naming a branch other than the supported one (contains {branch} and {main})",
    },
    "ledgerEditor.browseMainFiles": {
      message: "Ver arquivos em {main}",
      description:
        "Link to the Files root on the supported branch (contains {main})",
    },
    "ledgerEditor.files": {
      message: "Arquivos",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Enviar arquivos",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...ptDirectoryBrowse,
  ...ptFileEditor,
  ...ptCreateFile,
  ...ptUploadFiles,
  ...ptLedgerEditor,
  "ledgerEditor.gitClone": {
    message: "Clonar com Git",
    description: "Button for opening Git clone options",
  },
  "ledgerEditor.failedToLoadDirectory": {
    message: "Falha ao carregar o conteúdo do diretório",
    description: "Error shown when a ledger directory cannot load",
  },
  "ledgerEditor.fileContentEmpty": {
    message: "O conteúdo do arquivo está vazio",
    description: "Empty state for a file without content",
  },
  "ledgerEditor.unableToDisplayImage": {
    message: "Não é possível exibir o conteúdo da imagem",
    description: "Error shown when image content cannot be displayed",
  },
  "ledgerEditor.unsupportedPreviewWithType": {
    message: "Este tipo de arquivo ({type}) não é compatível com visualização",
    description: "Unsupported preview message including the file type",
  },
  "ledgerEditor.unsupportedPreview": {
    message: "Este tipo de arquivo não é compatível com visualização",
    description: "Unsupported preview message without a file type",
  },
  "ledgerEditor.notUtf8Text": {
    message:
      "Este arquivo não é texto UTF-8, então não pode ser exibido nem editado aqui sem alterar seus bytes. Baixe-o para abri-lo em outro programa.",
    description:
      "Shown instead of the editor for a text file whose bytes are not valid UTF-8",
  },
  "ledgerEditor.createFileCommit": {
    message: "Criar arquivo {path}",
    description: "Generated commit message for creating a file",
  },
  "ledgerEditor.updateFileCommit": {
    message: "Atualizar arquivo {path}",
    description: "Generated commit message for updating a file",
  },
  "ledgerEditor.deleteFileCommit": {
    message: "Excluir arquivo {path}",
    description: "Generated commit message for deleting a file",
  },
  "ledgerEditor.folderNamesChecking": {
    message: "Verificando os nomes que já existem nesta pasta…",
    description:
      "Shown while a create or upload form waits for the target folder's existing names before allowing the write",
  },
  "ledgerEditor.folderNamesFailed": {
    message: "Não foi possível verificar os nomes que já existem nesta pasta.",
    description:
      "Shown with Try Again when reading the target folder's existing names failed, so a name clash cannot be ruled out",
  },
};
