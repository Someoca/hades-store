#pragma once

namespace hades {

// Platform adapters translate physical DualShock 4 buttons into these actions.
enum class InputAction {
    None,
    Up,
    Down,
    Left,
    Right,
    Confirm,
    Back,
    Refresh,
    OpenCatalog,
    OpenDownloads,
    OpenSettings
};

} // namespace hades
