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
import { traverse, getProjectConfig, getLangDir, translateTextHK } from './utils';
const CONFIG = getProjectConfig();
const googleTranslate = require('google-translate-api');

import { withTimeout, retry } from './utils';
import { PROJECT_CONFIG } from './const';

function translateText(text, toLang) {
  if (toLang.toLowerCase() === 'zh-hk') {
    return translateTextHK(text);
  }

  return withTimeout(
    new Promise((resolve, reject) => {
      googleTranslate(text, { to: PROJECT_CONFIG.langMap[toLang] })
        .then(res => {
          resolve(res.text);
        })
        .catch(err => {
          reject(err);
          console.log(err);
        });
    }),
    15000
  );
}
/**
 * 获取中文文案文件的翻译，优先使用已有翻译，若找不到则使用google翻译
 * */
async function getTranslations(file, toLang) {
  const translations = {};
  const untranslatedTexts = {};
  const fileNameWithoutExt = path.basename(file).split('.')[0];
  const srcLangDir = getLangDir(CONFIG.srcLang);
  const distLangDir = getLangDir(toLang);
  const srcFile = path.resolve(srcLangDir, file);
  const distFile = path.resolve(distLangDir, file);
  const { default: texts } = require(srcFile);
  let distTexts;
  if (fs.existsSync(distFile)) {
    distTexts = require(distFile).default;
  }

  traverse(texts, async (text, path) => {
    const key = fileNameWithoutExt + '.' + path;
    const distText = _.get(distTexts, path);
    if (distText) {
      translations[key] = distText;
    } else {
      untranslatedTexts[key] = text;
    }
  });

  /** 调用 Google 翻译 */
  const translateAllTexts = Object.keys(untranslatedTexts).map(key => {
    return translateText(untranslatedTexts[key], toLang).then(translatedText => [key, translatedText]);
  });

  await Promise.all(translateAllTexts).then(res => {
    res.forEach(([key, translatedText]) => {
      translations[key] = translatedText;
    });
    return translations;
  });

  return translations;
}

/**
 * 将翻译写入文件
 * */
function writeTranslations(file, toLang, translations) {
  const fileNameWithoutExt = path.basename(file).split('.')[0];
  const srcLangDir = getLangDir(CONFIG.srcLang);
  const srcFile = path.resolve(srcLangDir, file);
  const { default: texts } = require(srcFile);
  const rst = {};

  traverse(texts, (text, path) => {
    const key = fileNameWithoutExt + '.' + path;
    // 使用 setWith 而不是 set，保证 numeric key 创建的不是数组，而是对象
    // https://github.com/lodash/lodash/issues/1316#issuecomment-120753100
    _.setWith(rst, path, translations[key], Object);
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

/**
 * 翻译对应的文件
 * @param file
 * @param toLang
 */
async function translateFile(file, toLang) {
  const translations = await getTranslations(file, toLang);
  const toLangDir = getLangDir(toLang);
  if (!fs.existsSync(toLangDir)) {
    fs.mkdirSync(toLangDir);
  }

  writeTranslations(file, toLang, translations);
}

/**
 * 翻译所有文件
 */
function sync(callback?) {
  const srcLangDir = getLangDir(CONFIG.srcLang);
  fs.readdir(srcLangDir, (err, files) => {
    if (err) {
      console.error(err);
    } else {
      files = files.filter(file => file.endsWith('.ts') && file !== 'index.ts' && file !== 'mock.ts').map(file => file);
      const translateFiles = toLang =>
        Promise.all(
          files.map(async file => {
            await translateFile(file, toLang);
          })
        );
      Promise.all(CONFIG.distLangs.map(translateFiles)).then(
        () => {
          const langDirs = CONFIG.distLangs.map(getLangDir);
          langDirs.map(dir => {
            const filePath = path.resolve(dir, 'index.ts');
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir);
            }
            fs.copyFileSync(path.resolve(srcLangDir, 'index.ts'), filePath);
          });
          callback && callback();
        },
        e => {
          console.error(e);
          process.exit(1);
        }
      );
    }
  });
}

export { sync };
