const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://en.wikipedia.org',
    supportFile: false,
  },
})
