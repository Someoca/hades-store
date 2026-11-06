#include "HadesApp.h"

namespace hades {

HadesApp::HadesApp()
    : screen_(Screen::Home), settingsSelection_(0), homeSelection_(0),
      status_("Inicializacao concluida. Aguardando entrada do controle.") {}

void HadesApp::Tick(InputAction action) {
    switch (action) {
        case InputAction::Up:
            if (screen_ == Screen::Home) {
                homeSelection_ = homeSelection_ == 0 ? 2 : homeSelection_ - 1;
            } else if (screen_ == Screen::Catalog) {
                catalog_.MoveSelection(-1);
                SetStatus("Item anterior selecionado.");
            } else if (screen_ == Screen::Settings) {
                settingsSelection_ = settingsSelection_ == 0 ? 2 : settingsSelection_ - 1;
            }
            break;
        case InputAction::Down:
            if (screen_ == Screen::Home) {
                homeSelection_ = (homeSelection_ + 1) % 3;
            } else if (screen_ == Screen::Catalog) {
                catalog_.MoveSelection(1);
                SetStatus("Proximo item selecionado.");
            } else if (screen_ == Screen::Settings) {
                settingsSelection_ = (settingsSelection_ + 1) % 3;
            }
            break;
        case InputAction::Left:
        case InputAction::Right:
            if (screen_ == Screen::Settings) {
                const bool enable = action == InputAction::Right;
                if (settingsSelection_ == 0) settings_.SetOnlineCatalog(enable);
                else if (settingsSelection_ == 1) settings_.SetFeaturedFirst(enable);
                else settings_.SetConfirmBeforeDownload(enable);
                SetStatus("Preferencia atualizada na memoria.");
            }
            break;
        case InputAction::Confirm:
            ActivateSelection();
            break;
        case InputAction::Back:
            GoBack();
            break;
        case InputAction::Refresh:
            if (screen_ == Screen::Catalog) {
                catalog_.ResetSelection();
                SetStatus("Selecao do catalogo reiniciada.");
            }
            break;
        case InputAction::OpenCatalog:
            screen_ = Screen::Catalog;
            SetStatus("Catalogo local aberto.");
            break;
        case InputAction::OpenDownloads:
            screen_ = Screen::Downloads;
            SetStatus("Gerenciador de downloads. Nenhum download iniciado.");
            break;
        case InputAction::OpenSettings:
            screen_ = Screen::Settings;
            SetStatus("Configuracoes do HADES.");
            break;
        case InputAction::None:
        default:
            break;
    }
}

void HadesApp::ActivateSelection() {
    switch (screen_) {
        case Screen::Home:
            if (homeSelection_ == 0) {
                screen_ = Screen::Catalog;
                SetStatus("Catalogo local aberto. Catalogo online ainda nao habilitado.");
            } else if (homeSelection_ == 1) {
                screen_ = Screen::Downloads;
                SetStatus("Gerenciador de downloads aberto.");
            } else {
                screen_ = Screen::Settings;
                SetStatus("Configuracoes do HADES.");
            }
            break;
        case Screen::Catalog:
            if (catalog_.Selected()) {
                screen_ = Screen::Details;
                SetStatus("Detalhes: " + catalog_.Selected()->title);
            } else SetStatus("Nenhum item selecionado.");
            break;
        case Screen::Details:
            SetStatus("Item informativo. Nenhum pacote sera instalado automaticamente.");
            break;
        case Screen::Downloads:
            SetStatus("Downloads aguardam transporte HTTPS e verificacao SHA-256.");
            break;
        case Screen::Settings:
            SetStatus("Use esquerda/direita para alterar a opcao selecionada.");
            break;
    }
}

void HadesApp::GoBack() {
    switch (screen_) {
        case Screen::Home: SetStatus("HADES continua em execucao."); break;
        case Screen::Catalog:
        case Screen::Downloads:
        case Screen::Settings:
            screen_ = Screen::Home; SetStatus("Retornou ao inicio."); break;
        case Screen::Details:
            screen_ = Screen::Catalog; SetStatus("Retornou ao catalogo."); break;
    }
}

void HadesApp::SetStatus(const std::string& message) { status_ = message; }
Screen HadesApp::CurrentScreen() const { return screen_; }
const Catalog& HadesApp::GetCatalog() const { return catalog_; }
const SettingsManager& HadesApp::GetSettings() const { return settings_; }
const std::string& HadesApp::StatusMessage() const { return status_; }

const char* HadesApp::ScreenName() const {
    switch (screen_) {
        case Screen::Home: return "Inicio";
        case Screen::Catalog: return "Catalogo";
        case Screen::Details: return "Detalhes";
        case Screen::Downloads: return "Downloads";
        case Screen::Settings: return "Configuracoes";
        default: return "Desconhecida";
    }
}
const char* HadesApp::ScreenHint() const {
    switch (screen_) {
        case Screen::Home: return "Catalogo | Downloads | Configuracoes";
        case Screen::Catalog: return "Cima/Baixo: navegar | X: detalhes | O: voltar";
        case Screen::Details: return "O: voltar ao catalogo";
        case Screen::Downloads: return "Downloads verificados aparecerao aqui";
        case Screen::Settings: return "Cima/Baixo: escolher | Esquerda/Direita: alterar";
        default: return "";
    }
}


AppView HadesApp::BuildView() const {
    AppView view;
    view.title = std::string("HADES Store - ") + ScreenName();
    view.hint = ScreenHint();
    view.status = status_;

    switch (screen_) {
        case Screen::Home: {
            view.detail = "Central de conteudo homebrew para PS4.";
            const char* labels[] = {"Catalogo", "Downloads", "Configuracoes"};
            view.selectedIndex = homeSelection_;
            for (std::size_t i = 0; i < 3; ++i) {
                ViewRow row;
                row.title = labels[i];
                row.subtitle = i == 0 ? "Explorar conteudo disponivel" :
                               (i == 1 ? "Acompanhar tarefas de download" :
                                         "Preferencias do aplicativo");
                row.selected = i == homeSelection_;
                view.rows.push_back(row);
            }
            break;
        }
        case Screen::Catalog: {
            view.detail = "Itens carregados: " + std::to_string(catalog_.Count());
            view.selectedIndex = catalog_.SelectedIndex();
            if (catalog_.Count() == 0) {
                ViewRow empty;
                empty.title = "Catalogo vazio";
                empty.subtitle = "Adicione itens ao catalogo local ou configure a fonte remota.";
                empty.selected = true;
                view.rows.push_back(empty);
            }
            const std::vector<CatalogItem>& items = catalog_.Items();
            for (std::size_t i = 0; i < items.size(); ++i) {
                ViewRow row;
                row.title = items[i].title;
                row.subtitle = items[i].version.empty() ? items[i].description :
                               items[i].version + " - " + items[i].description;
                row.selected = i == view.selectedIndex;
                view.rows.push_back(row);
            }
            break;
        }
        case Screen::Details: {
            const CatalogItem* item = catalog_.Selected();
            if (item) {
                const char* typeName = "Conteudo";
                switch (item->type) {
                    case ContentType::Homebrew: typeName = "Homebrew"; break;
                    case ContentType::Utility: typeName = "Utilitario"; break;
                    case ContentType::Emulator: typeName = "Emulador"; break;
                    case ContentType::Game: typeName = "Jogo"; break;
                }
                view.detail = std::string(typeName) + "\\n" + item->description +
                              "\\nVersao: " + item->version + "\\nAutor: " + item->author;
                ViewRow row;
                row.title = item->title;
                row.subtitle = item->packageSize == 0 ? "Tamanho nao informado" :
                               "Pacote: " + std::to_string(item->packageSize) + " bytes";
                row.selected = true;
                view.rows.push_back(row);
            } else {
                view.detail = "Nenhum item selecionado no catalogo.";
            }
            break;
        }
        case Screen::Downloads:
            view.detail = "A fila sera exibida quando o transporte HTTPS e o verificador SHA-256 forem conectados.";
            break;
        case Screen::Settings: {
            const AppSettings& settings = settings_.Get();
            const char* labels[] = {"Catalogo online", "Destaques primeiro", "Confirmar download"};
            const bool values[] = {settings.enableOnlineCatalog, settings.showFeaturedFirst,
                                   settings.confirmBeforeDownload};
            view.selectedIndex = settingsSelection_;
            for (std::size_t i = 0; i < 3; ++i) {
                ViewRow row;
                row.title = labels[i];
                row.subtitle = values[i] ? "Ativado" : "Desativado";
                row.selected = i == settingsSelection_;
                view.rows.push_back(row);
            }
            break;
        }
    }
    return view;
}

} // namespace hades
