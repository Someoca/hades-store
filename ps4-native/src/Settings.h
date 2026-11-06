#pragma once

#include <string>

namespace hades {

struct AppSettings {
    bool enableOnlineCatalog;
    bool showFeaturedFirst;
    bool confirmBeforeDownload;
    unsigned int maxDownloadMegabytes;

    AppSettings()
        : enableOnlineCatalog(false),
          showFeaturedFirst(true),
          confirmBeforeDownload(true),
          maxDownloadMegabytes(4096) {}
};

class SettingsStore {
public:
    virtual ~SettingsStore() {}
    virtual bool Load(AppSettings& settings, std::string& error) = 0;
    virtual bool Save(const AppSettings& settings, std::string& error) = 0;
};

class SettingsManager {
public:
    SettingsManager();

    const AppSettings& Get() const;
    bool SetOnlineCatalog(bool enabled);
    bool SetFeaturedFirst(bool enabled);
    bool SetConfirmBeforeDownload(bool enabled);
    bool SetMaxDownloadMegabytes(unsigned int value);
    bool Load(SettingsStore& store, std::string* error = 0);
    bool Save(SettingsStore& store, std::string* error = 0) const;

private:
    AppSettings settings_;
};

} // namespace hades
