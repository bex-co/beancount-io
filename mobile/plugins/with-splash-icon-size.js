const { withAndroidStyles, AndroidConfig } = require("expo/config-plugins");

module.exports = function withSplashIconSize(config, { iconSize = 144 } = {}) {
  return withAndroidStyles(config, (config) => {
    const parent = { name: "Theme.App.SplashScreen", parent: "Theme.SplashScreen" };
    config.modResults = AndroidConfig.Styles.assignStylesValue(config.modResults, {
      add: true,
      name: "windowSplashScreenIconSize",
      value: `${iconSize}dp`,
      parent,
    });
    return config;
  });
};
