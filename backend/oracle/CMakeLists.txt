cmake_minimum_required(VERSION 3.18)
project(quantumgrid_oracle CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ---- Dependencies ----
# Install via: apt install libcurl4-openssl-dev libssl-dev
# nlohmann/json: header-only, fetched below
# cpp-httplib:   header-only, fetched below

include(FetchContent)

FetchContent_Declare(
  nlohmann_json
  URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
)
FetchContent_MakeAvailable(nlohmann_json)

FetchContent_Declare(
  httplib
  GIT_REPOSITORY https://github.com/yhirose/cpp-httplib.git
  GIT_TAG        v0.15.3
)
FetchContent_MakeAvailable(httplib)

# ---- Target ----
add_executable(oracle
  main.cpp
  oracle.cpp
)

target_include_directories(oracle PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})

target_link_libraries(oracle PRIVATE
  nlohmann_json::nlohmann_json
  httplib::httplib
  curl
  ssl
  crypto
)

# ---- Build type ----
if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")
