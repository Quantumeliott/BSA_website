// =============================================
// QuantumGrid Oracle — oracle.cpp
// =============================================

#include "oracle.h"

#include <iostream>
#include <sstream>
#include <random>
#include <chrono>
#include <stdexcept>
#include <unordered_map>

// --- Third-party (link in CMakeLists) ---
// curl  : HTTP calls to instrument APIs
// openssl: SHA-256, BLAKE2b, Ed25519 signing
// nlohmann/json: JSON serialisation

#include <curl/curl.h>
#include <openssl/evp.h>
#include <openssl/rand.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

namespace quantumgrid {

// ---- Active sessions in memory ----
// In production replace with a persistent store (Redis, SQLite)

struct ActiveSession {
  SessionRequest  req;
  uint32_t        shots_done   = 0;
  double          seconds_used = 0.0;
  std::string     fulfillment_hex;   // secret preimage — revealed only at finalise
  std::chrono::steady_clock::time_point started_at;
};

// ---- Impl (PIMPL pattern) ----

struct Oracle::Impl {
  OracleConfig config;
  std::unordered_map<std::string, ActiveSession> sessions;
};

// ---- Helpers ----

static size_t curlWriteCallback(char* ptr, size_t size, size_t nmemb, std::string* out) {
  out->append(ptr, size * nmemb);
  return size * nmemb;
}

static std::string toHex(const unsigned char* data, size_t len) {
  std::ostringstream oss;
  oss << std::hex;
  for (size_t i = 0; i < len; ++i) {
    oss << std::setw(2) << std::setfill('0') << (int)data[i];
  }
  return oss.str();
}

static std::string randomHex(size_t bytes) {
  std::vector<unsigned char> buf(bytes);
  if (RAND_bytes(buf.data(), (int)bytes) != 1) {
    throw std::runtime_error("RAND_bytes failed");
  }
  return toHex(buf.data(), bytes);
}

// ---- Oracle ----

Oracle::Oracle(const OracleConfig& config)
  : pImpl_(std::make_unique<Impl>()) {
  pImpl_->config = config;
  curl_global_init(CURL_GLOBAL_ALL);
}

Oracle::~Oracle() {
  curl_global_cleanup();
}

// --- generateCondition ---

std::pair<std::string, std::string> Oracle::generateCondition() {
  // Generate a 32-byte random preimage (the "fulfillment")
  std::vector<unsigned char> preimage(32);
  RAND_bytes(preimage.data(), 32);

  // Condition = SHA-256(preimage) — XRPL uses PREIMAGE-SHA-256
  unsigned char hash[EVP_MAX_MD_SIZE];
  unsigned int  hash_len = 0;
  EVP_Digest(preimage.data(), preimage.size(),
             hash, &hash_len, EVP_sha256(), nullptr);

  std::string fulfillment_hex = toHex(preimage.data(), preimage.size());
  std::string condition_hex   = toHex(hash, hash_len);

  return { condition_hex, fulfillment_hex };
}

// --- verifyCondition ---

bool Oracle::verifyCondition(const std::string& condition_hex,
                              const std::string& fulfillment_hex) {
  // Decode fulfillment hex → bytes
  std::vector<unsigned char> preimage;
  for (size_t i = 0; i < fulfillment_hex.size(); i += 2) {
    preimage.push_back(std::stoul(fulfillment_hex.substr(i, 2), nullptr, 16));
  }

  // Hash it
  unsigned char hash[EVP_MAX_MD_SIZE];
  unsigned int  hash_len = 0;
  EVP_Digest(preimage.data(), preimage.size(),
             hash, &hash_len, EVP_sha256(), nullptr);

  return toHex(hash, hash_len) == condition_hex;
}

// --- startSession ---

SessionResult Oracle::startSession(const SessionRequest& req) {
  SessionResult result;
  result.session_id = req.session_id;

  try {
    auto [condition, fulfillment] = generateCondition();

    ActiveSession session;
    session.req             = req;
    session.fulfillment_hex = fulfillment;
    session.started_at      = std::chrono::steady_clock::now();

    // Notify instrument API
    json body = {
      { "session_id",      req.session_id },
      { "instrument_type", req.instrument_type },
      { "duration_sec",    req.duration_sec },
      { "shots",           req.shots },
    };
    std::string resp = callInstrumentAPI("/sessions/start", body.dump());

    pImpl_->sessions[req.session_id] = std::move(session);

    result.success        = true;
    result.delivery_proof = condition; // returned so frontend can create Escrow with this condition
    std::cout << "[Oracle] Session started: " << req.session_id << "\n";

  } catch (const std::exception& e) {
    result.success       = false;
    result.error_message = e.what();
    std::cerr << "[Oracle] startSession error: " << e.what() << "\n";
  }

  return result;
}

// --- executeShot ---

std::string Oracle::executeShot(const std::string& session_id,
                                 const std::string& circuit_qasm) {
  auto it = pImpl_->sessions.find(session_id);
  if (it == pImpl_->sessions.end()) {
    throw std::runtime_error("Unknown session: " + session_id);
  }

  ActiveSession& session = it->second;

  if (pImpl_->config.simulation_mode) {
    // --- Simulation mode: return fake bitstring results ---
    // In production: forward QASM to instrument API, get real counts back
    std::mt19937 rng(std::random_device{}());
    std::uniform_int_distribution<int> bit(0, 1);

    json counts;
    int num_qubits = 4; // TODO: parse from QASM
    for (int i = 0; i < 16; ++i) {
      std::string bitstring;
      for (int q = 0; q < num_qubits; ++q) bitstring += std::to_string(bit(rng));
      counts[bitstring] = (int)(rng() % 100 + 1);
    }

    session.shots_done++;
    json result = {
      { "session_id", session_id },
      { "shot",       session.shots_done },
      { "counts",     counts },
      { "simulator",  true },
    };
    return result.dump();
  }

  // --- Real hardware: delegate to instrument API ---
  json body = {
    { "session_id", session_id },
    { "qasm",       circuit_qasm },
  };
  std::string resp = callInstrumentAPI("/sessions/shot", body.dump());
  session.shots_done++;
  return resp;
}

// --- finaliseSession ---

SessionResult Oracle::finaliseSession(const std::string& session_id) {
  SessionResult result;
  result.session_id = session_id;

  auto it = pImpl_->sessions.find(session_id);
  if (it == pImpl_->sessions.end()) {
    result.success       = false;
    result.error_message = "Unknown session: " + session_id;
    return result;
  }

  ActiveSession& session = it->second;
  auto elapsed = std::chrono::steady_clock::now() - session.started_at;
  session.seconds_used = std::chrono::duration<double>(elapsed).count();

  // Build signed receipt
  json receipt = {
    { "session_id",    session_id },
    { "shots_done",    session.shots_done },
    { "seconds_used",  session.seconds_used },
    { "timestamp",     std::chrono::system_clock::now().time_since_epoch().count() },
  };
  std::string receipt_str   = receipt.dump();
  std::string signed_receipt = signPayload(receipt_str);

  result.success        = true;
  result.delivery_proof = session.fulfillment_hex; // preimage → EscrowFinish
  result.signed_receipt = signed_receipt;
  result.actual_shots   = session.shots_done;
  result.actual_seconds = session.seconds_used;

  // Clean up
  pImpl_->sessions.erase(it);

  std::cout << "[Oracle] Session finalised: " << session_id
            << " | shots=" << result.actual_shots
            << " | sec="   << result.actual_seconds << "\n";
  return result;
}

// --- Private: signPayload ---

std::string Oracle::signPayload(const std::string& payload) const {
  // Ed25519 signing with oracle private key
  // TODO: load EVP_PKEY from pImpl_->config.oracle_private_key
  // Placeholder: return SHA-256 HMAC of payload for now
  unsigned char hash[EVP_MAX_MD_SIZE];
  unsigned int  hash_len = 0;
  EVP_Digest(payload.data(), payload.size(),
             hash, &hash_len, EVP_sha256(), nullptr);
  return toHex(hash, hash_len);
}

// --- Private: callInstrumentAPI ---

std::string Oracle::callInstrumentAPI(const std::string& endpoint,
                                       const std::string& body) const {
  if (pImpl_->config.simulation_mode) {
    // Skip real HTTP call in simulation mode
    return R"({"status":"ok","simulated":true})";
  }

  CURL* curl = curl_easy_init();
  if (!curl) throw std::runtime_error("curl_easy_init() failed");

  std::string url = pImpl_->config.instrument_api_url + endpoint;
  std::string response;

  struct curl_slist* headers = nullptr;
  headers = curl_slist_append(headers, "Content-Type: application/json");
  std::string auth_header = "X-API-Key: " + pImpl_->config.instrument_api_key;
  headers = curl_slist_append(headers, auth_header.c_str());

  curl_easy_setopt(curl, CURLOPT_URL,           url.c_str());
  curl_easy_setopt(curl, CURLOPT_HTTPHEADER,    headers);
  curl_easy_setopt(curl, CURLOPT_POSTFIELDS,    body.c_str());
  curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, curlWriteCallback);
  curl_easy_setopt(curl, CURLOPT_WRITEDATA,     &response);
  curl_easy_setopt(curl, CURLOPT_TIMEOUT,       30L);

  CURLcode res = curl_easy_perform(curl);
  curl_slist_free_all(headers);
  curl_easy_cleanup(curl);

  if (res != CURLE_OK) {
    throw std::runtime_error(std::string("curl error: ") + curl_easy_strerror(res));
  }

  return response;
}

} // namespace quantumgrid
