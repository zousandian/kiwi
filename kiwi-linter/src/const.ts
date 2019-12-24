/**
 * @author linhuiw
 * @desc 常量定义
 */
import * as vscode from 'vscode';
import { getConfiguration } from './utils';

function getDefaultDir() {
  const preFix = getConfiguration('langPrefix');
  if (preFix) {
    return `${vscode.workspace.rootPath}/${preFix}`;
  }
  return vscode.workspace.rootPath;
}

const LANG_PREFIX = getDefaultDir();
const I18N_GLOB = `${LANG_PREFIX}**/*.ts`;
const DOUBLE_BYTE_REGEX = /[^\x00-\xff]/g;
vscode.window.showInformationMessage(LANG_PREFIX)

export { LANG_PREFIX, I18N_GLOB, DOUBLE_BYTE_REGEX };
