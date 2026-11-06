#include "Json.h"

namespace hades {

const JsonValue* JsonValue::Find(const std::string& key) const {
    if (type != JsonType::Object) return 0;
    for (std::size_t i = 0; i < object.size(); ++i)
        if (object[i].first == key) return &object[i].second;
    return 0;
}

namespace {
class Reader {
public:
    explicit Reader(const std::string& source)
        : s(source), pos(0), nodes(0) {}

    bool ParseValue(JsonValue& out, std::size_t depth, std::string& error) {
        Skip();
        if (depth > JsonParser::kMaxDepth) return Fail(error, "Profundidade JSON excedida");
        if (++nodes > JsonParser::kMaxNodes) return Fail(error, "Quantidade de nos JSON excedida");
        if (pos >= s.size()) return Fail(error, "JSON terminou antes do esperado");

        const char c = s[pos];
        if (c == '{') return ParseObject(out, depth, error);
        if (c == '[') return ParseArray(out, depth, error);
        if (c == '"') {
            out.type = JsonType::String;
            return ParseString(out.text, error);
        }
        if (c == 't' && Literal("true")) { out.type = JsonType::Boolean; out.booleanValue = true; return true; }
        if (c == 'f' && Literal("false")) { out.type = JsonType::Boolean; out.booleanValue = false; return true; }
        if (c == 'n' && Literal("null")) { out.type = JsonType::Null; return true; }
        return ParseNumber(out, error);
    }

    void Skip() {
        while (pos < s.size() && (s[pos] == ' ' || s[pos] == '\n' ||
               s[pos] == '\r' || s[pos] == '\t')) ++pos;
    }

    bool AtEnd() { Skip(); return pos == s.size(); }

private:
    const std::string& s;
    std::size_t pos;
    std::size_t nodes;

    bool Fail(std::string& e, const char* message) {
        e = message;
        return false;
    }

    bool Literal(const char* word) {
        std::size_t n = 0;
        while (word[n]) ++n;
        if (s.compare(pos, n, word) != 0) return false;
        pos += n;
        return true;
    }

    static void AppendUtf8(std::string& out, unsigned int cp) {
        if (cp <= 0x7F) out.push_back(static_cast<char>(cp));
        else if (cp <= 0x7FF) {
            out.push_back(static_cast<char>(0xC0 | (cp >> 6)));
            out.push_back(static_cast<char>(0x80 | (cp & 0x3F)));
        } else if (cp <= 0xFFFF) {
            out.push_back(static_cast<char>(0xE0 | (cp >> 12)));
            out.push_back(static_cast<char>(0x80 | ((cp >> 6) & 0x3F)));
            out.push_back(static_cast<char>(0x80 | (cp & 0x3F)));
        } else {
            out.push_back(static_cast<char>(0xF0 | (cp >> 18)));
            out.push_back(static_cast<char>(0x80 | ((cp >> 12) & 0x3F)));
            out.push_back(static_cast<char>(0x80 | ((cp >> 6) & 0x3F)));
            out.push_back(static_cast<char>(0x80 | (cp & 0x3F)));
        }
    }

    bool Hex4(unsigned int& value) {
        if (pos + 4 > s.size()) return false;
        value = 0;
        for (int i = 0; i < 4; ++i) {
            const char c = s[pos++];
            value <<= 4;
            if (c >= '0' && c <= '9') value |= c - '0';
            else if (c >= 'a' && c <= 'f') value |= c - 'a' + 10;
            else if (c >= 'A' && c <= 'F') value |= c - 'A' + 10;
            else return false;
        }
        return true;
    }

    bool ParseString(std::string& out, std::string& error) {
        if (pos >= s.size() || s[pos++] != '"') return Fail(error, "String JSON invalida");
        while (pos < s.size()) {
            const unsigned char c = static_cast<unsigned char>(s[pos++]);
            if (c == '"') return true;
            if (c < 0x20) return Fail(error, "Caractere de controle em string JSON");
            if (c != '\\') { out.push_back(static_cast<char>(c)); continue; }
            if (pos >= s.size()) return Fail(error, "Escape JSON incompleto");
            const char e = s[pos++];
            switch (e) {
                case '"': out.push_back('"'); break;
                case '\\': out.push_back('\\'); break;
                case '/': out.push_back('/'); break;
                case 'b': out.push_back('\b'); break;
                case 'f': out.push_back('\f'); break;
                case 'n': out.push_back('\n'); break;
                case 'r': out.push_back('\r'); break;
                case 't': out.push_back('\t'); break;
                case 'u': {
                    unsigned int cp = 0;
                    if (!Hex4(cp)) return Fail(error, "Escape Unicode invalido");
                    if (cp >= 0xD800 && cp <= 0xDBFF) {
                        if (pos + 2 > s.size() || s[pos] != '\\' || s[pos + 1] != 'u')
                            return Fail(error, "Par substituto Unicode incompleto");
                        pos += 2;
                        unsigned int low = 0;
                        if (!Hex4(low) || low < 0xDC00 || low > 0xDFFF)
                            return Fail(error, "Par substituto Unicode invalido");
                        const unsigned int codePoint = 0x10000 +
                            ((cp - 0xD800) << 10) + (low - 0xDC00);
                        AppendUtf8(out, codePoint);
                    } else if (cp >= 0xDC00 && cp <= 0xDFFF) {
                        return Fail(error, "Substituto Unicode baixo sem par");
                    } else {
                        AppendUtf8(out, cp);
                    }
                    break;
                }
                default: return Fail(error, "Escape JSON desconhecido");
            }
        }
        return Fail(error, "String JSON nao foi fechada");
    }

    bool ParseNumber(JsonValue& out, std::string& error) {
        const std::size_t start = pos;
        if (pos < s.size() && s[pos] == '-') ++pos;
        if (pos >= s.size()) return Fail(error, "Numero JSON invalido");
        if (s[pos] == '0') ++pos;
        else {
            if (s[pos] < '1' || s[pos] > '9') return Fail(error, "Valor JSON invalido");
            while (pos < s.size() && s[pos] >= '0' && s[pos] <= '9') ++pos;
        }
        if (pos < s.size() && s[pos] == '.') {
            ++pos;
            const std::size_t digits = pos;
            while (pos < s.size() && s[pos] >= '0' && s[pos] <= '9') ++pos;
            if (digits == pos) return Fail(error, "Fracao JSON invalida");
        }
        if (pos < s.size() && (s[pos] == 'e' || s[pos] == 'E')) {
            ++pos;
            if (pos < s.size() && (s[pos] == '+' || s[pos] == '-')) ++pos;
            const std::size_t digits = pos;
            while (pos < s.size() && s[pos] >= '0' && s[pos] <= '9') ++pos;
            if (digits == pos) return Fail(error, "Expoente JSON invalido");
        }
        out.type = JsonType::Number;
        out.text = s.substr(start, pos - start);
        return true;
    }

    bool ParseArray(JsonValue& out, std::size_t depth, std::string& error) {
        ++pos;
        out.type = JsonType::Array;
        Skip();
        if (pos < s.size() && s[pos] == ']') { ++pos; return true; }
        for (;;) {
            JsonValue value;
            if (!ParseValue(value, depth + 1, error)) return false;
            out.array.push_back(value);
            Skip();
            if (pos >= s.size()) return Fail(error, "Array JSON nao foi fechada");
            if (s[pos] == ']') { ++pos; return true; }
            if (s[pos++] != ',') return Fail(error, "Esperada virgula no array JSON");
        }
    }

    bool ParseObject(JsonValue& out, std::size_t depth, std::string& error) {
        ++pos;
        out.type = JsonType::Object;
        Skip();
        if (pos < s.size() && s[pos] == '}') { ++pos; return true; }
        for (;;) {
            Skip();
            std::string key;
            if (!ParseString(key, error)) return false;
            for (std::size_t i = 0; i < out.object.size(); ++i)
                if (out.object[i].first == key) return Fail(error, "Chave JSON duplicada");
            Skip();
            if (pos >= s.size() || s[pos++] != ':') return Fail(error, "Esperado dois-pontos no objeto JSON");
            JsonValue value;
            if (!ParseValue(value, depth + 1, error)) return false;
            out.object.push_back(std::make_pair(key, value));
            Skip();
            if (pos >= s.size()) return Fail(error, "Objeto JSON nao foi fechado");
            if (s[pos] == '}') { ++pos; return true; }
            if (s[pos++] != ',') return Fail(error, "Esperada virgula no objeto JSON");
        }
    }
};
}

bool JsonParser::Parse(const std::string& input, JsonValue& output,
                       std::string* error) const {
    std::string localError;
    if (input.size() > kMaxInputBytes) {
        if (error) *error = "Documento JSON excede 1 MiB";
        return false;
    }
    Reader reader(input);
    if (!reader.ParseValue(output, 0, localError) || !reader.AtEnd()) {
        if (localError.empty()) localError = "Conteudo extra apos o JSON";
        if (error) *error = localError;
        return false;
    }
    return true;
}

} // namespace hades
