#pragma once

#include <string>

namespace hades {

enum class DownloadState {
    Idle,
    Queued,
    Connecting,
    Receiving,
    Verifying,
    Ready,
    Failed,
    Cancelled
};

struct DownloadRequest {
    std::string itemId;
    std::string url;
    std::string expectedSha256;
    unsigned long long expectedSize;
};

class DownloadTransport {
public:
    virtual ~DownloadTransport() {}
    // Implementations must stream to a temporary file and enforce maxBytes.
    virtual bool FetchToTemporaryFile(const std::string& httpsUrl,
                                      unsigned long long maxBytes,
                                      std::string& temporaryPath,
                                      std::string& error) = 0;
    virtual void RemoveTemporaryFile(const std::string& path) = 0;
};

class IntegrityVerifier {
public:
    virtual ~IntegrityVerifier() {}
    // Must calculate the digest from the actual downloaded bytes.
    virtual bool VerifySha256(const std::string& path,
                              const std::string& expectedHex) = 0;
};

class DownloadManager {
public:
    explicit DownloadManager(unsigned long long maxPackageBytes = 4ULL * 1024ULL * 1024ULL * 1024ULL);

    bool Queue(const DownloadRequest& request, std::string* error = 0);
    bool ProcessNext(DownloadTransport& transport,
                    IntegrityVerifier& verifier,
                    std::string* error = 0);
    void CancelPending();

    DownloadState State() const;
    const std::string& LastError() const;
    const std::string& VerifiedTemporaryPath() const;
    const std::string& ActiveItemId() const;

private:
    bool ValidateRequest(const DownloadRequest& request, std::string* error) const;
    void Fail(const std::string& reason);

    unsigned long long maxPackageBytes_;
    DownloadRequest pending_;
    DownloadState state_;
    std::string lastError_;
    std::string verifiedPath_;
};

} // namespace hades
