import puppeteer from "puppeteer-core";

export default (() => {
    let browserInstance;

    const Browser = async () => {
        return await puppeteer.launch({
            defaultViewport: null,
            executablePath: process.env.BROWSER_PATH,
            headless: true,
        });
    }

    const getBrowserInstance = async () => {
        if (!browserInstance || true) {
            browserInstance = await Browser();
        }

        return browserInstance;
    };

    const getBrowserPage = async() => {
        const browserInstance = await getBrowserInstance();
        const browserPage = await browserInstance.newPage();

        await browserPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36')
        await browserPage.setJavaScriptEnabled(true);

        const closeBrowserPage = () => {
            browserInstance.close();
        }

        return {
            browserPage,
            closeBrowserPage,
        };
    }

    return {
        getBrowserInstance,
        getBrowserPage,
    };
})();
