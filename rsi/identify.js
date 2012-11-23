var crypto = require('crypto'),
	path = require('path'),
	fs = require('fs'),
	temp = require('temp');

module.exports = function(res, uri, cache, options) {
	var sha = crypto.createHash('sha1'),
		persist = false,
		done = false,
		closed = false,
		tmp = temp.path('rsi-'),
		fd,
		rsi;

	res.pipe(fd = fs.createWriteStream(tmp, { encoding: 'utf-8' }));

	fd.on('close', function() {
		closed = true;
		save();
	});

	res.on('data', function(chunk) {
		sha.update(chunk);
	});

	res.on('end', function() {
		var digest = sha.digest('hex');

		rsi = '/' + digest.substr(0, 2) + '/' + digest.substr(2, 6)
			+ path.extname(uri.pathname);

		fd.end();

		done = true;
		save();
	});

	function save() {
		var file, dir;

		if (!persist || !done || !closed) {
			return;
		}

		console.log(uri.href, ' --> ', rsi);

		file = path.resolve(options['static-path'], '.' + rsi);
		dir = path.dirname(file);

		fs.existsSync(dir) || fs.mkdirSync(dir);
		fs.renameSync(tmp, file);

		cache.set(uri.href, rsi);
	}

	return {
		persist: function() {
			persist = true;
			save();
		}
	};
};
