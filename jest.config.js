module.exports = {
  "cache": false,
  "rootDir": "tests/",
  "maxConcurrency": 1,
  "preset": "ts-jest",
  "testEnvironment": "node",
  "testPathIgnorePatterns": ['/node_modules/', '.js$'],
  "moduleFileExtensions": [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json",
    "node"
  ]
}