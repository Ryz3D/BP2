module.exports = function override(config, env) {
    return {
        ...config,
        resolve: {
            ...config.resolve,
            fallback: {
                ...config.resolve.fallback,
                "crypto": require.resolve("crypto-browserify"),
                "stream": require.resolve("stream-browserify"),
            },
        },
    };
}
