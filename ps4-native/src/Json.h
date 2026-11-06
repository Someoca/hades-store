#pragma once

#include <string>
#include <vector>

namespace hades {

enum class JsonType { Null, Boolean, Number, String, Array, Object };

struct JsonValue {
    JsonType type;
    std::string text;
    bool booleanValue;
    std::vector<JsonValue> array;
    std::vector<std::pair<std::string, JsonValue> > object;

    JsonValue() : type(JsonType::Null), booleanValue(false) {}
    const JsonValue* Find(const std::string& key) const;
};

class JsonParser {
public:
    JsonParser();
    bool Parse(const std::string& input, JsonValue& output,
               std::string* error = 0) const;

private:
    static const std::size_t kMaxInputBytes = 1024 * 1024;
    static const std::size_t kMaxDepth = 24;
    static const std::size_t kMaxNodes = 20000;
};

} // namespace hades
