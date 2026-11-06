#pragma once

#include <string>
#include "Catalog.h"
#include "Input.h"

namespace hades {

enum class Screen {
    Home,
    Catalog,
    Details,
    Downloads,
    Settings
};

class HadesApp {
public:
    HadesApp();

    void Tick(InputAction action);
    Screen CurrentScreen() const;
    const Catalog& GetCatalog() const;
    const std::string& StatusMessage() const;
    const char* ScreenName() const;\n    const char* ScreenHint() const;

private:
    void SetStatus(const std::string& message);
    void ActivateSelection();
    void GoBack();

    Catalog catalog_;
    Screen screen_;
    std::string status_;
};

} // namespace hades
