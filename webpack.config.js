const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const BrotliPlugin = require("brotli-webpack-plugin");
// const UglifyJsPlugin = require("uglifyjs-webpack-plugin");

const production = process.argv.indexOf("production") > -1;

module.exports = {
  mode: "development",
  entry: "./src/app.js",
  output: {
    filename: "bundle.[contenthash].js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "/src/index.html"),
    }),
    production &&
      new BrotliPlugin({
        asset: "[path].br[query]",
        test: /\.(js|css|html|svg)$/,
        threshold: 10240,
        minRatio: 0.8,
      }),
  ],
  devtool: !production && "inline-source-map",
  devServer: {
    static: "./dist",
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.html$/i,
        use: ["html-loader"],
      },
    ],
  },
};
