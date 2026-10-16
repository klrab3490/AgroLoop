const fs = require("fs");
const path = require("path");

const jsqrDistPaths = [
  path.resolve(__dirname, "../node_modules/jsqr/dist/jsQR.js"),
  path.resolve(__dirname, "../../node_modules/jsqr/dist/jsQR.js"),
];

for (const p of jsqrDistPaths) {
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, "utf8");
    const target = "catch (_a) {\n        return null;\n    }";
    const replacement = `catch (_a) {
        // Fallback for QR Version 10+ where character count length was written with 8 bits instead of 16 bits
        try {
            var bits = [];
            for (var bi = 0; bi < resultBytes.length; bi++) {
                for (var b = 7; b >= 0; b--) {
                    bits.push((resultBytes[bi] >> b) & 1);
                }
            }
            var mode = (bits[0] << 3) | (bits[1] << 2) | (bits[2] << 1) | bits[3];
            if (mode === 4) { // 8-bit byte mode
                var len8 = 0;
                for (var li = 0; li < 8; li++) len8 = (len8 << 1) | bits[4 + li];
                if (len8 > 0 && len8 <= resultBytes.length) {
                    var byteArr = [];
                    var chars = [];
                    for (var ci = 0; ci < len8; ci++) {
                        var charCode = 0;
                        var start = 12 + ci * 8;
                        if (start + 8 <= bits.length) {
                            for (var cbi = 0; cbi < 8; cbi++) {
                                charCode = (charCode << 1) | bits[start + cbi];
                            }
                            byteArr.push(charCode);
                            chars.push(String.fromCharCode(charCode));
                        }
                    }
                    var textStr = "";
                    try {
                        textStr = decodeURIComponent(byteArr.map(function (b) { return "%" + ("0" + b.toString(16)).substr(-2); }).join(""));
                    } catch (e) {
                        textStr = chars.join("");
                    }
                    if (textStr && textStr.length > 0) {
                        return { text: textStr, bytes: byteArr };
                    }
                }
            }
        } catch (fbErr) {
            // ignore
        }
        return null;
    }`;

    if (content.includes(target)) {
      content = content.replace(target, replacement);
      fs.writeFileSync(p, content, "utf8");
      console.log("[patch-jsqr] Successfully patched jsqr at:", p);
    } else if (content.includes("Fallback for QR Version 10+")) {
      console.log("[patch-jsqr] jsqr already patched at:", p);
    }
  }
}
