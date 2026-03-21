#pragma once
// =============================================
// QuantumGrid Oracle — oracle.h
// Validates scientific instrument sessions
// and signs delivery proofs for XRPL Escrow
// =============================================

#include <string>
#include <cstdint>
#include <vector>
#include <functional>

namespace quantumgrid {

// ---- Data structures ----

struct SessionRequest {
  std::string session_id;      // UUID v4
  std::string instrument_type; // "telescope" | "quantum"
  std::string channel_id;      // XRPL Payment Channel ID (quantum) or escrow sequence (telescope)
  std::string user_address;    // XRPL r-address of user
  uint32_t    duration_sec;    // Session duration in seconds
  uint32_t    shots;           // Quantum: number of shots requested (0 for telescope)
};

struct SessionResult {
  std::string session_id;
  bool        success;
  std::string delivery_proof;  // Hex-encoded BLAKE2b preimage (fulfillment) for Escrow
  std::string signed_receipt;  // Oracle-signed JSON receipt (for Payment Channel)
  uint32_t    actual_shots;    // Quantum: shots actually executed
  double      actual_seconds;  // Telescope: seconds actually used
  std::string error_message;   // Non-empty on failure
};

struct OracleConfig {
  std::string oracle_private_key;   // Ed25519 private key hex for signing
  std::string oracle_xrpl_address;  // Oracle's XRPL r-address
  std::string instrument_api_url;   // Endpoint of the physical instrument API
  std::string instrument_api_key;   // API key for the instrument
  bool        simulation_mode;      // If true, use Qiskit/simulator instead of real hardware
};

// ---- Oracle class ----

class Oracle {
public:
  explicit Oracle(const OracleConfig& config);
  ~Oracle();

  /**
   * Start an instrument session.
   * - For telescopes: sends a time-locked session request to the instrument API
   * - For quantum: initialises the circuit execution context
   *
   * @returns SessionResult with delivery_proof populated on success
   */
  SessionResult startSession(const SessionRequest& req);

  /**
   * Execute a quantum circuit (pay-per-shot mode).
   * Called once per shot; updates cumulative claim amount.
   *
   * @param session_id  Session started via startSession()
   * @param circuit_qasm  OpenQASM 2.0 circuit string
   * @returns JSON string with measurement results
   */
  std::string executeShot(const std::string& session_id,
                           const std::string& circuit_qasm);

  /**
   * Finalise a session and generate the Escrow fulfillment proof.
   * For telescopes: confirms image delivery, returns BLAKE2b preimage.
   * For quantum: returns signed receipt of total shots executed.
   */
  SessionResult finaliseSession(const std::string& session_id);

  /**
   * Verify an Escrow condition against its fulfillment.
   * Used to validate before calling EscrowFinish on XRPL.
   */
  static bool verifyCondition(const std::string& condition_hex,
                               const std::string& fulfillment_hex);

  /**
   * Generate a fresh BLAKE2b condition/fulfillment pair.
   * Call this BEFORE creating the Escrow on XRPL.
   *
   * @returns pair<condition_hex, fulfillment_hex>
   */
  static std::pair<std::string, std::string> generateCondition();

private:
  struct Impl;
  std::unique_ptr<Impl> pImpl_;

  std::string signPayload(const std::string& payload) const;
  std::string callInstrumentAPI(const std::string& endpoint,
                                 const std::string& body) const;
};

} // namespace quantumgrid
