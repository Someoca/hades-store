#pragma once

#include <string>
#include "Input.h"

namespace hades {

// Interfaces isolate the application from SDK-specific PS4 APIs.
// Concrete graphics, controller, HTTP and filesystem adapters are added only
// after their OpenOrbis interfaces are confirmed for the target toolchain.
class InputProvider {
public:
    virtual ~InputProvider() {}
    virtual InputAction Poll() = 0;
};

class ViewRenderer {
public:
    virtual ~ViewRenderer() {}
    virtual void ShowStatus(const std::string& title,
                            const std::string& message) = 0;
};

class HttpsClient {
public:
    virtual ~HttpsClient() {}
    virtual bool Get(const std::string& url,
                     std::string& response,
                     std::string& error) = 0;
};

} // namespace hades
