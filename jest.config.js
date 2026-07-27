function replaceImportMetaForJest({ types }) {
  return {
    name: "replace-import-meta-for-jest",
    visitor: {
      MetaProperty(path) {
        if (
          path.node.meta.name === "import" &&
          path.node.property.name === "meta"
        ) {
          path.replaceWith(types.objectExpression([]));
        }
      },
    },
  };
}

export default {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  transform: {
    "^.+\\.(js|jsx|mjs)$": [
      "babel-jest",
      {
        babelrc: false,
        configFile: false,
        presets: [
          ["@babel/preset-env", { targets: { node: "current" } }],
          ["@babel/preset-react", { runtime: "automatic" }],
        ],
        plugins: [replaceImportMetaForJest],
      },
    ],
  },
  transformIgnorePatterns: [
    "<rootDir>/node_modules/.pnpm/(?!(react-router|cookie-es)@)",
    "node_modules/(?!.pnpm|react-router|cookie-es)",
  ],
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.test.{js,jsx}",
    "<rootDir>/src/**/*.test.{js,jsx}",
  ],
  collectCoverageFrom: [
    "src/**/*.{js,jsx}",
    "!src/**/*.test.{js,jsx}",
    "!src/main.jsx",
    "!src/index.jsx",
  ],
};
