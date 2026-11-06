#pragma once

#include <string>
#include "Catalog.h"
#include "Input.h"
#include "Settings.h"
#include "AppView.h"

namespace hades {

enum class Screen { Home, Catalog, Details, Downloads, Settings };

class HadesApp {
public:
    HadesApp();
    void Tick(InputAction action);
    Screen CurrentScreen() const;
    const Catalog& GetCatalog() const;
    const SettingsManager& GetSettings() const;
    const std::string& StatusMessage() const;
    const char* ScreenName() const;
    const char* ScreenHint() const;
    AppView BuildView() const;
private:
    void SetStatus(const std::string& message);
    void ActivateSelection();
    void GoBack();
    Catalog catalog_;
    SettingsManager settings_;
    Screen screen_;
    std::string status_;
    unsigned int settingsSelection_;
};

} // namespace hades
