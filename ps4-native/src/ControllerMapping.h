#pragma once

#include "Input.h"

namespace hades {

// Logical button identifiers. The OpenOrbis controller adapter must translate
// its confirmed SDK button constants to these values; no SDK bitmask is assumed.
enum class ControllerButton {
    DpadUp, DpadDown, DpadLeft, DpadRight,
    Cross, Circle, Square, Triangle,
    L1, R1, Options, Touchpad, Unknown
};

class ControllerMapping {
public:
    static InputAction ToAction(ControllerButton button) {
        switch (button) {
            case ControllerButton::DpadUp: return InputAction::Up;
            case ControllerButton::DpadDown: return InputAction::Down;
            case ControllerButton::DpadLeft: return InputAction::Left;
            case ControllerButton::DpadRight: return InputAction::Right;
            case ControllerButton::Cross: return InputAction::Confirm;
            case ControllerButton::Circle: return InputAction::Back;
            case ControllerButton::Square: return InputAction::Refresh;
            case ControllerButton::Triangle: return InputAction::OpenCatalog;
            case ControllerButton::L1: return InputAction::OpenDownloads;
            case ControllerButton::R1: return InputAction::OpenSettings;
            case ControllerButton::Options:
            case ControllerButton::Touchpad:
            case ControllerButton::Unknown:
            default: return InputAction::None;
        }
    }
};

} // namespace hades
