#pragma once

#include <cstddef>
#include <string>
#include <vector>
#include "Json.h"

namespace hades {

enum class ContentType { Homebrew, Utility, Emulator, Game };

struct CatalogItem {
    std::string id, title, description, version, author, packageUrl, sha256;
    ContentType type;
    unsigned long long packageSize;
    bool featured;
};

class Catalog {
public:
    Catalog();
    const std::vector<CatalogItem>& Items() const;
    const CatalogItem* Selected() const;
    std::size_t SelectedIndex() const;
    std::size_t Count() const;
    bool Select(std::size_t index);
    bool MoveSelection(int direction);
    void ResetSelection();
    bool Add(const CatalogItem& item, std::string* reason = 0);
    static bool Validate(const CatalogItem& item, std::string* reason = 0);
    bool LoadJson(const std::string& document, std::string* reason = 0);
private:
    std::vector<CatalogItem> items_;
    std::size_t selected_;
};

} // namespace hades
