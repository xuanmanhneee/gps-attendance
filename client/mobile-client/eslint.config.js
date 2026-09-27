// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
<<<<<<< HEAD
    rules: {
      "import/namespace": "off",
    },
=======
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  }
]);
