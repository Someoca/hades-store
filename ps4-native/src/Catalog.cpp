#include "Catalog.h"\n#include <cstdlib>

namespace hades {

Catalog::Catalog() : selected_(0) {
    // Local demonstration data keeps the interface model usable offline.
    // These are catalog placeholders, not downloadable package links.
    CatalogItem welcome;
    welcome.id = "hades-welcome";
    welcome.title = "Bem-vindo ao HADES";
    welcome.description = "Sua biblioteca homebrew em um unico lugar.";
    welcome.version = "0.1";
    welcome.author = "HADES";
    welcome.packageUrl.clear();
    welcome.sha256.clear();
    welcome.type = ContentType::Utility;
    welcome.packageSize = 0;
    welcome.featured = true;
    items_.push_back(welcome);

    CatalogItem catalog;
    catalog.id = "catalog-coming-soon";
    catalog.title = "Catalogo online";
    catalog.description = "A integracao HTTPS sera habilitada apos a camada de rede.";
    catalog.version = "Em desenvolvimento";
    catalog.author = "HADES";
    catalog.packageUrl.clear();
    catalog.sha256.clear();
    catalog.type = ContentType::Homebrew;
    catalog.packageSize = 0;
    catalog.featured = false;
    items_.push_back(catalog);
}

const std::vector<CatalogItem>& Catalog::Items() const { return items_; }

const CatalogItem* Catalog::Selected() const {
    return selected_ < items_.size() ? &items_[selected_] : 0;
}

std::size_t Catalog::SelectedIndex() const { return selected_; }
std::size_t Catalog::Count() const { return items_.size(); }

bool Catalog::Select(std::size_t index) {
    if (index >= items_.size()) return false;
    selected_ = index;
    return true;
}

bool Catalog::MoveSelection(int direction) {
    if (items_.empty() || direction == 0) return false;
    if (direction > 0) {
        selected_ = (selected_ + 1) % items_.size();
    } else {
        selected_ = selected_ == 0 ? items_.size() - 1 : selected_ - 1;
    }
    return true;
}

void Catalog::ResetSelection() { selected_ = 0; }

bool Catalog::Add(const CatalogItem& item, std::string* reason) {
    if (!Validate(item, reason)) return false;
    for (std::size_t i = 0; i < items_.size(); ++i) {
        if (items_[i].id == item.id) {
            if (reason) *reason = "ID duplicado no catalogo";
            return false;
        }
    }
    items_.push_back(item);
    return true;
}

bool Catalog::Validate(const CatalogItem& item, std::string* reason) {
    if (item.id.empty() || item.id.size() > 64) {
        if (reason) *reason = "ID ausente ou maior que 64 caracteres";
        return false;
    }
    if (item.title.empty() || item.title.size() > 96) {
        if (reason) *reason = "Titulo ausente ou maior que 96 caracteres";
        return false;
    }
    if (item.description.size() > 512 || item.author.size() > 64 ||
        item.version.size() > 32) {
        if (reason) *reason = "Campo de texto excede o limite permitido";
        return false;
    }
    if (item.packageSize > 4ULL * 1024ULL * 1024ULL * 1024ULL) {
        if (reason) *reason = "Pacote excede o limite maximo de 4 GiB";
        return false;
    }
    // A URL/hash pair is required before an item can be considered downloadable.
    if (!item.packageUrl.empty() && item.sha256.size() != 64) {
        if (reason) *reason = "Download exige SHA-256 com 64 caracteres";
        return false;
    }
    if (item.packageUrl.compare(0, 8, "https://") != 0 &&
        !item.packageUrl.empty()) {
        if (reason) *reason = "Somente URLs HTTPS sao permitidas";
        return false;
    }
    return true;
}

} // namespace hades
