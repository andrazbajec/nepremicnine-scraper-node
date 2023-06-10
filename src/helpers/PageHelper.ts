import { delay, log } from "./GeneralHelper";
import MailController from "../controllers/MailController";
import { Page } from "puppeteer-core";

export default (() => {
    const mailController = MailController();

    const handleBlocked = async (browserPage: Page) => {
        await delay(5000);

        const iframeHandle = await browserPage.$('iframe');
        const frame = await iframeHandle.contentFrame();
        await frame.waitForSelector('input[type="checkbox"]');
        await frame.click('input[type="checkbox"]');

        log(':red:Crawler was blocked!');
        mailController.sendMail('Crawler was blocked!');
    }

    return {
        handleBlocked,
    }
})();
