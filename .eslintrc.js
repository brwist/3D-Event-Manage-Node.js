module.exports = {
  env: {
    mocha: true,
    es2021: true
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    "no-console": "off",
    "no-underscore-dangle": "off",
    "max-len": "off",
    "import/no-extraneous-dependencies": ["error", {"devDependencies": ["**/*_spec.js"]}]
  },
};
