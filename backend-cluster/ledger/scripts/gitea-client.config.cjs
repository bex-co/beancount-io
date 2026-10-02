module.exports = {
  hooks: {
    onInsertPathParam: (name) =>
      ["owner", "repo", "repoName"].includes(name)
        ? `encodeURIComponent(${name})`
        : name,
  },
};
