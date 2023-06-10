import cheerio from 'cheerio';

export default (() => {
    const _cleanupString = (str: string) => {
        return str.replace(/\n|\\n/g, '')
            .replace(/ {2,}/g, ' ')
            .trim();
    }

    const parseList = (html: string) => {
        const $ = cheerio.load(html);
        const data = [];

        for (const ad of $('.property-grid > div:has(> div)')) {
            const $ad = $(ad);

            const url = $ad.find('.property-image > a:has(> h2)').attr('href');
            const price = $ad.find('.property-details > h6').text();
            const path = url.match(/(?<=net).*/)[0];
            const pathID = path.match(/(?<=_)\d*/)[0];

            const $propertyDetails = $ad.find('.property-details');
            const size = $propertyDetails.find('> ul > li:has(> img[src$="velikost.svg"])').text();
            const year = $propertyDetails.find('> ul > li:has(> img[src$="leto.svg"])').text();
            const floors = $propertyDetails.find('> ul > li:has(> img[src$="nadstropje.svg"])').text();
            const title = $propertyDetails.find('> a').text();
            const description = $propertyDetails.find('.property-details > span').text();

            data.push({
                url,
                path,
                pathID,
                price,
                size,
                year,
                floors,
                title: _cleanupString(title),
                description: _cleanupString(description),
            });
        }

        return data;
    }

    const hasNextPage = (html: string): boolean => {
        const $ = cheerio.load(html);

        return !!$('#pagination:first-child > ul > li.paging_next').length;
    }

    const adIsValid = (html: string): boolean => {
        const $ = cheerio.load(html);

        return !!$('.cena > span').text().includes('€');
    }

    return {
        adIsValid,
        hasNextPage,
        parseList,
    }
})();
