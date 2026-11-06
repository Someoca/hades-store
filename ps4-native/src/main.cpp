// HADES Store — native PS4 application entry point.
// This stage implements the application domain and navigation model.
// Hardware input, graphics and network adapters remain isolated for later work.

#include <cstdio>
#include <cstdlib>
#include <orbis/libkernel.h>

#include "HadesApp.h"

namespace {
const unsigned int kHeartbeatMicroseconds = 2000000;
}

int main() {
    std::setvbuf(stdout, 0, _IONBF, 0);

    hades::HadesApp app;
    std::puts("[HADES] Native application starting");
    std::puts("[HADES] Application state and local catalog initialized");
    std::puts("[HADES] Platform adapters: pending verified OpenOrbis integration");

    unsigned long long heartbeat = 0;
    for (;;) {
        // No physical controller polling is performed in this stage.
        app.Tick(hades::InputAction::None);
        std::printf("[HADES] %s | %s | cycle %llu\n",
                    app.ScreenName(), app.StatusMessage().c_str(), heartbeat++);
        sceKernelUsleep(kHeartbeatMicroseconds);
    }
    return 0;
}
