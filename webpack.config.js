const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );

// Resolve @extrachill/chat to TypeScript source (no dist/ in git-installed package).
const chatPackageSrc = path.resolve(
	__dirname,
	'node_modules/@extrachill/chat/src'
);

module.exports = {
	...defaultConfig,
	entry: {
		'diff-block': './src/diff/index.ts',
		'editor-sidebar': './src/sidebar/index.tsx',
	},
	output: {
		path: path.resolve( __dirname, 'build' ),
		filename: '[name].js',
	},
	resolve: {
		...defaultConfig.resolve,
		extensions: [ '.ts', '.tsx', '.js', '.jsx' ],
		alias: {
			...( defaultConfig.resolve?.alias || {} ),
			'@extrachill/chat/css': path.resolve(
				__dirname,
				'node_modules/@extrachill/chat/css/chat.css'
			),
			'@extrachill/chat': chatPackageSrc + '/index.ts',
		},
	},
	module: {
		...defaultConfig.module,
		rules: [
			...( defaultConfig.module?.rules || [] ),
			// TypeScript support for @extrachill/chat source files.
			{
				test: /\.tsx?$/,
				include: [ chatPackageSrc ],
				use: [
					{
						loader: require.resolve( 'babel-loader' ),
						options: {
							presets: [
								'@babel/preset-typescript',
								[ '@babel/preset-react', { runtime: 'automatic' } ],
							],
						},
					},
				],
			},
		],
	},
};
