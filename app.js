var domain = require('domain'),
	fs = require('fs'),
	redis = require('redis'),
	connect = require('connect'),
	rsi = require('rsi'),
	config = require('./config.json');

var appd = domain.create(),
	cache = redis.createClient(config.redis.port, config.redis.host);

appd.on('error', function(err) {
	// TODO: logger
	console.error('Error:', err);
	appd.dispose();
	cache.end();
	process.exit(1);
});

appd.add(cache);

cache.on('ready', function() {
	if (config.redis.db) {
		cache.select(config.redis.db);
	}

	console.log('Redis connected to ' + config.redis.host + ':' + config.redis.port + (config.redis.db ? '[' + config.redis.db + ']' : ''));
});

appd.run(function() {

	fs.mkdir(config.rsi.cache.root);

	connect()
		.use(rsi.filter(cache, config.rsi))
		.use(rsi.proxy(cache, config.rsi))
		.listen(config.port);

	console.log('Server started on port ' + config.port);
});



