async function checkContentType(route) {
  const request = await fetch(route);
  return request.headers.get("Content-Type");
}

const mimeTypes = {
  "application/json": ["czml", "json", "geojson", "topojson"],
  "application/wasm": ["wasm"],
  "image/ktx2": ["ktx2"],
  "model/gltf+json": ["gltf"],
  "model/gltf-binary": ["bgltf", "glb"],
  "application/octet-stream": ["b3dm", "pnts", "i3dm", "cmpt", "geom", "vctr"],
  "text/plain": ["glsl"],
};

const testUrls = {
  "http://localhost:8080/Apps/SampleData/simple.czml": "application/json",
  "http://localhost:8080/Apps/SampleData/population909500.json":
    "application/json",
  "http://localhost:8080/Apps/SampleData/simplestyles.geojson":
    "application/json",
  "http://localhost:8080/Apps/SampleData/ne_10m_us_states.topojson":
    "application/json",
  "http://localhost:8080/Build/CesiumUnminified/ThirdParty/basis_transcoder.wasm":
    "application/wasm",
  "http://localhost:8080/Apps/Sandcastle/images/Cesium_Logo_ETC1S.ktx2":
    "image/ktx2",
  "http://localhost:8080/Apps/SampleData/models/BoxUnlit/BoxUnlit.gltf":
    "model/gltf+json",
  // "bgltf": 'unknown', // unknown
  "http://localhost:8080/Apps/SampleData/models/Pawns/Pawns.glb":
    "model/gltf-binary",
  "http://localhost:8080/Apps/SampleData/Cesium3DTiles/Tilesets/Tileset/ll.b3dm":
    "application/octet-stream",
  "http://localhost:8080/Apps/SampleData/Cesium3DTiles/PointCloud/PointCloudTimeDynamic/0.pnts":
    "application/octet-stream",
  "http://localhost:8080/Apps/SampleData/Cesium3DTiles/Instanced/InstancedOrientation/instancedOrientation.i3dm":
    "application/octet-stream",
  "http://localhost:8080/Apps/SampleData/Cesium3DTiles/Composite/Composite/composite.cmpt":
    "application/octet-stream",
  "http://localhost:8080/Apps/SampleData/Cesium3DTiles/Classification/PointCloud/content.geom":
    "application/octet-stream",
  "http://localhost:8080/Specs/Data/Cesium3DTiles/Vector/VectorTilePoints/parent.vctr":
    "application/octet-stream",
  "http://localhost:8080/packages/engine/Source/Shaders/Builtin/Functions/clipPolygons.glsl":
    "text/plain",
};

async function main() {
  for (const [url, expected] of Object.entries(testUrls)) {
    const type = await checkContentType(url);
    const matches = type?.startsWith(expected);
    console.log(matches, url);
    if (!matches) {
      console.log(`Expected: ${expected}, got: ${type}`);
    }
  }
}

main().catch((error) => {
  console.error("Something went wrong");
  console.error(error.message);
});
