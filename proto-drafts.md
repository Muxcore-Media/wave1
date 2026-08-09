**17 packages** are imported from `core/proto/gen/muxcore/*/v1` by real (non-nested) modules but are absent from core today. Local copy-ready protos exist only for **configwatcher (admin half)** and, separately, **inputvalidate** (not a core import on the real module). Everything else must be reverse-engineered from Go usage.

Convention used in drafts (matches `storage.proto`): `package muxcore.<name>.v1;` and `option go_package = "github.com/Muxcore-Media/core/proto/gen/muxcore/<name>/v1;<name>v1";`.

---

## Priority CI blockers

### 1. `cache/v1`
**Consumers:** `cache-local` (`CacheLayerService`), `cache-redis` (`CacheService`) — **two services in one package**  
**Local proto/gen:** none

**Inferred API**
- **CacheLayerService:** `Get`, `Set`, `Invalidate`
- **CacheService:** `Get`, `Set`, `Delete`, `Exists`, `Incr`, `CompareAndSwap`, `Lock`, `Unlock`, `Publish`, `Subscribe` (server-stream)

```protobuf
syntax = "proto3";
package muxcore.cache.v1;
option go_package = "github.com/Muxcore-Media/core/proto/gen/muxcore/cache/v1;cachev1";

service CacheLayerService {
  rpc Get(GetCacheLayerRequest) returns (GetCacheLayerResponse);
  rpc Set(SetCacheLayerRequest) returns (SetCacheLayerResponse);
  rpc Invalidate(InvalidateCacheLayerRequest) returns (InvalidateCacheLayerResponse);
}

message GetCacheLayerRequest { string key = 1; }
message GetCacheLayerResponse { bytes value = 1; bool found = 2; }
message SetCacheLayerRequest { string key = 1; bytes value = 2; }
message SetCacheLayerResponse { string status = 1; }
message InvalidateCacheLayerRequest { string prefix = 1; }
message InvalidateCacheLayerResponse { string status = 1; }

service CacheService {
  rpc Get(GetCacheRequest) returns (GetCacheResponse);
  rpc Set(SetCacheRequest) returns (SetCacheResponse);
  rpc Delete(DeleteCacheRequest) returns (DeleteCacheResponse);
  rpc Exists(ExistsCacheRequest) returns (ExistsCacheResponse);
  rpc Incr(IncrCacheRequest) returns (IncrCacheResponse);
  rpc CompareAndSwap(CompareAndSwapCacheRequest) returns (CompareAndSwapCacheResponse);
  rpc Lock(LockCacheRequest) returns (LockCacheResponse);
  rpc Unlock(UnlockCacheRequest) returns (UnlockCacheResponse);
  rpc Publish(PublishCacheRequest) returns (PublishCacheResponse);
  rpc Subscribe(SubscribeCacheRequest) returns (stream SubscribeCacheResponse);
}

message GetCacheRequest { string key = 1; }
message GetCacheResponse { string key = 1; bytes value = 2; bool found = 3; }
message SetCacheRequest { string key = 1; bytes value = 2; int64 ttl_seconds = 3; }
message SetCacheResponse { string status = 1; }
message DeleteCacheRequest { repeated string keys = 1; }
message DeleteCacheResponse { int32 deleted = 1; }
message ExistsCacheRequest { string key = 1; }
message ExistsCacheResponse { bool exists = 1; }
message IncrCacheRequest { string key = 1; int64 delta = 2; }
message IncrCacheResponse { int64 value = 1; }
message CompareAndSwapCacheRequest { string key = 1; bytes old_value = 2; bytes new_value = 3; }
message CompareAndSwapCacheResponse { bool swapped = 1; }
message LockCacheRequest { string key = 1; int64 ttl_seconds = 2; }
message LockCacheResponse { string key = 1; string token = 2; bool acquired = 3; }
message UnlockCacheRequest { string token = 1; }
message UnlockCacheResponse { string status = 1; }
message PublishCacheRequest { string channel = 1; bytes message = 2; }
message PublishCacheResponse {}
message SubscribeCacheRequest { string channel = 1; }
message SubscribeCacheResponse { string channel = 1; bytes message = 2; }
```

---

### 2. `serialization/v1`
**Consumers:** `serialization-safe`  
**Local:** none

```protobuf
syntax = "proto3";
package muxcore.serialization.v1;
option go_package = "github.com/Muxcore-Media/core/proto/gen/muxcore/serialization/v1;serializationv1";

service SerializationService {
  rpc Convert(ConvertRequest) returns (ConvertResponse);
  rpc SupportedTypes(SupportedTypesRequest) returns (SupportedTypesResponse);
}

message ConvertRequest {
  string source_content_type = 1;
  string target_content_type = 2;
  bytes data = 3;
}
message ConvertResponse { bytes result = 1; }
message SupportedTypesRequest {}
message SupportedTypesResponse { repeated string content_types = 1; }
```

---

### 3. `database/v1`
**Consumers:** `database-sqlite` (`database-postgres` empty)  
**Local:** none

```protobuf
syntax = "proto3";
package muxcore.database.v1;
option go_package = "github.com/Muxcore-Media/core/proto/gen/muxcore/database/v1;databasev1";

service DatabaseService {
  rpc Exec(ExecRequest) returns (ExecResponse);
  rpc Query(QueryRequest) returns (QueryResponse);
  rpc Transaction(TransactionRequest) returns (TransactionResponse);
  rpc Migrate(MigrateRequest) returns (MigrateResponse);
  rpc Rollback(RollbackRequest) returns (RollbackResponse);
}

message Value {
  oneof kind {
    string string_val = 1;
    int64 int_val = 2;
    double float_val = 3;
    bool bool_val = 4;
    bytes bytes_val = 5;
    bool null_val = 6;
  }
}

message ExecRequest { string query = 1; repeated Value args = 2; }
message ExecResponse { int64 rows_affected = 1; }

message QueryRequest { string query = 1; repeated Value args = 2; }
message Row { repeated Value values = 1; }
message QueryResponse {
  repeated string columns = 1;
  repeated Row rows = 2;
  int32 count = 3;
}

message Statement { string query = 1; repeated Value args = 2; }
message TransactionRequest { repeated Statement statements = 1; }
message TransactionResponse { string status = 1; }

message Migration {
  int32 version = 1;
  string name = 2;
  string up_sql = 3;
  string down_sql = 4;
}
message MigrateRequest { repeated Migration migrations = 1; }
message MigrateResponse { string status = 1; }
message RollbackRequest { int32 target_version = 1; }
message RollbackResponse { string status = 1; }
```

---

### 4. `healthmonitor/v1`
**Consumers:** `health-monitor`  
**Local:** none  
**Messages:** `ModuleHealth{module_id, state, error}`; RPCs `ReportHealth`, `PublishEvent`

```protobuf
syntax = "proto3";
package muxcore.healthmonitor.v1;
option go_package = "github.com/Muxcore-Media/core/proto/gen/muxcore/healthmonitor/v1;healthmonitorv1";

service HealthMonitorService {
  rpc ReportHealth(ReportHealthRequest) returns (ReportHealthResponse);
  rpc PublishEvent(PublishEventRequest) returns (PublishEventResponse);
}

message ModuleHealth {
  string module_id = 1;
  string state = 2;   // e.g. "running", "degraded"
  string error = 3;
}
message ReportHealthRequest { repeated ModuleHealth modules = 1; }
message ReportHealthResponse { string status = 1; }
message PublishEventRequest {
  string event_type = 1;
  string module_id = 2;
  string message = 3;
}
message PublishEventResponse { string status = 1; }
```

---

### 5. `tracing/v1`
**Consumers:** `tracing-otlp`  
**Local:** none

```protobuf
syntax = "proto3";
package muxcore.tracing.v1;
option go_package = "github.com/Muxcore-Media/core/proto/gen/muxcore/tracing/v1;tracingv1";

service TracingService {
  rpc StartSpan(StartSpanRequest) returns (StartSpanResponse);
  rpc SetAttribute(SetAttributeRequest) returns (SetAttributeResponse);
  rpc SetStatus(SetStatusRequest) returns (SetStatusResponse);
  rpc EndSpan(EndSpanRequest) returns (EndSpanResponse);
}

message StartSpanRequest {
  string name = 1;
  map<string, string> attributes = 2;
}
message StartSpanResponse { string span_id = 1; string trace_id = 2; }
message SetAttributeRequest { string span_id = 1; string key = 2; string value = 3; }
message SetAttributeResponse {}
message SetStatusRequest { string span_id = 1; int32 code = 2; string description = 3; }
message SetStatusResponse {}
message EndSpanRequest { string span_id = 1; }
message EndSpanResponse {}
```

---

### 6. `logging/v1`
**Consumers:** `logging-file`  
**Local:** none  
**Service name:** `LogService` (not LoggingService). Enum: `LEVEL_UNSPECIFIED/DEBUG/INFO/WARN/ERROR`.

```protobuf
syntax = "proto3";
package muxcore.logging.v1;
option go_package = "github.com/Muxcore-Media/core/proto/gen/muxcore/logging/v1;loggingv1";

enum Level {
  LEVEL_UNSPECIFIED = 0;
  LEVEL_DEBUG = 1;
  LEVEL_INFO = 2;
  LEVEL_WARN = 3;
  LEVEL_ERROR = 4;
}

service LogService {
  rpc Log(LogRequest) returns (LogResponse);
  rpc SetLevel(SetLevelRequest) returns (SetLevelResponse);
}

message LogRequest {
  Level level = 1;
  string message = 2;
  map<string, string> fields = 3;
  string source_module = 4;
}
message LogResponse {}
message SetLevelRequest { Level level = 1; }
message SetLevelResponse { Level previous_level = 1; }
```

---

### 7. `secrets/v1`
**Consumers:** `secrets-file`, `secrets-vault`  
**Local:** none — **values are `string`**, not bytes

```protobuf
syntax = "proto3";
package muxcore.secrets.v1;
option go_package = "github.com/Muxcore-Media/core/proto/gen/muxcore/secrets/v1;secretsv1";

service SecretsService {
  rpc Get(GetRequest) returns (GetResponse);
  rpc Set(SetRequest) returns (SetResponse);
  rpc Delete(DeleteRequest) returns (DeleteResponse);
  rpc List(ListRequest) returns (ListResponse);
}

message GetRequest { string key = 1; }
message GetResponse { string key = 1; string value = 2; }
message SetRequest { string key = 1; string value = 2; }
message SetResponse { string status = 1; }
message DeleteRequest { string key = 1; }
message DeleteResponse { string status = 1; }
message ListRequest {}
message ListResponse { repeated string keys = 1; int32 count = 2; }
```

---

### 8. `distributedlock/v1`
**Consumers:** `distributed-lock-sqlite`  
**Local:** none

```protobuf
syntax = "proto3";
package muxcore.distributedlock.v1;
option go_package = "github.com/Muxcore-Media/core/proto/gen/muxcore/distributedlock/v1;distributedlockv1";

service DistributedLockService {
  rpc Acquire(AcquireRequest) returns (AcquireResponse);
  rpc Unlock(UnlockRequest) returns (UnlockResponse);
  rpc Renew(RenewRequest) returns (RenewResponse);
}

message AcquireRequest { string key = 1; string holder_id = 2; int64 ttl_ms = 3; }
message AcquireResponse { bool acquired = 1; string lock_token = 2; string error = 3; }
message UnlockRequest { string key = 1; string lock_token = 2; }
message UnlockResponse { bool released = 1; }
message RenewRequest { string key = 1; string lock_token = 2; int64 ttl_ms = 3; }
message RenewResponse { bool renewed = 1; }
```

---

### 9. `circuitbreaker/v1`
**Consumers:** `circuitbreaker-simple`  
**Local:** none

```protobuf
syntax = "proto3";
package muxcore.circuitbreaker.v1;
option go_package = "github.com/Muxcore-Media/core/proto/gen/muxcore/circuitbreaker/v1;circuitbreakerv1";

enum CircuitState {
  CIRCUIT_STATE_UNSPECIFIED = 0;
  CIRCUIT_STATE_CLOSED = 1;
  CIRCUIT_STATE_OPEN = 2;
  CIRCUIT_STATE_HALF_OPEN = 3;
}

service CircuitBreakerService {
  rpc State(StateRequest) returns (StateResponse);
  rpc RecordSuccess(RecordSuccessRequest) returns (RecordSuccessResponse);
  rpc RecordFailure(RecordFailureRequest) returns (RecordFailureResponse);
  rpc Reset(ResetRequest) returns (ResetResponse);
}

message StateRequest { string key = 1; }
message StateResponse {
  CircuitState state = 1;
  uint32 failure_count = 2;
  int64 opened_at_unix_nano = 3;
  int64 half_open_after_unix_nano = 4;
}
message RecordSuccessRequest { string key = 1; }
message RecordSuccessResponse { CircuitState new_state = 1; }
message RecordFailureRequest { string key = 1; }
message RecordFailureResponse { CircuitState new_state = 1; bool circuit_just_opened = 2; }
message ResetRequest { string key = 1; }
message ResetResponse { CircuitState previous_state = 1; }
```

---

### 10. `dataredaction/v1`
**Consumers:** `data-redaction-pattern`  
**Local:** none

```protobuf
syntax = "proto3";
package muxcore.dataredaction.v1;
option go_package = "github.com/Muxcore-Media/core/proto/gen/muxcore/dataredaction/v1;dataredactionv1";

service DataRedactionService {
  rpc Redact(RedactRequest) returns (RedactResponse);
  rpc SupportedRules(SupportedRulesRequest) returns (SupportedRulesResponse);
}

message RedactRequest { bytes data = 1; repeated string rules = 2; }
message RedactResponse { bytes data = 1; }
message SupportedRulesRequest {}
message SupportedRulesResponse { repeated string rule_types = 1; }
```

---

### 11. `spoolresolver/v1`
**Consumers:** `spool-resolver-http`  
**Local:** none

```protobuf
syntax = "proto3";
package muxcore.spoolresolver.v1;
option go_package = "github.com/Muxcore-Media/core/proto/gen/muxcore/spoolresolver/v1;spoolresolverv1";

service SpoolResolverService {
  rpc ResolveTag(ResolveTagRequest) returns (ResolveTagResponse);
}

message ResolveTagRequest { string spool_url = 1; string tag_name = 2; }
message ResolveTagResponse {
  bytes tag_definition_json = 1;
  string error = 2;
}
```

---

### 12. `workflow/v1`
**Consumers:** `workflow-tapestry` (server), `request-media` (client `Run`)  
**Local:** none — JSON seed defs use snake_case that matches proto JSON mapping

```protobuf
syntax = "proto3";
package muxcore.workflow.v1;
option go_package = "github.com/Muxcore-Media/core/proto/gen/muxcore/workflow/v1;workflowv1";

service WorkflowService {
  rpc RegisterDefinition(RegisterDefinitionRequest) returns (RegisterDefinitionResponse);
  rpc RemoveDefinition(RemoveDefinitionRequest) returns (RemoveDefinitionResponse);
  rpc GetDefinition(GetDefinitionRequest) returns (GetDefinitionResponse);
  rpc ListDefinitions(ListDefinitionsRequest) returns (ListDefinitionsResponse);
  rpc Run(RunRequest) returns (RunResponse);
  rpc Status(StatusRequest) returns (StatusResponse);
  rpc Cancel(CancelRequest) returns (CancelResponse);
  rpc Pause(PauseRequest) returns (PauseResponse);
  rpc Resume(ResumeRequest) returns (ResumeResponse);
  rpc ListRuns(ListRunsRequest) returns (ListRunsResponse);
}

message StepHandler { string kind = 1; string ref = 2; }

message TapestryStep {
  string name = 1;
  StepHandler handler = 2;
  repeated string depends_on = 3;
  int32 retry = 4;
  int64 timeout_seconds = 5;
  map<string, string> input_mapping = 6;
  map<string, string> meta = 7;
}

message TapestryDefinition {
  string id = 1;
  string name = 2;
  string description = 3;
  string version = 4;
  repeated TapestryStep steps = 5;
}

message StepResult {
  string step_name = 1;
  string status = 2;
  string error = 3;
  int32 attempt = 4;
  int32 max_retries = 5;
  int64 started_at_unix = 6;
  int64 ended_at_unix = 7;
  map<string, string> output = 8;
}

message TapestryRun {
  string id = 1;
  string definition_id = 2;
  string status = 3;
  map<string, string> input = 4;
  int64 started_at_unix = 5;
  int64 ended_at_unix = 6;
  string current_step = 7;
  string error = 8;
  repeated StepResult step_results = 9;
}

message RegisterDefinitionRequest { TapestryDefinition definition = 1; }
message RegisterDefinitionResponse { string status = 1; }
message RemoveDefinitionRequest { string definition_id = 1; }
message RemoveDefinitionResponse { string status = 1; }
message GetDefinitionRequest { string definition_id = 1; }
message GetDefinitionResponse { TapestryDefinition definition = 1; }
message ListDefinitionsRequest {}
message ListDefinitionsResponse { repeated TapestryDefinition definitions = 1; }
message RunRequest { string definition_id = 1; map<string, string> input = 2; }
message RunResponse { string run_id = 1; string status = 2; }
message StatusRequest { string run_id = 1; }
message StatusResponse { TapestryRun run = 1; }
message CancelRequest { string run_id = 1; }
message CancelResponse { string status = 1; }
message PauseRequest { string run_id = 1; }
message PauseResponse { string status = 1; }
message ResumeRequest { string run_id = 1; }
message ResumeResponse { string status = 1; }
message ListRunsRequest {
  string status_filter = 1;
  string definition_id_filter = 2;
}
message ListRunsResponse { repeated TapestryRun runs = 1; }
```

---

## Additional missing packages (also red CI)

### 13. `encryption/v1` — `encryption-aesgcm` — no local
`Encrypt`/`Decrypt`/`RotateKey`/`Available`; plaintext/ciphertext are `bytes`.

### 14. `featureflags/v1` — `feature-flags-file` — no local
`IsEnabled(flag, default_value)` → `enabled`; `GetVariant(flag, default_value)` → `variant`.

### 15. `metrics/v1` — `metrics-prometheus` — no local
`RegisterCounter|Gauge|Histogram`, `IncrementCounter` (`delta` double), `SetGauge`, `ObserveHistogram`; `LabelPair{name,value}`; histogram `buckets` repeated double.

### 16. `ratelimit/v1` — `ratelimit-tokenbucket` — no local
`Allow(key)` → `allowed`; `Enabled()` → `enabled`.

### 17. `configwatcher/v1` — `config-watcher`
**Partial local copy:** `config-watcher/proto/muxcore/configwatcher/v1/admin.proto` is **admin-only** (`ConfigWatcherAdminService.ReportModuleChange`), generated into `internal/adminv1`, **not** the core path.  
**Still missing in core:** streaming `ConfigWatcherService.WatchChanges`:

```protobuf
syntax = "proto3";
package muxcore.configwatcher.v1;
option go_package = "github.com/Muxcore-Media/core/proto/gen/muxcore/configwatcher/v1;configwatcherv1";

service ConfigWatcherService {
  rpc WatchChanges(WatchChangesRequest) returns (stream WatchChangesResponse);
}

message WatchChangesRequest { string capability = 1; }  // empty = all
message WatchChangesResponse {
  string event_type = 1;
  string module_id = 2;
  string capability = 3;
}
```

Optional drafts for the extras:

```protobuf
// encryption/v1
service EncryptionService {
  rpc Encrypt(EncryptRequest) returns (EncryptResponse);
  rpc Decrypt(DecryptRequest) returns (DecryptResponse);
  rpc RotateKey(RotateKeyRequest) returns (RotateKeyResponse);
  rpc Available(AvailableRequest) returns (AvailableResponse);
}
message EncryptRequest { bytes plaintext = 1; }
message EncryptResponse { bytes ciphertext = 1; }
message DecryptRequest { bytes ciphertext = 1; }
message DecryptResponse { bytes plaintext = 1; }
message RotateKeyRequest {}
message RotateKeyResponse {}
message AvailableRequest {}
message AvailableResponse { bool available = 1; }
```

```protobuf
// featureflags/v1
service FeatureFlagsService {
  rpc IsEnabled(IsEnabledRequest) returns (IsEnabledResponse);
  rpc GetVariant(GetVariantRequest) returns (GetVariantResponse);
}
message IsEnabledRequest { string flag = 1; bool default_value = 2; }
message IsEnabledResponse { bool enabled = 1; }
message GetVariantRequest { string flag = 1; string default_value = 2; }
message GetVariantResponse { string variant = 1; }
```

```protobuf
// metrics/v1
message LabelPair { string name = 1; string value = 2; }
service MetricsService {
  rpc RegisterCounter(RegisterCounterRequest) returns (RegisterCounterResponse);
  rpc RegisterGauge(RegisterGaugeRequest) returns (RegisterGaugeResponse);
  rpc RegisterHistogram(RegisterHistogramRequest) returns (RegisterHistogramResponse);
  rpc IncrementCounter(IncrementCounterRequest) returns (IncrementCounterResponse);
  rpc SetGauge(SetGaugeRequest) returns (SetGaugeResponse);
  rpc ObserveHistogram(ObserveHistogramRequest) returns (ObserveHistogramResponse);
}
message RegisterCounterRequest { string name = 1; string help = 2; repeated LabelPair labels = 3; }
message RegisterCounterResponse { string status = 1; }
message RegisterGaugeRequest { string name = 1; string help = 2; repeated LabelPair labels = 3; }
message RegisterGaugeResponse { string status = 1; }
message RegisterHistogramRequest {
  string name = 1; string help = 2; repeated LabelPair labels = 3; repeated double buckets = 4;
}
message RegisterHistogramResponse { string status = 1; }
message IncrementCounterRequest { string name = 1; repeated LabelPair labels = 2; double delta = 3; }
message IncrementCounterResponse { string status = 1; }
message SetGaugeRequest { string name = 1; repeated LabelPair labels = 2; double value = 3; }
message SetGaugeResponse { string status = 1; }
message ObserveHistogramRequest { string name = 1; repeated LabelPair labels = 2; double value = 3; }
message ObserveHistogramResponse { string status = 1; }
```

```protobuf
// ratelimit/v1
service RateLimitService {
  rpc Allow(AllowRequest) returns (AllowResponse);
  rpc Enabled(EnabledRequest) returns (EnabledResponse);
}
message AllowRequest { string key = 1; }
message AllowResponse { bool allowed = 1; }
message EnabledRequest {}
message EnabledResponse { bool enabled = 1; }
```

---

## Local protos that are NOT core CI imports

| Package | Local tree | Notes |
|---------|------------|--------|
| **inputvalidate** | `input-validate-jsonschema/proto/...` + `muxcore/inputvalidate/v1/*.pb.go` | Real module imports **local** path. Nested dumps under archived trees import core path — copy into core only if you want to unify. |
| **backup** | `backup-local/proto/...` | Module-local go_package; not imported from core gen. |
| **executor** | `executor-shell/proto/...` | Same. |
| **configwatcher admin** | `config-watcher/proto/.../admin.proto` | Stays module-local; WatchChanges still needs core. |

---

## Summary for core#26

| Package | Local to copy? | Blocking modules |
|---------|----------------|------------------|
| cache | No (2 services) | cache-local, cache-redis |
| serialization | No | serialization-safe |
| database | No | database-sqlite |
| healthmonitor | No | health-monitor |
| tracing | No | tracing-otlp |
| logging | No (`LogService`) | logging-file |
| secrets | No (`string` values) | secrets-file, secrets-vault |
| distributedlock | No | distributed-lock-sqlite |
| circuitbreaker | No | circuitbreaker-simple |
| dataredaction | No | data-redaction-pattern |
| spoolresolver | No | spool-resolver-http |
| workflow | No | workflow-tapestry, request-media |
| encryption | No | encryption-aesgcm |
| featureflags | No | feature-flags-file |
| metrics | No | metrics-prometheus |
| ratelimit | No | ratelimit-tokenbucket |
| configwatcher | Admin only local | config-watcher (need WatchChanges in core) |

Field numbers in drafts are inferred for compile compatibility with current Go accessors; regenerate Go stubs into `core/proto/gen/muxcore/<pkg>/v1/` after adding the `.proto` sources under `core/proto/muxcore/<pkg>/v1/`.