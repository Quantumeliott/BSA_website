// =============================================
// QuantumGrid Oracle — main.cpp
// Lightweight HTTP server exposing Oracle API
// Uses cpp-httplib (header-only)
// =============================================

#include "oracle.h"
#include <httplib.h>          // https://github.com/yhirose/cpp-httplib
#include <nlohmann/json.hpp>
#include <iostream>
#include <cstdlib>

using json = nlohmann::json;
using namespace quantumgrid;

int main() {
  // Load config from environment
  OracleConfig config {
    .oracle_private_key  = std::getenv("ORACLE_PRIVATE_KEY")  ? std::getenv("ORACLE_PRIVATE_KEY")  : "",
    .oracle_xrpl_address = std::getenv("ORACLE_XRPL_ADDRESS") ? std::getenv("ORACLE_XRPL_ADDRESS") : "",
    .instrument_api_url  = std::getenv("INSTRUMENT_API_URL")  ? std::getenv("INSTRUMENT_API_URL")  : "http://localhost:9000",
    .instrument_api_key  = std::getenv("INSTRUMENT_API_KEY")  ? std::getenv("INSTRUMENT_API_KEY")  : "",
    .simulation_mode     = std::getenv("SIMULATION_MODE")     ? std::string(std::getenv("SIMULATION_MODE")) == "true" : true,
  };

  Oracle oracle(config);
  httplib::Server svr;

  // ---- Health check ----
  svr.Get("/health", [](const httplib::Request&, httplib::Response& res) {
    res.set_content(R"({"status":"ok","service":"quantumgrid-oracle"})", "application/json");
  });

  // ---- Generate Escrow condition ----
  // Call BEFORE creating the XRPL Escrow on-chain
  // Returns condition_hex to put in the EscrowCreate tx
  svr.Post("/condition/generate", [](const httplib::Request&, httplib::Response& res) {
    try {
      auto [condition, fulfillment] = Oracle::generateCondition();
      // NOTE: fulfillment is secret — stored internally, NOT returned here
      json resp = {
        { "condition_hex",   condition   },
        // fulfillment is stored server-side, revealed only at finaliseSession
      };
      res.set_content(resp.dump(), "application/json");
    } catch (const std::exception& e) {
      res.status = 500;
      res.set_content(json{{"error", e.what()}}.dump(), "application/json");
    }
  });

  // ---- Start session ----
  svr.Post("/sessions/start", [&oracle](const httplib::Request& req, httplib::Response& res) {
    try {
      auto body = json::parse(req.body);

      SessionRequest sreq {
        .session_id      = body.value("session_id",      ""),
        .instrument_type = body.value("instrument_type", "telescope"),
        .channel_id      = body.value("channel_id",      ""),
        .user_address    = body.value("user_address",    ""),
        .duration_sec    = body.value("duration_sec",    (uint32_t)1800),
        .shots           = body.value("shots",           (uint32_t)0),
      };

      SessionResult result = oracle.startSession(sreq);

      json resp = {
        { "session_id",    result.session_id },
        { "success",       result.success },
        { "condition_hex", result.delivery_proof }, // condition to use in EscrowCreate
        { "error",         result.error_message },
      };
      res.status = result.success ? 200 : 500;
      res.set_content(resp.dump(), "application/json");

    } catch (const std::exception& e) {
      res.status = 400;
      res.set_content(json{{"error", e.what()}}.dump(), "application/json");
    }
  });

  // ---- Execute quantum shot ----
  svr.Post("/sessions/shot", [&oracle](const httplib::Request& req, httplib::Response& res) {
    try {
      auto body       = json::parse(req.body);
      std::string sid = body.value("session_id", "");
      std::string qasm= body.value("qasm", "");

      std::string result = oracle.executeShot(sid, qasm);
      res.set_content(result, "application/json");

    } catch (const std::exception& e) {
      res.status = 500;
      res.set_content(json{{"error", e.what()}}.dump(), "application/json");
    }
  });

  // ---- Finalise session ----
  // Returns fulfillment_hex so the provider can call EscrowFinish on XRPL
  svr.Post("/sessions/finalise", [&oracle](const httplib::Request& req, httplib::Response& res) {
    try {
      auto body       = json::parse(req.body);
      std::string sid = body.value("session_id", "");

      SessionResult result = oracle.finaliseSession(sid);

      json resp = {
        { "session_id",     result.session_id },
        { "success",        result.success },
        { "fulfillment_hex",result.delivery_proof }, // preimage → EscrowFinish
        { "signed_receipt", result.signed_receipt },
        { "actual_shots",   result.actual_shots },
        { "actual_seconds", result.actual_seconds },
        { "error",          result.error_message },
      };
      res.status = result.success ? 200 : 500;
      res.set_content(resp.dump(), "application/json");

    } catch (const std::exception& e) {
      res.status = 500;
      res.set_content(json{{"error", e.what()}}.dump(), "application/json");
    }
  });

  int port = 8080;
  std::cout << "[Oracle] Starting on port " << port
            << " | simulation=" << (config.simulation_mode ? "true" : "false") << "\n";
  svr.listen("0.0.0.0", port);

  return 0;
}
