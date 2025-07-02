// const fs = require('node:fs');
// const path = require('node:path');
const open = require('opener');

// 通过 window 对象向渲染进程注入 nodejs 能力
window.services = {
  openUrl(url) {
    open(url)
  },
}
