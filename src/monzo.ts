import fetch from 'isomorphic-fetch';

const base = 'https://api.monzo.com';

export interface Account {
	id: string,
	description: string,
	created: string,
}

export interface Transaction {
	account_balance: number,
	amount: number,
	created: string,
	currency: string,
	description: string,
	id: string,
	notes: string,
	decline_reason?: string,
	merchant?: Merchant | string,
}

export interface TransactionCreatedEvent {
	type: 'transaction.created',
	data: Transaction,
}

export interface AccessToken {
	access_token: string,
	client_id: string,
	expires_in: number,
	refresh_token: string,
	token_type: string,
	user_id: string,
}

export interface Webhook {
	account_id: string,
	id: string,
	url: string,
}

export interface Merchant {
	id: string,
	group_id: string,
	created: string,
	name: string,
	logo: string,
	emoji: string,
	category: string,
	online: boolean,
	atm: boolean,
	address: object,
	updated: string,
	metadata: object,
	disable_feedback: boolean,
}

interface EndpointArguments {
	[s: string]: any,
}

export default class Monzo {
	clientId: string;
	redirectUri: string;
	clientSecret: string;
	accessToken?: string;
	constructor( args: { clientId: string, clientSecret: string, redirectUri: string } ) {
		this.clientId = args.clientId;
		this.redirectUri = args.redirectUri;
		this.clientSecret = args.clientSecret;
	}

	async get( endpoint: string, args?: EndpointArguments ) {
		return this.request( 'GET', endpoint, args );
	}

	async post( endpoint: string, args?: EndpointArguments ) {
		return this.request( 'POST', endpoint, args );
	}

	async request( method: "GET" | "POST" | "PUT" | "DELETE", endpoint: string, args?: EndpointArguments ) {
		let url = `${ base }${ endpoint }`;
		if ( method === 'GET' && args ) {
			url += '?' + Object.entries( args ).map( ( [ key, value ] ) => `${ key }=${ value }` )
		}
		const options: RequestInit = {
			headers: {
				Accept: '*/*'
			},
			method,
		};

		if ( this.accessToken ) {
			options.headers['Authorization'] = `Bearer ${ this.accessToken }`;
		}

		if ( ( method === 'POST' || method === 'PUT' ) && args ) {
			if ( args instanceof URLSearchParams ) {
				options.body = args;
			} else {
				const formData = new URLSearchParams();
				Object.entries( args ).map( ( [key, value] ) => {
					formData.set( key, value );
				} );
				options.body = formData;
				options.headers['Content-Type'] = 'application/json';
			}
			options.headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
		}
		console.log( options );
		const response = await fetch( url, options );
		console.log( response.status )
		//console.log( response )
		if ( response.status > 399 ) {
			const r = await response.text();
			console.log( r )
		} else {
			return response.json();
		}
	}

	async getAccounts() : Promise<Account[]> {
		return this.get( '/accounts' );
	}

	async getTransactions( accountId: string ) : Promise<Transaction> {
		return this.get( '/transactions', {
			account_id: accountId,
		} );
	}

	async createWebhook( accountId: string, webhookUrl: string ) : Promise<Webhook> {
		return this.post( '/webhooks', {
			account_id: accountId,
			url: webhookUrl,
		} ).then( response => response.webhook );
	}

	getAuthorizeUri() {
		return `https://auth.monzo.com/?client_id=${ this.clientId }&redirect_uri=${ this.redirectUri }&response_type=code&state=dwdwdwdd`;
	}

	async getAccessToken( code: string ) : Promise<AccessToken> {
		const formData = new URLSearchParams();
		formData.set("grant_type", "authorization_code");
		formData.set("client_id", this.clientId);
		formData.set("client_secret", this.clientSecret);
		formData.set("redirect_uri", this.redirectUri);
		formData.set("code", code);
		return this.post( '/oauth2/token', formData );
	}

	async refreshAccessToken( refreshToken: string ) : Promise<AccessToken> {
		const formData = new URLSearchParams();
		formData.set("grant_type", "refresh_token");
		formData.set("client_id", this.clientId);
		formData.set("client_secret", this.clientSecret);
		formData.set("refresh_token", refreshToken);
		return this.post( '/oauth2/token', formData );
	}
}

