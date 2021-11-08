module.exports = {
    entry: {
        main: './src/app.ts',
        background: './src/background.ts'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.json', '.wasm']
    },
    output: {
        path: __dirname,
        filename: '[name].bundle.js'
    },
    devtool: 'source-map',
    mode: 'development'
};