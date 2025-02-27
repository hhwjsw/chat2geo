import maplibregl from "maplibre-gl";

export const initializeMap = (containerId: string): maplibregl.Map => {
  return new maplibregl.Map({
    container: containerId,
    attributionControl: false,
    style: {
      version: 8,
      sources: {
        "amap-satellite-imagery": {
          type: "raster",
          tiles: [
            "https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
          ],
          tileSize: 256,
        },
        "amap-roadmap": {
          type: "raster",
          tiles: [
            "https://webst01.is.autonavi.com/appmaptile?style=7&x={x}&y={y}&z={z}",
          ],
          tileSize: 256,
        },
        // 添加地理编码点的数据源
        "geocoded-point-source": {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: []
          }
        }
      },
      layers: [
        {
          id: "amapSatelliteImagery",
          type: "raster",
          source: "amap-satellite-imagery",
          minzoom: 0,
          maxzoom: 18,
          layout: {
            visibility: "visible",
          },
        },
        {
          id: "amapRoadmap",
          type: "raster",
          source: "amap-roadmap",
          minzoom: 0,
          maxzoom: 18,
          layout: {
            visibility: "none",
          },
        },
        // 添加地理编码点图层
        {
          id: "geocoded-point",
          type: "circle",
          source: "geocoded-point-source",
          paint: {
            "circle-radius": 7,
            "circle-color": "yellow",
            "circle-opacity": 0.8,
            "circle-stroke-color": "blue",
            "circle-stroke-width": 2,
            "circle-stroke-opacity": 1
          },
          layout: {
            visibility: "none"
          }
        }
      ],
    },
    center: [119.921786, 28.451993], // 丽水市中心坐标
    zoom: 13,  // 可以调整缩放级别，使其更适合丽水市的显示范围
    pitch: 0,
    bearing: 0,
    antialias: true,
  });
};