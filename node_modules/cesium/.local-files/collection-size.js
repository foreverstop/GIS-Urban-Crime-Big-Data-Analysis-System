import { defined, Resource } from "@cesium/engine";
import { readFileSync, writeFileSync } from "fs";

// Finland API:
// Check out https://www.maanmittauslaitos.fi/en/rajapinnat/api-avaimen-ohje
// TODO: The total items seems to be in the `Content-Length` header instead of `numMatched` neither are in the spec
// TODO: The pagination is _only_ done using the `next` link, it does _not_ support `offset`
// TODO: The `f` query param is not supported, not standard either but will break this APi
const finlandApiKey = "51cc1662-dc71-458e-9df3-c3d421bf18ed";
const finlandGeoNamesProvider = {
  id: "finland-places",
  name: "Finland Geo Names (Points)",
  baseUrl:
    "https://avoin-paikkatieto.maanmittauslaitos.fi/geographic-names/features/v1",
  queryParameters: {
    "api-key": finlandApiKey,
  },
};
const finlandTopographyProvider = {
  id: "finland-topo",
  name: "Finland Topography (Points, Lines, Areas)",
  baseUrl:
    "https://avoin-paikkatieto.maanmittauslaitos.fi/maastotiedot/features/v1",
  queryParameters: {
    "api-key": finlandApiKey,
  },
};

// ldproxy API:
const strassenProvider = {
  id: "strassen",
  name: "Strassen - German Roads (Points, Lines)",
  baseUrl: "https://demo.ldproxy.net/strassen",
  queryParameters: {
    f: "json",
  },
};
const vinyardProvider = {
  id: "vinyard",
  name: "Vinyards - Germany (Areas)",
  baseUrl: "https://demo.ldproxy.net/vineyards",
  queryParameters: {
    f: "json",
  },
};
const daraaProvider = {
  id: "daraa",
  name: "Daraa, Syria (Points, Lines, Areas)",
  baseUrl: "https://demo.ldproxy.net/daraa",
  queryParameters: {
    f: "json",
  },
};

const providers = [
  // strassenProvider,
  // vinyardProvider,
  // daraaProvider,
  finlandGeoNamesProvider,
  finlandTopographyProvider,
];

async function fetchCollections(baseUrl, options) {
  const { queryParameters, headers } = options;
  const queryString = new URLSearchParams(queryParameters);
  const response = await fetch(
    `${baseUrl}/collections${queryString && queryString !== "" && `?${queryString}`}`,
    { headers },
  );
  const json = await response.json();
  json.collections = json.collections.map((collection) => {
    collection.translatedTitle = translateName(collection.title);
    return collection;
  });
  return json;
}

function createCollectionResource(baseUrl, collectionId, options = {}) {
  const resource = new Resource({
    url: `${baseUrl}/collections/${collectionId}/items`,
  });
  const { queryParameters, headers, limit, offset, bbox } = options;
  if (queryParameters) {
    resource.setQueryParameters(queryParameters);
  }
  if (headers) {
    resource.headers = headers;
  }
  if (defined(limit) && limit > 0) {
    resource.appendQueryParameters({ limit });
  }
  if (defined(offset) && offset > 0) {
    resource.appendQueryParameters({ offset });
  }
  if (bbox) {
    resource.appendQueryParameters({ bbox });
  }

  // TODO: We _may_ want to do something like this to additionally request the data size
  // currently when the GeoJsonDataSource loads data it ignores/drops the extra properties
  // const collectionResource = resource.getDerivedResource({
  //   queryParameters: { limit: 1 },
  // });
  // const collectionJson = collectionResource.fetchJson().then((resp) => {
  //   console.log("response", resp);
  //   console.log("totalItems", resp.numberMatched);
  //   // This value is technically optional so some servers may not return it
  // });

  return resource;
}

// const MAX_ITEMS = 1_000_000;
const MAX_ITEMS = Number.POSITIVE_INFINITY;

/**
 * @param {Resource} firstResource
 */
async function getCollectionSize(firstResource, options) {
  const json = await firstResource.fetchJson();

  if (!json) {
    return;
  }

  if (json.numberMatched) {
    return json.numberMatched;
  }

  const firstPage = await firstResource.fetchJson();

  let nextUrl = firstPage.links?.find((link) => link.rel === "next")?.href;

  let itemsLoaded = firstPage.numberReturned ?? firstPage.features?.length;
  console.log("  loaded", itemsLoaded, "items");

  while (defined(nextUrl)) {
    if (itemsLoaded > MAX_ITEMS) {
      console.log("stopping early, max items reached");
      return -1;
    }

    const nextUrlPath = new URL(nextUrl);
    if (defined(options.queryParameters)) {
      Object.entries(options.queryParameters).forEach(([key, value]) => {
        nextUrlPath.searchParams.set(key, value);
      });
    }

    const nextPageResource = new Resource({
      url: nextUrlPath.href,
      headers: options.headers,
    });
    // console.log('requesting', nextPageResource.toString())
    const nextPage = await nextPageResource.fetchJson();

    itemsLoaded += nextPage.numberReturned ?? nextPage.features?.length;
    nextUrl = nextPage.links?.find((link) => link.rel === "next")?.href;

    console.log("  loaded", itemsLoaded, "items");
  }
  return itemsLoaded;
}

const savedData = JSON.parse(readFileSync("./collections.json", "utf8"));

Object.entries(savedData).forEach(([providerId, provider]) => {
  console.log(providerId);
  Object.entries(provider)
    .sort(([, c1], [, c2]) => (c2.totalItems ?? -1) - (c1.totalItems ?? -1))
    .forEach(([, collection]) => {
      console.log(
        (collection.totalItems?.toLocaleString() ?? 'undefined').padStart(12, " "),
        " ",
        collection.id,
        "-",
        collection.translatedTitle,
      );
    });
});

async function main() {
  for (const provider of providers) {
    const providerCollections = await fetchCollections(provider.baseUrl, {
      queryParameters: provider.queryParameters,
      headers: provider.headers,
    });

    if (!savedData[provider.id]) {
      savedData[provider.id] = {};
    }

    for (const collection of providerCollections.collections) {
      if (!savedData[provider.id][collection.id]) {
        savedData[provider.id][collection.id] = {
          title: collection.title,
          translatedTitle: collection.translatedTitle,
          id: collection.id,
          itemCount: collection.itemCount,
        };
      }

      if (defined(savedData[provider.id][collection.id].totalItems)) {
        continue;
      }

      // if (savedData[provider.id][collection.id].largeData) {
      //   console.log("Skipping large data:", provider.id, "-", collection.id, collection.translatedTitle);
      //   continue;
      // }
      // if (savedData[provider.id][collection.id].extraLargeData) {
      //   console.log("Skipping extra large data:", provider.id, "-", collection.id, collection.translatedTitle);
      //   continue;
      // }
      if (savedData[provider.id][collection.id].extraLargeData) {
        console.log(
          "Loading extra large data:",
          provider.id,
          "-",
          collection.id,
          collection.translatedTitle,
        );
        delete savedData[provider.id][collection.id].largeData;
      } else if (savedData[provider.id][collection.id].largeData) {
        console.log(
          "Loading large data:",
          provider.id,
          "-",
          collection.id,
          collection.translatedTitle,
        );
        delete savedData[provider.id][collection.id].largeData;
      }

      console.log(
        "Looking at:",
        provider.id,
        "-",
        collection.id,
        collection.translatedTitle,
      );

      const resource = createCollectionResource(
        provider.baseUrl,
        collection.id,
        {
          queryParameters: provider.queryParameters,
          headers: provider.headers,
          limit: 10_000,
        },
      );

      const totalItems = await getCollectionSize(resource, {
        queryParameters: provider.queryParameters,
        headers: provider.headers,
        limit: 10_000,
      });
      if (!defined(totalItems)) {
        continue;
      } else if (totalItems < 0) {
        savedData[provider.id][collection.id].largeData = true;
        savedData[provider.id][collection.id].extraLargeData = true;
      } else {
        savedData[provider.id][collection.id].totalItems = totalItems;
        console.log("found total items of:", totalItems);
      }

      writeFileSync(
        "./collections.json",
        JSON.stringify(savedData, undefined, 2),
      );
    }
    writeFileSync(
      "./collections.json",
      JSON.stringify(savedData, undefined, 2),
    );
  }
  writeFileSync("./collections.json", JSON.stringify(savedData, undefined, 2));
}

main();

function translateName(name) {
  // Many of the ldproxy examples are in German so it's hard to know what they are
  // or what they represent or just talk about them. Translate some of the terms to eng
  // Also did this for the Finland topography using ChatGPT, may be inacurate but better than nothing
  // cspell:disable
  const translations = {
    "Abschnitte und Äste": "Sections and Branches",
    Netzknoten: "Network nodes",
    Nullpunkte: "Zero points",
    Unfälle: "Accidents",
    "Unfälle (alternative Darstellung)":
      "Accidents (alternative representation)",
    syvyyskayransyvyysarvo: "Depth crossing depth value",
    tiesymboli: "Road symbol",
    kalliosymboli: "Rock symbol",
    muuntoasema: "Transformer station",
    retkeilyalue: "Recreation area",
    osoitepiste: "Address point",
    jarvi: "Lake",
    pelastuskoodipiste: "Rescue code point",
    urheilujavirkistysalue: "Sports and recreation area",
    puu: "Tree",
    virtavesikapea: "Stream narrow",
    pato: "Dam",
    rauhoitettukohde: "Protected area",
    sulkuportti: "Lock gate",
    allas: "Basin",
    korkeuskayra: "Elevation contour",
    tulvaalue: "Flood area",
    muuntaja: "Transformer",
    syvyyskayra: "Lake Depth contour",
    autoliikennealue: "Vehicle traffic area",
    louhos: "Quarry",
    rautatie: "Railway",
    suurjannitelinjanpylvas: "High voltage line pole",
    vesikuoppa: "Water pit",
    suojanne: "Shelter",
    korkeuskayrankorkeusarvo: "Elevation contour height value",
    tieviiva: "Road line",
    valtakunnanrajapyykki: "National boundary marker",
    koski: "Rapids",
    maatalousmaa: "Agricultural land",
    karttasymboli: "Map symbol",
    kunnanhallintoraja: "Municipal boundary",
    masto: "Mast",
    ampumaalue: "Shooting range",
    viettoviiva: "Slope line",
    puurivi: "Tree line",
    merkittavaluontokohde: "Notable natural site",
    syvyyspiste: "Depth point",
    "Satama-alue": "Port area",
    taytemaa: "Fill land",
    lahde: "Spring (water source)",
    suo: "Swamp",
    metsamaanmuokkaus: "Forest land cultivation",
    tienroteksti: "Road text",
    mastonkorkeus: "Mast height",
    rakennusreunaviiva: "Building edge line",
    savupiipunkorkeus: "Chimney height",
    ulkojasisasaaristonraja: "Outer archipelago boundary",
    ilmarata: "Aerial railway",
    muistomerkki: "Monument",
    vesikulkuvaylanteksti: "Waterway text",
    matalikko: "Shoal",
    muuavoinalue: "Other open area",
    suojelualueenreunaviiva: "Protected area boundary",
    kunnanhallintokeskus: "Municipal administration center",
    luonnonpuisto: "Nature reserve",
    puisto: "Park",
    vesikivikko: "Water gravel",
    vesikulkuvayla: "Waterway",
    vesiasteikko: "Water scale",
    lahestymisvalo: "Approach light",
    maastokuvionreuna: "Terrain pattern edge",
    tulentekopaikka: "Campfire site",
    kellotapuli: "Bell tower",
    tuulivoimala: "Wind turbine",
    rakennus: "Building",
    varastoalue: "Storage area",
    vesikivi: "Water stone",
    niitty: "Meadow",
    uittolaite: "Rafting device",
    vedenpinnankorkeusluku: "Water surface elevation value",
    turvalaite: "Safety device",
    suojametsa: "Protective forest",
    rajavyohykkeentakaraja: "Border zone back boundary",
    lentokenttaalue: "Airport area",
    luonnonsuojelualue: "Nature conservation area",
    kansallispuisto: "National park",
    hietikko: "Sand",
    kivi: "Stone",
    hylynsyvyys: "Wreck depth",
    sahkolinja: "Power line",
    virtausnuoli: "Flow arrow",
    metsanraja: "Forest boundary",
    hautausmaa: "Cemetery",
    kunta: "Municipality",
    virtavesialue: "Stream area",
    nakotorni: "Watchtower",
    sahkolinjansymboli: "Power line symbol",
    kaatopaikka: "Landfill",
    savupiippu: "Chimney",
    maasto2kuvionreuna: "Terrain pattern 2 edge",
    rautatieliikennepaikka: "Railway traffic area",
    aita: "Fence",
    paikannimi: "Place name",
    sisaistenaluevesienulkoraja: "Internal water boundary",
    vesitorni: "Water tower",
    kallioalue: "Rock area",
    kalliohalkeama: "Rock fracture",
    maatuvavesialue: "Groundwater area",
    jyrkanne: "Cliff",
    uittoranni: "Rafting shore",
    portti: "Gate",
    pistolaituriviiva: "Dockline",
    kaislikko: "Reed bed",
    kivikko: "Gravel",
    aallonmurtaja: "Breakwater",
    rakennelma: "Structure",
    ankkuripaikka: "Anchorage",
    taajaanrakennetunalueenreuna: "Edge of the densely built area",
    ilmaradankannatinpylvas: "Aerial railway support pole",
    maaaineksenottoalue: "Soil extraction area",
    aidansymboli: "Fence symbol",
    hylky: "Wreck",
    metsamaankasvillisuus: "Forest land vegetation",
    suojaalue: "Protection area",
    luiska: "Ramp",
    tervahauta: "Tar pit",
    suojaalueenreunaviiva: "Protection area boundary",
    soistuma: "Swamp",
    harvalouhikko: "Sparse quarry",
    vesikulkuvaylankulkusuunta: "Waterway direction",
    aluemerenulkoraja: "Area sea boundary",
    rautatiensymboli: "Railway symbol",
    taajaanrakennettualue: "Densely built area",
    suojametsanreunaviiva: "Protective forest boundary",
    meri: "Sea",
    tunnelinaukko: "Tunnel entrance",
    selite: "Explanation",
  };
  // cspell:enable
  return translations[name] ?? name;
}
