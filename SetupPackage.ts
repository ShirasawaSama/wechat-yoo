import fs from 'fs'

// DO NOT DELETE THIS FILE
// This file is used by build system to build a clean npm package with the compiled js files in the root of the package.
// It will not be included in the npm package.

const sourceObj = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
delete sourceObj.private
sourceObj.scripts = {}
sourceObj.main = sourceObj.main.replace(/^dist\//, '')
fs.writeFileSync('dist/package.json', JSON.stringify(sourceObj, null, 2))
fs.copyFileSync('README.md', 'dist/README.md')
fs.copyFileSync('LICENSE', 'dist/LICENSE')
