var domain = require('domain'),
	redis = require('redis'),
	connect = require('connect'),
	rsi = require('./rsi'),
	config = require('./config.json'),
	fs = require('fs');

var appDomain = domain.create(),
	cache = redis.createClient(config.redis.port, config.redis.host);

appDomain.on('error', function(err) {
	console.error('appDomain error:', err);
	appDomain.dispose();
	cache.end();
	process.exit(1);
});

appDomain.add(cache);

cache.on('ready', function() {
	if (config.redis.db) {
		cache.select(config.redis.db);
	}

	console.log('Redis connected to ' + config.redis.host + ':' + config.redis.port + (config.redis.db ? '[' + config.redis.db + ']' : ''));
});

function proxy(req, res, next) {
	var reqd = domain.create();

	reqd.add(req);
	reqd.add(res);

	reqd.on('error', function(err) {
		console.error('Error: ', err, req.url);

		try {
			res.writeHead(500);
			res.end();
			res.on('close', reqd.dispose);
		} catch (e) {
			console.error('Error sending error: ', e);
			reqd.dispose();
		}
	});

	rsi.proxy(req, res, cache, config.rsi);
}

appDomain.run(function() {

	fs.mkdir(config.rsi['static-path']);

	connect()
		.use(rsi.filter(cache, config.rsi))
		.use(proxy)
		.listen(config.port);

	console.log('Server started on port ' + config.port);
});



