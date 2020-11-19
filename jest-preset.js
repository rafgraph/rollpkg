// jest requires that presets from an npm package be in the package root and are named jest-preset.js
// so re-export preset from ./configs
module.exports = require('./configs/jest-preset')
