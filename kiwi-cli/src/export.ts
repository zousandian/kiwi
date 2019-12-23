/**
 * @author linhuiw
 * @desc 导出未翻译文件
 */
require('ts-node').register({
  compilerOptions: {
    module: 'commonjs'
  }
});
import * as fs from 'fs';
import * as path from 'path';
import { tsvFormatRows } from 'd3-dsv';
import { getKiwiDir, getLangDir, traverse, getProjectConfig } from './utils';
import * as _ from 'lodash';
const CONFIG = getProjectConfig();
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

// 获取所有文案
function getLangUnTranslate(lang?: string) {
  const messagesToTranslate = [['key', 'zh-CN', lang]];
  const texts = getSourceText();
  const dstMessages = getDistText(lang);
  
  /** 遍历文案 */
  traverse(texts, (text, path) => {
    const distText = _.get(dstMessages, path);
    // if (text === distText) {
    //   messagesToTranslate.push([path, text]);
    // }
    
    // 导出全部
    messagesToTranslate.push([path, text, distText]);
  });

  return messagesToTranslate;
}

function exportMessages(lang?: string) {
  const CONFIG = getProjectConfig();
  const langs = lang ? [lang] : CONFIG.distLangs;
  langs.map(lang => {
    const unTranslateMessages = getLangUnTranslate(lang);
    const content = tsvFormatRows(unTranslateMessages);
    fs.writeFileSync(`./export-${lang}.csv`, content);
    console.log(`${lang} 该语言导出 ${unTranslateMessages.length} 文案.`);
  });
}

export { exportMessages };
