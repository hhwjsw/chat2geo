"use client";

import { useEffect } from "react";
import { Map } from "maplibre-gl";
import useMapLayersStore from "../../stores/use-map-layer-store";
import useZoomRequestStore, {
  AddressSearchProps,
} from "../../stores/use-map-zoom-request-store";
import {
  calculateGeometryCentroid,
  calculateZoomLevel,
  convertCoordinatesToGeoJson,
  convertFeatureToGeometry,
} from "@/features/maps/utils/geometry-utils";
import { addGeocodedPointToMap } from "../../utils/add-geocoded-point-to-map";

export default function useZoomToGeometry(mapInstance: Map | null) {
  const mapLoaded = useMapLayersStore((state) => state.mapLoaded);

  const zoomToLayerRequestWithGeometry = useZoomRequestStore(
    (state) => state.zoomToLayerRequestWithGeometry
  );
  const setZoomToLayerRequestWithGeometry = useZoomRequestStore(
    (state) => state.setZoomToLayerRequestWithGeometry
  );

  const zoomToAddressRequest = useZoomRequestStore(
    (state) => state.zoomToAddressRequest
  );
  const setZoomToAddressRequest = useZoomRequestStore(
    (state) => state.setZoomToAddressRequest
  );

  const zoomRequestFromTable = useZoomRequestStore(
    (state) => state.zoomRequestFromTable
  );
  const setZoomRequestFromTable = useZoomRequestStore(
    (state) => state.setZoomRequestFromTable
  );

  useEffect(() => {
    if (
      !mapInstance ||
      !mapLoaded ||
      (!zoomRequestFromTable &&
        !zoomToLayerRequestWithGeometry &&
        !zoomToAddressRequest)
    )
      return;

    let targetPoint: [number, number] | AddressSearchProps = [
      116.397428, 39.90923,
    ];
    let targetZoom = 12;
    let isHandled = false;

    if (zoomToLayerRequestWithGeometry?.geometry) {
      targetPoint = calculateGeometryCentroid(
        zoomToLayerRequestWithGeometry.geometry
      );
      targetZoom = calculateZoomLevel(zoomToLayerRequestWithGeometry.geometry);
      isHandled = true;
    } else if (zoomRequestFromTable?.geometry) {
      const geometry = convertFeatureToGeometry(zoomRequestFromTable);
      targetPoint = calculateGeometryCentroid(geometry);
      targetZoom = calculateZoomLevel(geometry);
      isHandled = true;
    } else if (zoomToAddressRequest) {
      targetPoint = zoomToAddressRequest;
      targetZoom = 16;
      isHandled = true;
      const geocodedPoint = convertCoordinatesToGeoJson({
        lat: zoomToAddressRequest.lat,
        lon: zoomToAddressRequest.lng,
      });
      addGeocodedPointToMap(mapInstance, geocodedPoint, "geocoded-point");
    }

    if (isHandled) {
      mapInstance.jumpTo({
        center: targetPoint,
        zoom: targetZoom,
      });

      const timeout = setTimeout(() => {
        if (zoomToLayerRequestWithGeometry?.geometry)
          setZoomToLayerRequestWithGeometry(null);
        if (zoomRequestFromTable?.geometry) setZoomRequestFromTable(null);
        if (zoomToAddressRequest) setZoomToAddressRequest(null);
      }, 1100);

      return () => clearTimeout(timeout);
    }
  }, [
    mapLoaded,
    mapInstance,
    zoomToLayerRequestWithGeometry,
    setZoomToLayerRequestWithGeometry,
    zoomToAddressRequest,
    setZoomToAddressRequest,
    zoomRequestFromTable,
    setZoomRequestFromTable,
  ]);
}
