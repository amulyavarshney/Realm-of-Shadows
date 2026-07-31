/**
 * gh-pages clones may retain a root .gitignore that ignores node_modules/.
 * Expo static assets live under assets/node_modules/... — strip that ignore
 * so icon fonts and other vendor assets are committed.
 */
const fs = require('fs');
const path = require('path');

module.exports = function beforeAdd(git) {
  const ignorePath = path.join(git.cwd, '.gitignore');
  if (fs.existsSync(ignorePath)) {
    fs.unlinkSync(ignorePath);
  }
};
