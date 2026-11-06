#pragma once

#include <cstddef>
#include <string>
#include <vector>

namespace hades {

struct ViewRow {
    std::string title;
    std::string subtitle;
    bool selected;
    ViewRow() : selected(false) {}
};

struct AppView {
    std::string title;
    std::string hint;
    std::string status;
    std::string detail;
    std::vector<ViewRow> rows;
    std::size_t selectedIndex;

    AppView() : selectedIndex(0) {}
};

} // namespace hades
