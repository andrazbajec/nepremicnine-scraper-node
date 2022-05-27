import axios from 'axios';
import cheerio from 'cheerio';
import dayjs from 'dayjs';
import 'dotenv/config';
import DatabaseController from './controllers/DatabaseController';
import SMSController from './controllers/SMSController';
import { delay, log } from './helpers/GeneralHelper';
import { getObjectKeyValues } from './helpers/ArrayHelper';
import MailController from './controllers/MailController';

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
        const ads = [];

        if (page > 1) {
            url += `${page}/`;
        }

        const response = await axios.get(url);

        if (response.status !== 200) {
            console.error('Invalid response received from server!', response);
            return;
        }

        const $ = cheerio.load(response.data);
        const adTypeRegex = new RegExp(/(?<=\.net\/)[^\/]*(?=\/)/, 'g');
        const adType = mainUrl.match(adTypeRegex)[0];

        for (const element of $('div.seznam > div.oglas_container')) {
            const ad = $(element);
            const price = ad.find('span.cena').text();
            const size = ad.find('span.velikost').text();

            const path = ad.find('a.slika')
                .attr('href')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace('¡', 'i');

            const title = ad.find('span.title').text();
            const url = `https://www.nepremicnine.net${path}`;
            const pathID = path.match(/(?<=_)\d*(?=\/$)/)[0];

            if (!adType || (adType !== url.match(adTypeRegex)[0] ?? null)) {
                continue;
            }

            ads.push({ title, price, size, path, url, pathID });

            log(`:green:Ad found: :yellow:${title}, ${price}, ${size}, ${path}`);
        }

        if ($('#pagination:first-child > ul > li.paging_next').length) {
            log(':green:Parsing next page!');
            await delay(+process.env.DELAY_PAGE_SWITCH);

            const nextPageAds = await parsePage(path, mainUrl, page + 1);

            for (const nextPageAd of nextPageAds) {
                ads.push(nextPageAd);
            }
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
        smsController.sendSMS(message);
        mailController.sendMail(message);
    }

    const validateAds = async (ads: Array<any>) => {
        const validatedAds = [];

        for (const ad of ads) {
            log(`:yellow:Validating ad::green: ${ad.url}`);
            const response = await axios.get(ad.url);

            if (response.status !== 200) {
                console.error('Invalid response received from server!', response);
                continue;
            }

            const $ = cheerio.load(response.data);

            if ($('div.cena:contains(€)').length) {
                validatedAds.push(ad);

                await delay(+process.env.DELAY_AD_VALIDATION);
                log(':green:Ad was valid!');
            } else {
                log(':red:Ad was invalid!');
            }
        }

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
    let counter = 0;

    try {
        const crawlingDelay = (+process.env.DELAY_RECRAWL_MIN) * 1000 * 60;

        while (true) {
            const url = urls[counter++];
            log(`:magenta:Started crawling ${url}!`);
            await parse(url);

            if (counter === urls.length) {
                counter = 0;
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
            log(`:red:Crawler died, attempt ${counter} of sending SMS!`);

            try {
                await smsController.sendSMS('The crawler has died unexpectedly!');
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
