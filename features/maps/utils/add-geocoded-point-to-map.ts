import { Map } from "maplibre-gl";
import { Feature, Point } from "geojson";

export const addGeocodedPointToMap = (
  map: Map,
  geojsonData: Feature<Point>,
  layerId: string
) => {
  // 更新已存在的数据源
  const source = map.getSource("geocoded-point-source");
  if (source) {
    (source as maplibregl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features: [geojsonData]
    });
  }

  // 确保图层可见
  map.setLayoutProperty(layerId, "visibility", "visible");

  // 创建闪烁效果
  let visible = true;
  const flashInterval = setInterval(() => {
    visible = !visible;
    map.setPaintProperty(layerId, "circle-opacity", visible ? 0.8 : 0.2);
    map.setPaintProperty(layerId, "circle-stroke-opacity", visible ? 1 : 0.3);
  }, 1000);

  // 10秒后停止闪烁并隐藏图层
  setTimeout(() => {
    clearInterval(flashInterval);
    map.setLayoutProperty(layerId, "visibility", "none");
    // 清空数据源
    if (source) {
      (source as maplibregl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: []
      });
    }
  }, 10000);
};