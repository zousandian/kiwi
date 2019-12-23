/**
 * @author linhuiw
 * @desc 翻译方法
 * @TODO: index 文件需要添加 mock
 */
require('ts-node').register({
  compilerOptions: {
    module: 'commonjs'
  }
});
import * as path from 'path';
import * as fs from 'fs';
import * as _ from 'lodash';
import { traverse, getProjectConfig, getLangDir } from './utils';
import { tsvFormatRows } from 'd3-dsv';
const CONFIG = getProjectConfig();
// const { translate: googleTranslate } = require('google-translate')(CONFIG.googleApiKey);
const googleTranslate = require('google-translate-api');

import { withTimeout, retry } from './utils';
import { PROJECT_CONFIG } from './const';

function translateText(text, toLang) {
  return withTimeout(
    new Promise((resolve, reject) => {
      // googleTranslate(text, 'zh', PROJECT_CONFIG.langMap[toLang], (err, translation) => {
      //   if (err) {
      //     reject(err);
      //   } else {
      //     resolve(translation.translatedText);
      //   }
      // });

      googleTranslate(text, { to: PROJECT_CONFIG.langMap[toLang] }).then(res => {
        resolve(res.text);
      }).catch(err =>{
        reject(err);
        console.log(err)
      });
    }),
    15000
  );
}
/**
 * 获取中文文案
 */
function getSourceText() {
  const srcLangDir = getLangDir(CONFIG.srcLang);
  const srcFile = path.resolve(srcLangDir, 'index.ts');
  const { default: texts } = require(srcFile);

  return texts;
}
/**
 * 获取对应语言文案
 * @param dstLang
 */
function getDistText(dstLang) {
  const distLangDir = getLangDir(dstLang);
  const distFile = path.resolve(distLangDir, 'index.ts');
  let distTexts = {};
  if (fs.existsSync(distFile)) {
    distTexts = require(distFile).default;
  }

  return distTexts;
}
/**
 * Mock 对应语言
 * @param dstLang
 */
async function mockCurrentLang(dstLang) {
  const texts = getSourceText();
  const distTexts = getDistText(dstLang);
  const untranslatedTexts = {};
  const mocks = [];
  /** 遍历文案 */
  traverse(texts, (text, path) => {
    const distText = _.get(distTexts, path);
    if (text === distText) {
      untranslatedTexts[path] = text;
    }
  });
  /** 调用 Google 翻译 */
  const translateAllTexts = Object.keys(untranslatedTexts).map(key => {
    return translateText(untranslatedTexts[key], dstLang).then(translatedText => [key, translatedText]);
  });
  /** 获取 Mocks 文案 */
  await Promise.all(translateAllTexts).then(res => {
    res.forEach(([key, translatedText]) => {
      mocks.push([key, translatedText]);
    });
    return mocks;
  });
  return writeMockFile(dstLang, mocks);
}
/**
 * 写入 Mock 文件
 * @param dstLang
 * @param mocks
 */
function writeMockFile(dstLang, mocks) {
  const fileContent = tsvFormatRows(mocks)
  const filePath = path.resolve(getLangDir(dstLang), 'mock.csv');
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
 * Mock 语言的未翻译的文案
 * @param lang
 */
async function mockLangs(lang?: string) {
  const CONFIG = getProjectConfig();
  const langs = lang ? [lang] : CONFIG.distLangs;
  const mockPromise = langs.map(lang => {
    return mockCurrentLang(lang);
  });
  return Promise.all(mockPromise);
}

export { mockLangs };
