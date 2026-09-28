# Module 12: Production Cloud Storage SPI & Scalability

[← Back to Master Documentation Hub](../INDEX.md)

---

## 1. Overview & Concept

In **Phase 12: Production Cloud Storage SPI & Scalability**, AgroLoop transitions from basic local file uploads to a pluggable, enterprise-grade storage architecture. The system introduces an abstract Cloud Storage Service Provider Interface (SPI) capable of seamlessly delegating object uploads, presigned URLs, and retrievals across:

1. **Local Filesystem Storage:** Zero-dependency development and integration testing mode with path-traversal sanitization.
2. **AWS S3 Cloud Storage:** High-scale Amazon Simple Storage Service integration for production deployments.
3. **MinIO Self-Hosted Object Storage:** S3-compatible private cloud storage for on-premise or sovereign deployments.

Rather than bloating the application with heavy third-party AWS SDKs, AgroLoop implements an ultra-lightweight, high-performance REST client powered natively by **Java 21 `HttpClient`** with native AWS Signature Version 4 (SigV4) HMAC-SHA256 authorization.

```text
    Client Request (Multipart Upload / Download Request)
                             │
                             ▼
                      StorageManager (Facade)
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
     StorageProvider: LOCAL    StorageProvider: S3    StorageProvider: MINIO
            │                │                │
            ▼                ▼                ▼
     LocalFileStorage    S3MinioStorageServiceImpl
     (Disk Directory)   (Native Java 21 SigV4 HTTP)
```

---

## 2. Core Invariants & Architectural Guarantees

$$\text{Cloud Storage Invariant} \iff \begin{cases}
\text{Provider Switching: Dynamic configuration via } \texttt{agroloop.storage.provider} = \{\texttt{LOCAL}, \texttt{S3}, \texttt{MINIO}\} \\
\text{SDK Independence: Direct HTTP/2 SigV4 client eliminates 40+ transitive AWS JARs} \\
\text{Path Traversal Defense: Object keys sanitized using alphanumeric UUID slugs} \\
\text{Presigned Upload TTL: Temporary upload authorization strictly bounded by configurable expiry (default 15m)} \\
\text{Diagnostics Transparency: Real-time latency, bucket health, and connectivity exposed to Admin Console}
\end{cases}$$

### 1. Storage Provider Abstraction (`StorageProvider`)

The [`StorageManager`](../../src/main/java/com/agroloop/service/storage/StorageManager.java) inspects [`StorageProperties`](../../src/main/java/com/agroloop/service/storage/StorageProperties.java) to route operations to the active implementation:

* **[`CloudStorageService`](../../src/main/java/com/agroloop/service/storage/CloudStorageService.java):** Root interface defining:
  * `store(InputStream inputStream, String objectKey, String contentType, long contentLength)`
  * `loadAsResource(String objectKey)`
  * `generatePresignedUploadUrl(String objectKey, Duration duration)`
  * `delete(String objectKey)`
  * `checkHealth()`

### 2. Native Java 21 AWS SigV4 REST Client

The [`S3MinioStorageServiceImpl`](../../src/main/java/com/agroloop/service/storage/S3MinioStorageServiceImpl.java) computes AWS Signature Version 4 HMAC-SHA256 headers directly:

1. **Canonical Request Construction:** Normalizes HTTP method, URI, query parameters, canonical headers, and payload SHA-256 hash.
2. **String to Sign:** Constructs the timestamped signing string:
   $$\text{StringToSign} = \text{"AWS4-HMAC-SHA256"} + \text{"\n"} + \text{Timestamp} + \text{"\n"} + \text{Scope} + \text{"\n"} + \text{Hex}(\text{SHA256}(\text{CanonicalRequest}))$$
3. **Derived Signing Key:** Computes hierarchical HMAC keys:
   $$K_{\text{date}} \to K_{\text{region}} \to K_{\text{service}} \to K_{\text{signing}}$$
4. **Direct Execution:** Uses standard `java.net.http.HttpClient` with non-blocking I/O.

---

## 3. Configuration & Environment Variables

```properties
# Storage Configuration (application.properties / .env)
agroloop.storage.provider=LOCAL                # LOCAL, S3, or MINIO
agroloop.storage.local.base-dir=uploads/
agroloop.storage.s3.bucket=agroloop-assets
agroloop.storage.s3.region=us-east-1
agroloop.storage.s3.access-key=YOUR_ACCESS_KEY
agroloop.storage.s3.secret-key=YOUR_SECRET_KEY
agroloop.storage.s3.endpoint=                   # Required for MinIO (e.g. http://localhost:9000)
```

---

## 4. Key Classes & Methods Catalog

| Class / Interface | Responsibility | Key Methods |
| :--- | :--- | :--- |
| [`CloudStorageService`](../../src/main/java/com/agroloop/service/storage/CloudStorageService.java) | Core interface for cloud and local storage | `store()`, `loadAsResource()`, `generatePresignedUploadUrl()`, `delete()` |
| [`StorageProvider`](../../src/main/java/com/agroloop/service/storage/StorageProvider.java) | Enum designating storage backend | `LOCAL`, `S3`, `MINIO` |
| [`StorageManager`](../../src/main/java/com/agroloop/service/storage/StorageManager.java) | Facade managing active provider and health checks | `getActiveProvider()`, `store()`, `getStorageDiagnostics()` |
| [`LocalFileStorageServiceImpl`](../../src/main/java/com/agroloop/service/storage/LocalFileStorageServiceImpl.java) | Disk filesystem implementation with path checks | `store()`, `loadAsResource()`, `sanitizeFilename()` |
| [`S3MinioStorageServiceImpl`](../../src/main/java/com/agroloop/service/storage/S3MinioStorageServiceImpl.java) | Native Java 21 SigV4 HTTP client for S3/MinIO | `computeSigV4()`, `store()`, `generatePresignedUploadUrl()` |
| [`StorageProperties`](../../src/main/java/com/agroloop/service/storage/StorageProperties.java) | Type-safe configuration binding | `getProvider()`, `getS3()`, `getLocal()` |
| [`AdminApiController`](../../src/main/java/com/agroloop/controller/api/v1/AdminApiController.java) | REST endpoint for storage diagnostics | `getStorageDiagnostics()` (`/api/v1/admin/storage/status`) |

---

## 5. Verification & Test Coverage

* **[`StorageManagerTest`](../../src/test/java/com/agroloop/service/storage/StorageManagerTest.java):** Tests provider routing, local fallback, S3 initialization, presigned URL generation, and error handling.
* **[`AdminApiControllerTest`](../../src/test/java/com/agroloop/controller/api/v1/AdminApiControllerTest.java):** Tests `/api/v1/admin/storage/status` response format, permission checks, and KPI reporting.
