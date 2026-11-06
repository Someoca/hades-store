#pragma once

namespace hades {

// Renderer-independent visual tokens. Concrete PS4 graphics code must map
// these semantic values to the verified API/pixel format of the target build.
struct UiColor {
    unsigned char r;
    unsigned char g;
    unsigned char b;
    unsigned char a;

    UiColor(unsigned char red, unsigned char green, unsigned char blue,
            unsigned char alpha = 255)
        : r(red), g(green), b(blue), a(alpha) {}
};

struct UiTheme {
    static UiColor Background() { return UiColor(12, 14, 20); }
    static UiColor Surface() { return UiColor(25, 29, 39); }
    static UiColor SurfaceSelected() { return UiColor(39, 48, 65); }
    static UiColor Accent() { return UiColor(0, 190, 170); }
    static UiColor TextPrimary() { return UiColor(245, 247, 250); }
    static UiColor TextSecondary() { return UiColor(163, 172, 187); }
    static UiColor Warning() { return UiColor(245, 181, 65); }

    static unsigned int Margin() { return 48; }
    static unsigned int RowHeight() { return 68; }
    static unsigned int RowGap() { return 12; }
    static unsigned int HeaderHeight() { return 92; }
    static unsigned int FooterHeight() { return 56; }
};

} // namespace hades
