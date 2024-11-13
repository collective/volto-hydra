

export default async function ploneApi({path, query = null, watch=[], _default={}, pages={}}) {

    var headers = {
        "Accept": "application/json"
    };
    if (window?.location) {
        const url = new URL(window.location.href);
        const token = url.searchParams.get("access_token");
        if (token) {
            headers['Authorization'] = 'Bearer '+token;
        };
    }
    var api = path?.join?path.join('/'):path;
    if (!api.startsWith("http")) {
        api = `https://hydra-api.pretagov.com/++api++/${api}`
    }
    if (!query) {
        api = `${api}?expand=breadcrumbs,navroot,navigation&expand.navigation.depth=2`
    }
    else {
        headers["Content-Type"] = "application/json";
    }
    // https://demo.plone.org/++api++/block/grid-block/listing/@querystring-search
    // {
    //     "metadata_fields": "_all",
    //     "b_size": 25,
    //     "limit": "7",
    //     "query": [
    //         {
    //             "i": "path",
    //             "o": "plone.app.querystring.operation.string.absolutePath",
    //             "v": "/block/grid-block"
    //         }
    //     ],
    //     "sort_order": "ascending",
    //     "b_start": 0
    // }
    // a unique key to ensure that data fetching
    // can be properly de-duplicated across requests,
    const key = JSON.stringify({
        path,
        query,
        headers
    });

    return useFetch(api, {
        key,
        method: query? 'POST': 'GET',
        headers: headers,
        body: query,
        cache: "no-cache",  // we probably don't need it
        watch: watch,
        default: () => { return _default;},
        onResponseError({ request, response, options }) {
            const error = response._data;
            showError({
                statusCode: response.status,
                statusMessage: `${error.type}: ${error.message}`
            });
            return {title:response.statusText, "@components": {navigation: {items: []}}};
        },
        transform: (data) => {
            // if (error!==undefined  ) {
            //     showError(error);
            //        // throw new error;
            //     return {title:"Error"};
            // }
            
            data["_listing_pages"] = pages;
            if (query) {
                return data;
            } else {
                const comp =  data['@components'];
                delete data['@components'];
                return {
                    page: data,
                    _listing_pages: pages, 
                    navigation: comp.navigation,
                    breadcrumbs: comp.breadcrumbs
                }
            }
        },
    });
};

