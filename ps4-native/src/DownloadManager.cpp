#include "DownloadManager.h"

namespace hades {

namespace {
bool IsHexDigest(const std::string& value) {
    if (value.size() != 64) return false;
    for (std::size_t i = 0; i < value.size(); ++i) {
        const char c = value[i];
        const bool digit = c >= '0' && c <= '9';
        const bool lower = c >= 'a' && c <= 'f';
        const bool upper = c >= 'A' && c <= 'F';
        if (!digit && !lower && !upper) return false;
    }
    return true;
}
}

DownloadManager::DownloadManager(unsigned long long maxPackageBytes)
    : maxPackageBytes_(maxPackageBytes), state_(DownloadState::Idle) {}

bool DownloadManager::ValidateRequest(const DownloadRequest& request,
                                      std::string* error) const {
    if (request.itemId.empty() || request.itemId.size() > 64) {
        if (error) *error = "Identificador do item invalido";
        return false;
    }
    if (request.url.compare(0, 8, "https://") != 0) {
        if (error) *error = "A origem do pacote precisa usar HTTPS";
        return false;
    }
    if (!IsHexDigest(request.expectedSha256)) {
        if (error) *error = "SHA-256 esperado precisa ter 64 caracteres hexadecimais";
        return false;
    }
    if (request.expectedSize == 0 || request.expectedSize > maxPackageBytes_) {
        if (error) *error = "Tamanho declarado ausente ou acima do limite";
        return false;
    }
    return true;
}

bool DownloadManager::Queue(const DownloadRequest& request, std::string* error) {
    if (state_ == DownloadState::Queued ||
        state_ == DownloadState::Connecting ||
        state_ == DownloadState::Receiving ||
        state_ == DownloadState::Verifying) {
        if (error) *error = "Ja existe um download em andamento";
        return false;
    }
    if (!ValidateRequest(request, error)) return false;
    pending_ = request;
    verifiedPath_.clear();
    lastError_.clear();
    state_ = DownloadState::Queued;
    return true;
}

bool DownloadManager::ProcessNext(DownloadTransport& transport,
                                  IntegrityVerifier& verifier,
                                  std::string* error) {
    if (state_ != DownloadState::Queued) {
        if (error) *error = "Nao ha download aguardando processamento";
        return false;
    }

    state_ = DownloadState::Connecting;
    std::string temporaryPath;
    std::string transportError;
    state_ = DownloadState::Receiving;

    if (!transport.FetchToTemporaryFile(pending_.url, maxPackageBytes_,
                                        temporaryPath, transportError)) {
        Fail(transportError.empty() ? "Falha ao receber o pacote" : transportError);
        if (error) *error = lastError_;
        return false;
    }

    if (temporaryPath.empty()) {
        Fail("Transporte nao informou arquivo temporario");
        if (error) *error = lastError_;
        return false;
    }

    state_ = DownloadState::Verifying;
    if (!verifier.VerifySha256(temporaryPath, pending_.expectedSha256)) {
        transport.RemoveTemporaryFile(temporaryPath);
        Fail("SHA-256 do arquivo recebido nao confere");
        if (error) *error = lastError_;
        return false;
    }

    // Only verified temporary files are exposed as ready. Installation is
    // intentionally outside this manager and requires a separate user action.
    verifiedPath_ = temporaryPath;
    state_ = DownloadState::Ready;
    return true;
}

void DownloadManager::CancelPending() {
    if (state_ == DownloadState::Queued) {
        state_ = DownloadState::Cancelled;
        pending_ = DownloadRequest();
    }
}

void DownloadManager::Fail(const std::string& reason) {
    lastError_ = reason;
    state_ = DownloadState::Failed;
}

DownloadState DownloadManager::State() const { return state_; }
const std::string& DownloadManager::LastError() const { return lastError_; }
const std::string& DownloadManager::VerifiedTemporaryPath() const { return verifiedPath_; }
const std::string& DownloadManager::ActiveItemId() const { return pending_.itemId; }

} // namespace hades
