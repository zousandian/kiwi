# 🐤 kiwi cli

Kiwi 的 CLI 工具

## 如何使用

> dnpm install @digitalgd/kiwi-cli -g

> 推荐与[🐤 Kiwi-国际化全流程解决方案](https://github.com/alibaba/kiwi)结合使用

## CLI 参数
### kiwi `--init`
初始化项目

### 使用 VSCode 插件  kiwi-linter 提取未翻译的中文文案

### kiwi `--sync`
提取中文文案后执行该操作，使用 google 翻译同步其他语言。已翻译的内容不作处理。

### kiwi `--export`
导出全部文案，用于翻译校对及修改

```shell script
# 导出指定语言的文案
kiwi --export=zh-HK
```

### kiwi `--import`
导入修改后的文案，将修改后的文案重新导入到项目中

```shell script
# 导入指定语言的文案
kiwi --import /path/to/zh-HK.csv zh-HK
```
