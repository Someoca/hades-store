// HADES Store — native PS4 bootstrap
// Stage: minimal application lifecycle, based on the OpenOrbis Hello World API.
// This source deliberately avoids unverified graphics/network/controller APIs.

#include <cstdio>
#include <orbis/libkernel.h>

namespace {
constexpr unsigned int kHeartbeatMicroseconds = 2'000'000;
}

int main() {
    // Keep stdout unbuffered so diagnostics are visible immediately.
    std::setvbuf(stdout, nullptr, _IONBF, 0);

    std::puts("[HADES] Native bootstrap starting");
    std::puts("[HADES] OpenOrbis libkernel entry point reached");
    std::puts("[HADES] Graphics, controller and network modules are not enabled yet");

    unsigned long long heartbeat = 0;
    for (;;) {
        std::printf("[HADES] Running — heartbeat %llu\n", heartbeat++);
        sceKernelUsleep(kHeartbeatMicroseconds);
    }

    return 0;
}
