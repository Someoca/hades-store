#pragma once

#include <string>
#include <vector>

namespace hades {

enum class ContentType {
    Homebrew,
    Utility,
    Emulator,
    Game
};

struct CatalogItem {
    std::string id;
    std::string title;
    std::string description;
    std::string version;
    std::string author;
    std::string packageUrl;
    std::string sha256;
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

    // Adds only structurally valid entries. Network/JSON parsing is handled
    // by a later adapter and must call this validation boundary.
    bool Add(const CatalogItem& item, std::string* reason = 0);
    static bool Validate(const CatalogItem& item, std::string* reason = 0);

private:
    std::vector<CatalogItem> items_;
    std::size_t selected_;
};

} // namespace hades
