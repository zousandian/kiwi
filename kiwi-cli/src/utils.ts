/**
 * @author linhuiw
 * @desc 工具方法
 */
import * as path from 'path';
import * as _ from 'lodash';
import * as fs from 'fs';
import { PROJECT_CONFIG } from './const';
const http = require('http');
const https = require('https');

/**
 * 获取语言资源的根目录
 */
function getKiwiDir() {
  return path.resolve(process.cwd(), `${PROJECT_CONFIG.dir}`);
}

/**
 * 获取对应语言的目录位置
 * @param lang
 */
function getLangDir(lang) {
  const langsDir = getKiwiDir();
  return path.resolve(langsDir, lang);
}

/**
 * 深度优先遍历对象中的所有 string 属性，即文案
 */
function traverse(obj, cb) {
  function traverseInner(obj, cb, path) {
    _.forEach(obj, (val, key) => {
      if (typeof val === 'string') {
        cb(val, [...path, key].join('.'));
      } else if (typeof val === 'object' && val !== null) {
        traverseInner(val, cb, [...path, key]);
      }
    });
  }

  traverseInner(obj, cb, []);
}

/**
 * 获取所有文案
 */
function getAllMessages() {
  const srcLangDir = path.resolve(getKiwiDir(), 'zh-CN');
  let files = fs.readdirSync(srcLangDir);
  files = files.filter(file => file.endsWith('.ts') && file !== 'index.ts').map(file => path.resolve(srcLangDir, file));

  const allMessages = files.map(file => {
    const { default: messages } = require(file);
    const fileNameWithoutExt = path.basename(file).split('.')[0];
    const flattenedMessages = {};

    traverse(messages, (message, path) => {
      const key = fileNameWithoutExt + '.' + path;
      flattenedMessages[key] = message;
    });

    return flattenedMessages;
  });

  return Object.assign({}, ...allMessages);
}

/**
 * 获得项目配置信息
 */
function getProjectConfig() {
  let obj = PROJECT_CONFIG.defaultConfig;
  try {
    if (fs.existsSync(PROJECT_CONFIG.configFile)) {
      obj = JSON.parse(fs.readFileSync(PROJECT_CONFIG.configFile, 'utf8'));
    }
  } catch (error) {
    console.log(error);
  }
  return obj;
}

/**
 * 重试方法
 * @param asyncOperation
 * @param times
 */
function retry(asyncOperation, times = 1) {
  let runTimes = 1;
  const handleReject = e => {
    if (runTimes++ < times) {
      return asyncOperation().catch(handleReject);
    } else {
      throw e;
    }
  };
  return asyncOperation().catch(handleReject);
}

/**
 * 设置超时
 * @param promise
 * @param ms
 */
function withTimeout(promise, ms) {
  const timeoutPromise = new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(`Promise timed out after ${ms} ms.`);
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]);
}

function withDelay(promise, ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(promise);
    }, ms);
  });
}

const request = async (url, method = 'GET', postData) => {
  const lib = url.startsWith('https://') ? https : http;

  const params = {
    method,
    headers: { 'content-type': 'application/json' }
  };

  return new Promise((resolve, reject) => {
    const req = lib.request(url, params, res => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`Status Code: ${res.statusCode}`));
      }

      const data = [];

      res.on('data', chunk => {
        data.push(chunk);
      });

      res.on('end', () => resolve(Buffer.concat(data).toString()));
    });

    req.on('error', reject);

    if (postData) {
      req.write(JSON.stringify(postData));
    }

    // IMPORTANT
    req.end();
  });
};

/**
 * 设置超时
 * @param promise
 * @param text
 */
function translateTextHK(text) {
  return withDelay(
    new Promise((resolve, reject) => {
      request('http://mp.digitalgd.com.cn/api/open/r/opencc/Tran', 'POST', {
        config_file: 's2hk',
        text: text
      })
        .then((res: string) => {
          const data = JSON.parse(res);
          resolve(data.data.text);
        })
        .catch(err => {
          reject(err);
          console.log(err);
        });
    }),
    500 * (Math.random() * 10)
  );
}

export { getKiwiDir, getLangDir, traverse, retry, withTimeout, getAllMessages, getProjectConfig, translateTextHK };
