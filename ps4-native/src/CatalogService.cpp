#include "CatalogService.h"

namespace hades {

CatalogService::CatalogService(const std::string& endpoint)
    : endpoint_(endpoint) {}

bool CatalogService::Refresh(Catalog& catalog, HttpsClient& client,
                             std::string* error) {
    if (endpoint_.compare(0, 8, "https://") != 0) {
        lastError_ = "Endpoint do catalogo precisa usar HTTPS";
        if (error) *error = lastError_;
        return false;
    }

    std::string document;
    std::string transportError;
    if (!client.Get(endpoint_, document, transportError)) {
        lastError_ = transportError.empty()
            ? "Falha ao consultar o catalogo remoto" : transportError;
        if (error) *error = lastError_;
        return false;
    }

    // Catalog::LoadJson validates the full document before replacing entries.
    std::string validationError;
    if (!catalog.LoadJson(document, &validationError)) {
        lastError_ = "Catalogo remoto rejeitado: " + validationError;
        if (error) *error = lastError_;
        return false;
    }

    lastError_.clear();
    return true;
}

const std::string& CatalogService::LastError() const { return lastError_; }
const std::string& CatalogService::Endpoint() const { return endpoint_; }

} // namespace hades
