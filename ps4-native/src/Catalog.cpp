#include "Catalog.h"
#include <cstdlib>
#include <limits>

namespace hades {
namespace {
bool ReadString(const JsonValue& object, const char* key, std::string& out,
                bool required, std::string* error) {
    const JsonValue* value = object.Find(key);
    if (!value) {
        if (required && error) *error = std::string("Campo obrigatorio ausente: ") + key;
        return !required;
    }
    if (value->type != JsonType::String) {
        if (error) *error = std::string("Campo precisa ser texto: ") + key;
        return false;
    }
    out = value->text;
    return true;
}
bool ReadBool(const JsonValue& object, const char* key, bool& out,
              bool fallback, std::string* error) {
    const JsonValue* value = object.Find(key);
    if (!value) { out = fallback; return true; }
    if (value->type != JsonType::Boolean) {
        if (error) *error = std::string("Campo precisa ser booleano: ") + key;
        return false;
    }
    out = value->booleanValue;
    return true;
}
bool ReadSize(const JsonValue& object, unsigned long long& out,
              std::string* error) {
    const JsonValue* value = object.Find("packageSize");
    if (!value) { out = 0; return true; }
    if (value->type != JsonType::Number || value->text.empty()) {
        if (error) *error = "packageSize precisa ser numero inteiro";
        return false;
    }
    for (std::size_t i = 0; i < value->text.size(); ++i) {
        if (value->text[i] < '0' || value->text[i] > '9') {
            if (error) *error = "packageSize precisa ser inteiro nao negativo";
            return false;
        }
    }
    char* end = 0;
    const unsigned long long parsed = std::strtoull(value->text.c_str(), &end, 10);
    if (!end || *end != '\0' || parsed > 4ULL * 1024ULL * 1024ULL * 1024ULL) {
        if (error) *error = "packageSize excede o limite de 4 GiB";
        return false;
    }
    out = parsed;
    return true;
}
}

Catalog::Catalog() : selected_(0) {
    CatalogItem welcome;
    welcome.id = "hades-welcome";
    welcome.title = "Bem-vindo ao HADES";
    welcome.description = "Sua biblioteca homebrew em um unico lugar.";
    welcome.version = "0.1";
    welcome.author = "HADES";
    welcome.packageUrl.clear(); welcome.sha256.clear();
    welcome.type = ContentType::Utility;
    welcome.packageSize = 0; welcome.featured = true;
    items_.push_back(welcome);

    CatalogItem catalog;
    catalog.id = "catalog-coming-soon";
    catalog.title = "Catalogo online";
    catalog.description = "A integracao HTTPS sera habilitada apos a camada de rede.";
    catalog.version = "Em desenvolvimento";
    catalog.author = "HADES";
    catalog.packageUrl.clear(); catalog.sha256.clear();
    catalog.type = ContentType::Homebrew;
    catalog.packageSize = 0; catalog.featured = false;
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
    selected_ = index; return true;
}
bool Catalog::MoveSelection(int direction) {
    if (items_.empty() || direction == 0) return false;
    selected_ = direction > 0 ? (selected_ + 1) % items_.size()
        : (selected_ == 0 ? items_.size() - 1 : selected_ - 1);
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
    items_.push_back(item); return true;
}
bool Catalog::Validate(const CatalogItem& item, std::string* reason) {
    if (item.id.empty() || item.id.size() > 64) {
        if (reason) *reason = "ID ausente ou maior que 64 caracteres"; return false;
    }
    if (item.title.empty() || item.title.size() > 96) {
        if (reason) *reason = "Titulo ausente ou maior que 96 caracteres"; return false;
    }
    if (item.description.size() > 512 || item.author.size() > 64 ||
        item.version.size() > 32) {
        if (reason) *reason = "Campo de texto excede o limite permitido"; return false;
    }
    if (item.packageSize > 4ULL * 1024ULL * 1024ULL * 1024ULL) {
        if (reason) *reason = "Pacote excede o limite maximo de 4 GiB"; return false;
    }
    if (!item.packageUrl.empty()) {
        if (item.packageUrl.compare(0, 8, "https://") != 0) {
            if (reason) *reason = "Somente URLs HTTPS sao permitidas"; return false;
        }
        if (item.sha256.size() != 64) {
            if (reason) *reason = "Download exige SHA-256 com 64 caracteres"; return false;
        }
        for (std::size_t i = 0; i < item.sha256.size(); ++i) {
            const char c = item.sha256[i];
            if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') ||
                  (c >= 'A' && c <= 'F'))) {
                if (reason) *reason = "SHA-256 contem caractere invalido"; return false;
            }
        }
    }
    return true;
}

bool Catalog::LoadJson(const std::string& document, std::string* reason) {
    JsonValue root;
    JsonParser parser;
    std::string error;
    if (!parser.Parse(document, root, &error)) {
        if (reason) *reason = error; return false;
    }
    if (root.type != JsonType::Object) {
        if (reason) *reason = "Raiz do catalogo precisa ser objeto JSON"; return false;
    }
    const JsonValue* schema = root.Find("schemaVersion");
    const JsonValue* entries = root.Find("items");
    if (!schema || schema->type != JsonType::Number || schema->text != "1") {
        if (reason) *reason = "schemaVersion precisa ser o inteiro 1"; return false;
    }
    if (!entries || entries->type != JsonType::Array || entries->array.size() > 500) {
        if (reason) *reason = "items precisa ser array com no maximo 500 entradas"; return false;
    }

    Catalog candidate;
    candidate.items_.clear();
    candidate.selected_ = 0;
    for (std::size_t i = 0; i < entries->array.size(); ++i) {
        const JsonValue& value = entries->array[i];
        if (value.type != JsonType::Object) {
            if (reason) *reason = "Cada item do catalogo precisa ser objeto"; return false;
        }
        CatalogItem item;
        item.packageSize = 0; item.featured = false;
        item.type = ContentType::Homebrew;
        if (!ReadString(value, "id", item.id, true, &error) ||
            !ReadString(value, "title", item.title, true, &error) ||
            !ReadString(value, "description", item.description, false, &error) ||
            !ReadString(value, "version", item.version, false, &error) ||
            !ReadString(value, "author", item.author, false, &error) ||
            !ReadString(value, "packageUrl", item.packageUrl, false, &error) ||
            !ReadString(value, "sha256", item.sha256, false, &error) ||
            !ReadBool(value, "featured", item.featured, false, &error) ||
            !ReadSize(value, item.packageSize, &error)) {
            if (reason) *reason = error; return false;
        }
        std::string type;
        if (!ReadString(value, "type", type, false, &error)) {
            if (reason) *reason = error; return false;
        }
        if (type == "utility") item.type = ContentType::Utility;
        else if (type == "emulator") item.type = ContentType::Emulator;
        else if (type == "game") item.type = ContentType::Game;
        else if (!type.empty() && type != "homebrew") {
            if (reason) *reason = "Tipo de item desconhecido"; return false;
        }
        if (!candidate.Add(item, &error)) {
            if (reason) *reason = error; return false;
        }
    }
    items_.swap(candidate.items_);
    selected_ = 0;
    return true;
}

} // namespace hades
