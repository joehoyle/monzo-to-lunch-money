# Monzo Bank to Lunch Money Importer

This is a working progress / prototype for importing transactions from Monzo bank into [Lunch Money](https://lunchmoney.app/). Because Lunch Money's Plaid integration does not support Monzo Bank due, this project provides a transaction synchronizer to push all bank account transactions to a given Lunch Money asset.

Note: This project is experimental and provided without warrenty. Use at your own risk!

## Setup

This project uses [Serverless](https://serverless.com/) to create the necessary cloud infrastructure in AWS. This essentially entails a DynamoDB table to store the Monzo access token, an API Gateway resource and a Lambda function.

At this stage, the project has no UI, and authentication not added, so it's recommended to add your own auth to the APIGateway or via other means.

1. Create a Monzo developer application at https://developers.monzo.com/. You'll need your Monzo App Client ID and Client Secret.
1. Use the API Playground at https://developers.monzo.com/ to list your accounts, and copy the account ID you want to sync to Lunch Money
1. Find the asset ID of your Lunch Money account you want to import into. You can grab this from Lunch Money's URL when you filter transactions by the account, e.g. `https://my.lunchmoney.app/transactions/2020/03?asset=1234` (asset ID is `1234`).
1. Provision Serverless with the following environment variables present: `LUNCHMONEY_ASSET_ID`, `LUNCHMONEY_TOKEN`, `MONZO_CLIENT_ID`, `MONZO_CLIENT_SECRET`. E.g.:

```
LUNCHMONEY_ASSET_ID=1234 \
LUNCHMONEY_TOKEN=123456789wertyuiopasdfghjk \
MONZO_CLIENT_ID=oauth2client_XXXXXXXXXXXXXXX \
MONZO_CLIENT_SECRET='mnzconf.XXXXXXXXX' \
serverless deploy
```

Once the Serverless infrastructure is provisioned, follow these steps:

1. Visit `https://$YOUR_SERVERLESS_APP_URL/monzo/authorize` in your browser. This will redirect to Monzo to handle authentication. Once you have completed this, your browser should be redirected to `/monzo-authorize-callback` where you should see a "Saved" message, indicating the access token has been stored in the DynamoDB table.

1. Run `curl -X Post https://$YOUR_SERVERLESS_APP_URL/monzo/webhook` to register a webhook with your Monzo account. This will cause all transactions for the given Monzo account number to be sent to your instance of this application.

Transactions will now appear in Monzo as soon as they clear your bank account!
