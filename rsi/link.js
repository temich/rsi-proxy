var http = require('http'),
	url = require('url'),
	path = require('path'),
	async = require('async'),
	Stream = require('memorystream');

var re;

function findLinks(contents, uri, options) {
	var links = [],
		found = {},
		matches,
		link;

	while (matches = re.exec(contents)) {
		link = matches[1];

		var loc = url.resolve('//' + uri.host,  url.resolve(uri.pathname, link)),
			id = url.parse('http:' + loc);

		// TODO: 'local' domain group
		if (id.host !== uri.host) {
			// external linkkeys
			continue;
		}

		if (options['ignore-extensions']
			&& options['ignore-extensions'].indexOf(path.extname(uri.pathname).toLowerCase()) !== -1) {

			continue;
		}

		if (!found[link]) {
			links.push(link);
			found[link] = true;
		}
	}

	return links;
}

/**
 *
 * @param content
 * @param req
 * @param uri
 * @param cache
 * @return {Boolean} are there any links to be processed
 */
function processLinks(links, req, uri, cache) {
	if (links.length === 0) {
		return false;
	}

	async.forEach(links, function(link, next) {
		var path = url.resolve('//' + uri.host,  url.resolve(uri.pathname, link));

		cache.get(path, function(err, value) {
			if (value === null) {
				console.log('request', req.headers.host, path);
				request(req.headers.host, path, next);
			}
		});

	});

	return true;
}

function request(host, path, next) {
	var uri = 'http://' + host + path;

	http.get(uri, function(res) {
		if (Math.floor(res.statusCode/100) !== 2) {
			console.error('Referred resource not found', uri);
		}

		res.on('end', next);
	});
}

module.exports = function(req, res, uri, cache, options, next) {
	var stream = new Stream(null, { readable: false });

	res
		.pipe(stream)
		.on('end', function() {
			var content = stream.toString('utf-8'),
				links = findLinks(content, uri, options),
				incomplete = processLinks(links, req, uri, cache);

			next && next(incomplete);
		});

	re = new RegExp(options['link-regex'], 'gi');
};
