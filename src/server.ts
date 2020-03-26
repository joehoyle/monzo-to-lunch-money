import app from './http';
import localtunnel from 'localtunnel';

async function listen() {
	app.listen( 3000 );
	try {
		const tunnel = await localtunnel({
			subdomain: 'joehoyle-monzo-lunchmoney',
			port: 3000,
		});
		console.log( `Listening at ${ tunnel.url }`)
		process.env.URL = tunnel.url;
	} catch ( e ) {
		console.error( e );
	}

}

listen();
