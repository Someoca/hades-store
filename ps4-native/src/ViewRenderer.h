#pragma once

#include "AppView.h"

namespace hades {

class ViewRenderer {
public:
    virtual ~ViewRenderer() {}
    virtual void Render(const AppView& view) = 0;
};

} // namespace hades
