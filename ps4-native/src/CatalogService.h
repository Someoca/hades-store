#pragma once

#include <string>
#include "Catalog.h"
#include "Platform.h"

namespace hades {

class CatalogService {
public:
    explicit CatalogService(const std::string& endpoint);

    bool Refresh(Catalog& catalog, HttpsClient& client,
                 std::string* error = 0);
    const std::string& LastError() const;
    const std::string& Endpoint() const;

private:
    std::string endpoint_;
    std::string lastError_;
};

} // namespace hades
