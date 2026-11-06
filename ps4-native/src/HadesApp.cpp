#include "HadesApp.h"

namespace hades {

HadesApp::HadesApp()
    : screen_(Screen::Home),
      status_("Inicializacao concluida. Aguardando entrada do controle.") {}

void HadesApp::Tick(InputAction action) {
    switch (action) {
        case InputAction::Up:
            if (screen_ == Screen::Catalog) {
                catalog_.MoveSelection(-1);
                SetStatus("Item anterior selecionado.");
            }
            break;
        case InputAction::Down:
            if (screen_ == Screen::Catalog) {
                catalog_.MoveSelection(1);
                SetStatus("Proximo item selecionado.");
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
        case InputAction::Left:
        case InputAction::Right:
        case InputAction::None:
        default:
            break;
    }
}

void HadesApp::ActivateSelection() {
    switch (screen_) {
        case Screen::Home:
            screen_ = Screen::Catalog;
            SetStatus("Catalogo local aberto. Catalogo online ainda nao habilitado.");
            break;
        case Screen::Catalog:
            if (catalog_.Selected()) {
                screen_ = Screen::Details;
                SetStatus("Detalhes: " + catalog_.Selected()->title);
            } else {
                SetStatus("Nenhum item selecionado.");
            }
            break;
        case Screen::Details:
            SetStatus("Item informativo. Nenhum pacote sera instalado automaticamente.");
            break;
        case Screen::Downloads:
            SetStatus("Downloads aguardam integracao de transporte HTTPS e verificacao.");
            break;
        case Screen::Settings:
            SetStatus("Configuracoes: interface e rede serao configuradas em etapas futuras.");
            break;
    }
}

void HadesApp::GoBack() {
    switch (screen_) {
        case Screen::Home:
            SetStatus("HADES continua em execucao.");
            break;
        case Screen::Catalog:
        case Screen::Downloads:
        case Screen::Settings:
            screen_ = Screen::Home;
            SetStatus("Retornou ao inicio.");
            break;
        case Screen::Details:
            screen_ = Screen::Catalog;
            SetStatus("Retornou ao catalogo.");
            break;
    }
}

void HadesApp::SetStatus(const std::string& message) { status_ = message; }
Screen HadesApp::CurrentScreen() const { return screen_; }
const Catalog& HadesApp::GetCatalog() const { return catalog_; }
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
        case Screen::Settings: return "Preferencias do aplicativo";
        default: return "";
    }
}

} // namespace hades
