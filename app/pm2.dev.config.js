module.exports = {
	apps: [
		{
			name: 'apiback',
			script: 'apiback.js',
			instances: 2,
			exec_mode: 'cluster',
			autorestart: true,
			watch: [
				'apiback.js',
				'config.js',
				'Guarantee.js',
				'Emails.js',
				'Utils.js',
				'content',
				'controllers',
				'queries',
				'service'
			],
			watch_options: {
				usePolling: true
			},
			env: {
				VERSION: '1.0.0',
				PORT: 3000,
				NODE_ENV: 'development',
				SESSION_SECRET: '<ysCw&^3AJ!58L,~'
			}
		}
	]
};
