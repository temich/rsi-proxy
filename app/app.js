var cluster = require('cluster'),
    domain = require('domain'),
    os = require('os'),
	fs = require('fs'),
	redis = require('redis'),
	connect = require('connect'),
	rsi = require('rsi'),
	config = require('./config.json'),
	logger = require('tracer').dailyfile(config.tracer);

// Ensure log directory exists
if (!fs.existsSync(config.tracer.root)) {
    fs.mkdirSync(config.tracer.root);
    logger.info('Log directory created ' + config.tracer.root);
}

if (cluster.isMaster) {

    var procs = config.procs || os.cpus().length;

    logger.info('Forking ' + procs + ' workers');

    while (procs--) {
        cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
        logger.error('Worker ' + worker.id + ' died (code: ' + code + ', signal: ' + signal + '). Restarting...');
        cluster.fork();
    });

    cluster.on('online', function(worker) {
        logger.info('Worker ' + worker.id + ' online');
    });

    cluster.on('listening', function(worker, address) {
        logger.info('Worker ' + worker.id + ' connected to ' + address.address + ':' + address.port);
    });

} else {

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

        logger.info('Redis (worker:' + cluster.worker.id + ') connected to ' + config.redis.host + ':' + config.redis.port + (config.redis.db ? '[' + config.redis.db + ']' : ''));
    });

    appd.run(function() {

        // Create cache directory if required
        if (config.rsi.cache
            && !config.rsi.cache.disabled
            && !fs.existsSync(config.rsi.cache.root)) {

            fs.mkdir(config.rsi.cache.root);
            logger.info('Cache directory created ' + config.rsi.cache.root);
        }

        var port = process.env.PORT || config.port;

        connect()
            .use(rsi.proxy(cache, config.rsi, logger))
            .listen(port);

        logger.info('Worker ' + cluster.worker.id + ' starting on port ' + port);
    });

}
