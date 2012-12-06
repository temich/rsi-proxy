var domain = require('domain'),
	fs = require('fs'),
	redis = require('redis'),
	connect = require('connect'),
	rsi = require('rsi'),
	config = require('./config.json'),
	logger = require('tracer').dailyfile(config.tracer);

var appd = domain.create(),
	cache = redis.createClient(config.redis.port, config.redis.host);

appd.on('error', function(err) {
	logger.error(err);
	console.error(err);
	appd.dispose();
	cache.end();
	process.exit(1);
});

appd.add(cache);

cache.on('ready', function() {
	if (config.redis.db) {
		cache.select(config.redis.db);
	}

	logger.info('Redis connected to ' + config.redis.host + ':' + config.redis.port + (config.redis.db ? '[' + config.redis.db + ']' : ''));
});

appd.run(function() {

	// Create cache directory if required
	if (config.rsi.cache
		&& !config.rsi.cache.disabled
		&& !fs.existsSync(config.rsi.cache.root)) {

		fs.mkdir(config.rsi.cache.root);
        logger.info('Cache directory created ' + config.rsi.cache.root);
	}

	// Ensure log directory exists
	if (!fs.existsSync(config.tracer.root)) {
        fs.mkdirSync(config.tracer.root);
        logger.info('Log directory created ' + config.tracer.root);
    }

	var port = process.env.PORT || config.port;

    connect()
		.use(rsi.proxy(cache, config.rsi, logger))
		.listen(port);

	logger.info('Server started on port ' + port);
});



