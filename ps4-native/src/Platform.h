#pragma once

#include <string>
#include "Input.h"
#include "ViewRenderer.h"

namespace hades {

class InputProvider {
public:
    virtual ~InputProvider() {}
    virtual InputAction Poll() = 0;
};

class HttpsClient {
public:
    virtual ~HttpsClient() {}
    virtual bool Get(const std::string& url, std::string& response,
                     std::string& error) = 0;
};

} // namespace hades
