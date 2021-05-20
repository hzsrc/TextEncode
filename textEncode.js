var iconv = require('iconv-lite');
var fs = require('fs');

/// <summary>
/// 获取文件的编码格式
/// </summary>
function TextEncode(defaultEnc) {
    this.encoding = defaultEnc || 'GBK'
    this.bom = [];
}

TextEncode.prototype = {
    readTextEnc: function (fileName) {
        var r = this.readText(fileName);
        return { text: r, encoding: this.encoding };
    },
    readTextAsync: function (fileName, cb) {
        var it = this;
        fs.readFile(fileName, function (err, bytes) {
            cb(err, it.readBytes(bytes))
        });
    },
    readText: function (fileName) {
        var bytes = fs.readFileSync(fileName);
        return this.readBytes(bytes);
    },
    readBytes: function (bytes) {
        var encoding = null;
        var bomLen = 0;
        if (bytes.length > 1) {
            if (bytes[0] == 0xFE && bytes[1] == 0xFF) //UTF-16（大端序）
            {
                encoding = 'UTF-16BE';
                bomLen = 2;
            } else if (bytes[0] == 0xFF && bytes[1] == 0xFE) //UTF-16（小端序）
            {
                encoding = 'UTF-16LE';
                bomLen = 2;
            }
        }
        if (encoding == null && bytes.length > 2) {
            if ((bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF)) //UTF-8
            {
                encoding = 'UTF8';
                bomLen = 3;
            }
        }
        if (encoding == null && bytes.length > 3) {
            if (bytes[0] == 0x00 && bytes[1] == 0x00 && bytes[2] == 0xFE && bytes[3] == 0xFF) //UTF-32（大端序）
            {
                encoding = 'UTF-32BE';
                bomLen = 4;
            } else if (bytes[0] == 0xFF && bytes[1] == 0xFE && bytes[2] == 0x00 && bytes[3] == 0x00) //UTF-32（小端序）
            {
                encoding = 'UTF-32LE';
                bomLen = 4;
            }
        }

        if (encoding == null && this.isUTF8Bytes(bytes)) {
            encoding = 'UTF8'; //UTF8无BOM
        }
        if (encoding != null) this.encoding = encoding;

        this.bom = bytes.slice(0, bomLen);
        if (bomLen > 0) bytes = bytes.slice(bomLen)
        return iconv.decode(bytes, this.encoding);
    },

/// <summary>
/// 判断是否是不带 bom 的 UTF8 格式
/// </summary>
/// <param name="data"></param>
/// <returns></returns>
    isUTF8Bytes: function (data) {
        var charByteCounter = 1; //计算当前正分析的字符应还有的字节数
        var curByte; //当前分析的字节.
        for (var i = 0; i < data.length; i++) {
            curByte = data[i];
            if (curByte == 0) throw new Error('非预期的byte格式');
            if (charByteCounter == 1) {
                if (curByte >= 0x80) {
                    //判断当前
                    while (((curByte <<= 1) & 0x80) != 0) {
                        charByteCounter++;
                    }
                    //标记位首位若为非0 则至少以2个1开始 如:110XXXXX...........1111110X
                    if (charByteCounter == 1 || charByteCounter > 6) {
                        return false;
                    }
                }
            } else {
                //若是UTF-8 此时第一位必须为1
                if ((curByte & 0xC0) != 0x80) {
                    return false;
                }
                charByteCounter--;
            }
        }
        if (charByteCounter > 1) {
            throw new Error('非预期的byte格式');
        }
        return true;
    },

    /// <summary>
    /// 已相同的Encoding和BOM再次写入
    /// </summary>
    writeBySameEncoding: function (fileName, content) {
        if (this.bom == null) {
            throw new Error('需要先调用readText方法');
        }

        fs.writeFileSync(fileName, Buffer.from(this.bom));
        var bytes = iconv.encode(content, this.encoding);
        fs.appendFileSync(fileName, bytes);
    }
}

module.exports = TextEncode
