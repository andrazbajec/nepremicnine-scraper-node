# Nepremicnine.net scraper

Web scraper for nepremicnine.net

## Setup

1. Install Node 16+.
2. Run `npm install`.
3. Copy the file `.env.dist` to `.env`.
4. Go to [sms api](https://www.smsapi.si/), create an account, purchase tokens and insert them into the `.env` file under the `SMSAPI section`.
5. Go under [Google App passwords](https://myaccount.google.com/apppasswords) and create a new app. After done, insert the credentials into the `.env` file under the `Mailer section`. **Note:** you have to have 2FA enabled on your Google
   account for this functionality to be enabled.
6. Add URLs you wish to scrape under `URLS` in the `.env` file, separated with a semicolon `;`.
7. Add the path to the browser you with to use for crawling on your computer under `BROWSER_PATH` inside the `.env` file.
8. Enter the credentials to the MariaDB database under the `Database section` inside the `.env` file.
9. Run `npm run transpile` to transpile TypeScript code to JavaScript
10. Run `npm start` to start the crawler

## Info

### Logs

If you encounter any errors, you can open an issue on [GitHub](https://github.com/andrazbajec/nepremicnine-scraper-node), or check the `logs` folder to find the cause of the issue.
