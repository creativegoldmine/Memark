module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-gesture-handler/babel',
      'react-native-reanimated/plugin',
    ],
  };
};
