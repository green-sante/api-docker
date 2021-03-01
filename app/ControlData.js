module.exports = {
    validateEmail: function (email) {
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    },
    validatePhone: function (num) {
        if (num.indexOf('+33') != -1) num = num.replace('+33', '0');
        var re = /^0[1-7]\d{8}$/;
        return re.test(num);
    },
    sqlescstr: function (str) {
        //mlog(str);
        if (str && str !== undefined) {
            return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
                switch (char) {
                    case "\0":
                        return "\\0";
                    case "\x08":
                        return "\\b";
                    case "\x09":
                        return "\\t";
                    case "\x1a":
                        return "\\z";
                    case "\n":
                        return "\\n";
                    case "\r":
                        return "\\r";
                    case "\"":
                    case "'":
                    case "\\":
                    case "%":
                        return "\\" + char; // prepends a backslash to backslash, percent,
                    // and double/single quotes
                }
            });
        } else return "";
    },
    isFloat: function (n) {
        return Number(n) === n && n % 1 !== 0;
    },
    isNumeric: function (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    },
    isObject: function (a) {
        return (!!a) && (a.constructor === Object);
    }
}