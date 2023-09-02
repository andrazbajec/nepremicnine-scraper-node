import dayjs from 'dayjs';
import 'dotenv/config';
import DatabaseController from './controllers/DatabaseController';
import SMSController from './controllers/SMSController';
import { delay, log } from './helpers/GeneralHelper';
import { getObjectKeyValues } from './helpers/ArrayHelper';
import MailController from './controllers/MailController';
import Puppeteer from "./controllers/PuppeteerController";
import Parser_v1 from "./parsers/Parser_v1";
import PageHelper from "./helpers/PageHelper";

(async function () {
    const db = DatabaseController();
    const dbError = await db.testConnection();
    const smsController = SMSController();
    const mailController = MailController();

    if (dbError) {
        log(`:red:A database error has occurred :yellow:${dbError}`);
        return;
    }

    const parsePage = async (path: string, mainUrl: string, page: number = 1) => {
        let url = `https://www.nepremicnine.net${path}`;
        let ads = [];
        const adTypeRegex = new RegExp(/(?<=\.net\/)[^\/]*(?=\/)/, 'g');
        const adType = mainUrl.match(adTypeRegex)[0];

        if (page > 1) {
            url += `${page}/`;
        }

        log(`:yellow:Parsing URL: :green:"${url}"`);

        const {
            browserPage,
            closeBrowserPage,
        } = await Puppeteer.getBrowserPage();

        let tries: number = 0;
        let success: boolean = false;
        let html: string;

        do {
            try {
                log(`:yellow:Try #${++tries} of parsing page`);

                await browserPage.goto(url);
                html = await browserPage.content();
                success = true;
            } catch(error) {
                if (tries > 3) {
                    throw error;
                }
            }
        } while (!success);

        if (html.includes('Checking if the site connection is secure')) {
            await PageHelper.handleBlocked(browserPage);
        }

        await closeBrowserPage();

        ads = [...ads, ...Parser_v1.parseList(html)];

        if (Parser_v1.hasNextPage(html)) {
            log(':green:Parsing next page!');

            await delay(+process.env.DELAY_PAGE_SWITCH);

            const nextPageAds = await parsePage(path, mainUrl, page + 1);

            ads = [...ads, ...nextPageAds];
        }

        return ads;
    }

    const writeAdsToDb = (ads) => {
        db.insert('Ad', ads, { capitalizeFirst: true });
    }

    const updateAds = async (ads: Array<string>) => {
        await db.update('Ad', { DateLastSeen: dayjs().format('YYYY-MM-DD HH:mm:ss') }, {
            PathID: {
                type: 'in',
                values: ads
            }
        })
    }

    const sendNewAdsNotification = (ads: Array<string>) => {
        const message = `New ads:\n${ads.join('\n')}`;

        log(`:yellow:SENDING MESSAGE::green: ${message}`);
        smsController.sendSMS(message)
            ?.catch(message => log(`:red:SMS send failed: ${message}`));
        mailController.sendMail(message);
    }

    const validateAds = async (ads: Array<any>) => {
        const validatedAds = [];

        for (const ad of ads) {
            await delay(+process.env.DELAY_AD_VALIDATION);
            log(`:yellow:Validating ad::green: ${ad.url}`);

            const {
                browserPage,
                closeBrowserPage,
            } = await Puppeteer.getBrowserPage();

            let tries = 0;
            let success = false;
            let html: string;

            do {
                try {
                    log(`:yellow:Try #${++tries} of validating ad`);

                    await browserPage.goto(ad.url);
                    html = await browserPage.content();
                    success = true;
                } catch(error) {
                    if (tries > 3) {
                        throw error;
                    }
                }
            } while (!success);

            if (html.includes('Checking if the site connection is secure')) {
                await PageHelper.handleBlocked(browserPage);
            }

            await closeBrowserPage();

            if (Parser_v1.adIsValid(html)) {
                validatedAds.push(ad);

                log(':green:Ad was valid!');
            } else {
                log(':red:Ad was invalid!');
            }
        }

        return ads;

        return validatedAds;
    }

    const parse = async (url: string) => {
        const ads = await parsePage(url.replace(/.*nepremicnine\.net/, ''), url);

        const dbPaths = (await db.select('Ad', ['PathID'], {
            PathID: {
                type: 'in',
                values: getObjectKeyValues(ads, 'pathID'),
            }
            // @ts-ignore
        }))?.results?.map(result => result.PathID);

        const updateAdIDs = [];
        const insertAds = [];
        let adLimit = 5;

        for (const ad of ads) {
            if (!adLimit) {
                continue;
            }

            if (dbPaths.includes(+ad.pathID)) {
                updateAdIDs.push(ad.pathID);
                continue;
            }

            insertAds.push(ad);

            adLimit++;
        }

        insertAds.length
            ? log(`:magenta:Validating ${insertAds.length} ads!`)
            : log(`:magenta:No new ads found!`);

        const validatedInsertAds = await validateAds(insertAds);

        if (validatedInsertAds.length) {
            writeAdsToDb(validatedInsertAds);
            sendNewAdsNotification(validatedInsertAds.map(ad => ad.url));
        }

        if (updateAdIDs.length) {
            await updateAds(updateAdIDs);
        }
    }

    const urls = process.env.URLS.split(';');

    try {
        const crawlingDelay = (+process.env.DELAY_RECRAWL_MIN) * 1000 * 60;
        const siteCrawlingDelay = 1000 * 30

        while (true) {
            let counter = 0;

            for (const url of urls) {
                log(`:magenta:Started crawling ${url}!`);
                await parse(url);

                if (++counter !== urls.length) {
                    log(`:magenta:Waiting for ${siteCrawlingDelay / 1000} seconds before starting crawl on next site!`);
                    await delay(siteCrawlingDelay);
                }
            }

            log(':magenta:Stopped crawling!');
            log(`:magenta:Waiting for ${process.env.DELAY_RECRAWL_MIN} minutes!`);
            await delay(crawlingDelay);
        }
    } catch (e) {
        let counter = 0;
        let smsSent = false;
        const smsDelay = (+process.env.DELAY_RESEND_SMS_MIN) * 1000 * 60;

        while (counter++ < 5) {
            log(`:red:Crawler died, attempt ${counter} of sending SMS! (${e.message})`);

            try {
                try {
                    await smsController.sendSMS('The crawler has died unexpectedly!');
                } catch ({ message }) {
                    log(`:red:SMS send failed: ${message}`);
                }
                log(':green:The SMS has been sent!');
                smsSent = true;
                break;
            } catch (e) {
                await delay(smsDelay);
            }
        }

        if (!smsSent) {
            log(':red:SMS could not be sent!');
        }

        console.error(e);

        process.exit();
    }
})();
