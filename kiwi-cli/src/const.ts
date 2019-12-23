/**
 * @author linhuiw
 * @desc 项目配置文件配置信息
 */

export const PROJECT_CONFIG = {
  dir: './.kiwi',
  configFile: './.kiwi/config.json',
  defaultConfig: {
    srcLang: 'zh-CN',
    distLangs: ['en-US', 'zh-HK'],
    googleApiKey: ''
  },
  langMap: {
    'en-US': 'en',
    'zh-TW': 'zh-tw',
    'zh-HK': 'zh-tw'
  },
  zhIndexFile: `import common from './common';

export default Object.assign({}, {
  common
});`,
  zhTestFile: `export default {
    test: '测试'
  }`
};
