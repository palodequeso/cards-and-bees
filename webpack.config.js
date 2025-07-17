const path = require("path");

module.exports = {
  cache: true,
  mode: "development",
  devtool: "source-map",
  entry: "./src/frontend/index.ts",
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: ["ts-loader"],
        exclude: /node_modules/,
      },
      {
        test: /\.scss$/,
        use: ["style-loader", "css-loader", "sass-loader"],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".scss"],
  },
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist/frontend"),
  },
  target: "web",
  plugins: [],
};
