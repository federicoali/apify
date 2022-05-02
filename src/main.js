const Apify = require('apify');

const routes = require('./routes');
const { checkAndEval, inputUrl } = require('./utils');

const { log } = Apify.utils;

Apify.main(async () => {
    const input = await Apify.getValue('INPUT');

    // Validate the input
    if (!input) throw new Error('Missing configuration');

    const { inputUrl, maxPostCount, extendOutputFunction } = input;

    new Apify.Request(input);

    const requestList = Apify.openRequestList('url', input);

    const requestQueue = await Apify.openRequestQueue();

    // Prepare the initial list of google shopping queries and request queue
    console.log(inputUrl);
    console.log(requestList);

    // if exists, evaluate extendOutputFunction
    let evaledFunc;
    if (extendOutputFunction) evaledFunc = checkAndEval(extendOutputFunction);

    const proxyConfiguration = await Apify.createProxyConfiguration({
        groups: ['GOOGLE_SERP'],
    });

    // crawler config
    const crawler = new Apify.PuppeteerCrawler({
        requestList,
        requestQueue,
        useSessionPool: true,
        persistCookiesPerSession: true,
        maxRequestRetries: 15,
        navigationTimeoutSecs: 150,
        handlePageTimeoutSecs: 240,
        maxConcurrency: 10,
        proxyConfiguration,
        handlePageFunction: async ({ page, request }) => {
            log.info(`Processing: ${request.inputUrl}`);
            log.info(`Number of page: ${request.userData.pageNumber}`);
            const { label, query } = request.userData;
            return routes[label](page, request, query, requestQueue, maxPostCount, evaledFunc);
        },

        handleFailedRequestFunction: async ({ request }) => {
            log.warning(`Request ${request.inputUrl} failed too many times`);

            await Apify.pushData({
                '#debug': Apify.utils.createRequestDebugInfo(request),
            });
        },
    });

    log.info('Starting crawler.');
    await crawler.run();

    log.info('Crawler Finished.');
});
