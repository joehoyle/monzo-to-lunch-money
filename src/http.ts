import Monzo, { AccessToken, Transaction as MonzoTransaction, TransactionCreatedEvent } from './monzo'
import { DynamoDB } from 'aws-sdk'
import express from 'express';
import bodyParser from 'body-parser';
import LunchMoney, { DraftTransaction as LunchMoneyDraftTransaction} from 'lunch-money';

const monzo = new Monzo( {
	clientId: process.env.MONZO_CLIENT_ID as string,
	clientSecret: process.env.MONZO_CLIENT_SECRET as string,
	redirectUri: `${ process.env.URL && process.env.URL.trim() }/monzo-authorize-callback`,
} );

const lunchMoney = new LunchMoney( { token: process.env.LUNCHMONEY_TOKEN as string } );

async function getMonzo() : Promise<Monzo> {
	const dynamoDb = new DynamoDB.DocumentClient();
	const response = await dynamoDb.get({
		TableName: process.env.DYNAMODB_TABLE as string,
		Key: {
			id: 'accessToken',
		}
	}).promise();

	if ( ! response.Item ) {
		throw new Error( 'No item found.' );
	}

	const monzo = new Monzo( {
		clientId: process.env.MONZO_CLIENT_ID as string,
		clientSecret: process.env.MONZO_CLIENT_SECRET as string,
		redirectUri: `${ process.env.URL && process.env.URL.trim() }/monzo-authorize-callback`,
	} );

	monzo.accessToken = JSON.parse( response.Item.data ).access_token;

	return monzo;
}

const app = express();
app.use( bodyParser.json() )

app.post( '/webhook', async ( req, res ) => {
	console.log( req.body );
	const event = req.body as TransactionCreatedEvent;
	if ( event.data.decline_reason ) {
		console.log( 'Declined transaction, skipping...' );
		return;
	}
	try {
		await lunchMoney.createTransactions( [ getLunchMoneyTransactionForMonzoTransaction( event.data ) ], true, true, true )
		res.send( 'OK.' );
	} catch ( e ) {
		console.error( e );
		res.send( e );
		res.status( 500 );
	}
} );

function getLunchMoneyTransactionForMonzoTransaction( transaction: MonzoTransaction ) : LunchMoneyDraftTransaction {
	let notes = '';
	if ( transaction.notes ) {
		notes += ' ' + transaction.notes;
	}
	if ( transaction.merchant && typeof transaction.merchant === 'object' ) {
		notes += ' ' + transaction.merchant.name;
	}
	return {
		date: transaction.created,
		payee: transaction.description,
		amount: `${ transaction.amount / 100 }`,
		currency: transaction.currency.toLowerCase(),
		notes,
		asset_id: Number( process.env.LUNCHMONEY_ASSET_ID ),
		status: "uncleared",
		external_id: transaction.id,
	}
}

app.post( '/monzo/webhook', async ( req, res ) => {
	const monzo = await getMonzo();

	try {
		const webhook = await monzo.createWebhook(
			req.body.account_id,
			`${ process.env.URL && process.env.URL.trim() }/webhook`,
		);
		res.send( webhook );
	} catch( e ) {
		res.status( 500 );
		res.send( e.message );
	}
} );

app.get( '/monzo/authorize', async ( req, res ) => {
	res.redirect( monzo.getAuthorizeUri() );
} );

app.get( '/monzo-authorize-callback', async ( req, res ) => {
	try {
		const code = req.query.code;
		if ( ! code ) {
			res.status( 400 );
			res.send( 'No code found.' );
		}

		const accessToken = await monzo.getAccessToken( code );
		const dynamoDb = new DynamoDB.DocumentClient();

		const params = {
			TableName: process.env.DYNAMODB_TABLE as string,
			Item: {
				id: 'accessToken',
				data: JSON.stringify( accessToken ),
			}
		};
		// delete token if already there.
		try {
			await getMonzo();
			await dynamoDb.delete({
				TableName: process.env.DYNAMODB_TABLE as string,
				Key: {
					id: 'accessToken',
				}
			}).promise();
		} catch( e ) {
			console.log( e )
		}
		dynamoDb.put(params, (error) => {
			// handle potential errors
			if (error) {
				throw error;
			}
			res.send( 'Saved' );
		} );
	} catch ( e ) {
		console.log( e )
		res.send( e );
	}
} );

export default app;
