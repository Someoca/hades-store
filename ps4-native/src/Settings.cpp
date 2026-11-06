#include "Settings.h"

namespace hades {

SettingsManager::SettingsManager() {}

const AppSettings& SettingsManager::Get() const { return settings_; }

bool SettingsManager::SetOnlineCatalog(bool enabled) {
    settings_.enableOnlineCatalog = enabled;
    return true;
}

bool SettingsManager::SetFeaturedFirst(bool enabled) {
    settings_.showFeaturedFirst = enabled;
    return true;
}

bool SettingsManager::SetConfirmBeforeDownload(bool enabled) {
    settings_.confirmBeforeDownload = enabled;
    return true;
}

bool SettingsManager::SetMaxDownloadMegabytes(unsigned int value) {
    if (value < 1 || value > 4096) return false;
    settings_.maxDownloadMegabytes = value;
    return true;
}

bool SettingsManager::Load(SettingsStore& store, std::string* error) {
    AppSettings candidate;
    std::string localError;
    if (!store.Load(candidate, localError)) {
        if (error) *error = localError;
        return false;
    }
    if (candidate.maxDownloadMegabytes < 1 ||
        candidate.maxDownloadMegabytes > 4096) {
        if (error) *error = "Limite de download salvo esta fora da faixa permitida";
        return false;
    }
    settings_ = candidate;
    return true;
}

bool SettingsManager::Save(SettingsStore& store, std::string* error) const {
    std::string localError;
    if (!store.Save(settings_, localError)) {
        if (error) *error = localError;
        return false;
    }
    return true;
}

} // namespace hades
