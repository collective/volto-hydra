export default async function ploneApi({path, variables = {}}) {
    // a unique key to ensure that data fetching
    // can be properly de-duplicated across requests,
    const key = JSON.stringify({
        path,
        variables
    });



    var headers = {};
    // if (window.location) {
    //     const url = new URL(window.location.href);
    //     const token = url.searchParams.get("access_token");
    //     if (token) {
    //         headers = {'Authorization': 'Bearer '+token};
    //     };
    // }
    const api = `https://hydra-api.pretagov.com/++api++/${path?.join?path.join('/'):path}?expand=breadcrumbs,navroot,navigation&expand.navigation.depth=2`

    return useFetch(api, {
        key,
        method: 'GET',
        headers: headers,
        // body: {
        //     query,
        //     variables,
        // },
        transform: (data) => {
            // if (error) {
            //     throw new error;
            // }

            return data;
        },
    });
};