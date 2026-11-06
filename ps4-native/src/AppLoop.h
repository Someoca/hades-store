#pragma once

#include "HadesApp.h"
#include "Platform.h"

namespace hades {

// One deterministic frame of the application. Platform-specific input and
// rendering remain injected, keeping the application independent of SDK APIs.
class AppLoop {
public:
    AppLoop(HadesApp& app, InputProvider& input, ViewRenderer& renderer)
        : app_(app), input_(input), renderer_(renderer) {}

    void Step() {
        app_.Tick(input_.Poll());
        renderer_.Render(app_.BuildView());
    }

private:
    HadesApp& app_;
    InputProvider& input_;
    ViewRenderer& renderer_;
};

} // namespace hades
