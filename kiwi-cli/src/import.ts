/**
 * @author linhuiw
 * @desc 翻译文件
 */
require('ts-node').register({
  compilerOptions: {
    module: 'commonjs'
  }
});
import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
import { traverse, getProjectConfig, getLangDir } from './utils';

import { readFileSync, writeFileSync } from 'fs';
import { tsvParseRows } from 'd3-dsv';
import { getAllMessages, getKiwiDir } from './utils';

const file = process.argv[3];
const lang = process.argv[4];
const CONFIG = getProjectConfig();

function getMessagesToImport(file) {
  const content = readFileSync(file).toString();
  const messages = tsvParseRows(content, ([key, zhValue, value]) => {
    try {
      // value 的形式和 JSON 中的字符串值一致，其中的特殊字符是以转义形式存在的，
      // 如换行符 \n，在 value 中占两个字符，需要转成真正的换行符。
      value = JSON.parse(`"${value}"`);
    } catch (e) {
      throw new Error(`Illegal message: ${value}`);
    }
    return [key, value];
  });
  const rst = {};
  const duplicateKeys = new Set();
  messages.forEach(([key, value]) => {
    if (rst.hasOwnProperty(key)) {
      duplicateKeys.add(key);
    }
    rst[key] = value;
  });

  if (duplicateKeys.size > 0) {
    const errorMessage = 'Duplicate messages detected: \n' + Array.from(duplicateKeys).join('\n');
    console.error(errorMessage);
    process.exit(1);
  }

  return rst;
}

/**
 * 将翻译写入文件
 * */
let count = 0;
function writeTranslations(file, toLang, translations) {
  const fileNameWithoutExt = path.basename(file).split('.')[0];
  const dstLangDir = getLangDir(toLang);
  const dstFile = path.resolve(dstLangDir, file);
  const { default: texts } = require(dstFile);
  const rst = {
    ...texts
  };

  traverse(texts, (text, path) => {
    const key = fileNameWithoutExt + '.' + path;
    // 使用 setWith 而不是 set，保证 numeric key 创建的不是数组，而是对象
    // https://github.com/lodash/lodash/issues/1316#issuecomment-120753100
    if (text !== translations[key]) {
      count += 1;
      _.setWith(rst, path, translations[key], Object);
    }
  });

  const fileContent = 'export default ' + JSON.stringify(rst, null, 2);
  const filePath = path.resolve(getLangDir(toLang), path.basename(file));
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, fileContent, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function getTranslations() {
  const messagesToImport = getMessagesToImport(file);
  const allMessages = getAllMessages();
  const newTranslations = {
  };
  _.forEach(messagesToImport, (message, key) => {
    if (allMessages.hasOwnProperty(key)) {
      newTranslations[key] = message;
    }
  });
  return newTranslations;
}

/**
 * 翻译对应的文件
 * @param file
 * @param toLang
 */
function translateFile(file, toLang) {
  const translations = getTranslations();
  const toLangDir = path.resolve(__dirname, `../${toLang}`);
  if (!fs.existsSync(toLangDir)) {
    fs.mkdirSync(toLangDir);
  }

  writeTranslations(file, toLang, translations);
}

function importMessages(callback?) {
  const srcLangDir = getLangDir(CONFIG.srcLang);
  fs.readdir(srcLangDir, (err, files) => {
    if (err) {
      console.error(err);
    } else {
      files = files.filter(file => file.endsWith('.ts') && file !== 'index.ts' && file !== 'mock.ts').map(file => file);
      const translateFiles = toLang =>
        Promise.all(
          files.map(file => {
            translateFile(file, toLang);
          })
        );

      translateFiles(lang).then(() => {
        console.log(`Imported ${count} message(s).`);
      }).catch(err => {
        console.log('Import fail: ' + err);
      })
    }
  });

}


export { importMessages };
