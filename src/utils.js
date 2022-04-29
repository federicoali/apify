const Apify = require('apify');

const { log } = Apify.utils;
const googleDomains = require('./google-domains.json');

function checkAndEval(extendOutputFunction) {
    let evaledFunc;
    try {
        // eslint-disable-next-line no-eval
        evaledFunc = eval(extendOutputFunction);
    } catch (e) {
        throw new Error(`extendOutputFunction is not a valid JavaScript! Error: ${e}`);
    }

    if (typeof evaledFunc !== 'function') {
        throw new Error('extendOutputFunction is not a function! Please fix it or use just default output!');
    }

    return evaledFunc;
}

async function applyFunction(page, extendOutputFunction, item) {
    const isObject = (val) => typeof val === 'object' && val !== null && !Array.isArray(val);

    const pageFunctionString = extendOutputFunction.toString();

    const evaluatePageFunction = async (fnString) => {
        const fn = eval(fnString);
        try {
            const result = await fn($);
            return { result };
        } catch (e) {
            return { error: e.toString() };
        }
    };

    await Apify.utils.puppeteer.injectJQuery(page);
    const { result, error } = await page.evaluate(evaluatePageFunction, pageFunctionString);
    if (error) {
        log.info(`extendOutputFunctionfailed. Returning default output. Error: ${error}`);
        return item;
    }

    if (!isObject(result)) {
        log.exception(new Error('extendOutputFunction must return an object!'));
        process.exit(1);
    }

    return { ...item, ...result };
}

// FUNCTION TO DEAL WITH ALL TYPES OF START URLS  (EXTERNAL CSV FILE, LOCAL TXT-FILE, NORMAL URL)
async function* inputUrl(inputUrl, name = 'STARTURLS') {
    const rl = await Apify.openRequestList(name, inputUrl);

    /** @type {Apify.Request | null} */
    let rq;

    // eslint-disable-next-line no-cond-assign
    while ((rq = await rl.fetchNextRequest())) {
        yield rq;
    }
}


module.exports = {
    checkAndEval,
    applyFunction,
    inputUrl,
};
