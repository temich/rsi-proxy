#Representation State Identification Proxy Service

##How to run
Install Redis instance

Configure web-server reverse-proxy (see [example configurations](https://github.com/temich/rsi-proxy/blob/master/misc/)).

Configure proxy settings (config.json)

Make a request

	http://proxy.local//nodejs.org/api/
	
where `proxy.local` is your proxy hostname and `//nodejs.org/api/` is any URI.