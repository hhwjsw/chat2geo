/**
 * 坐标系转换工具
 * WGS-84: GPS坐标系
 * GCJ-02: 国测局坐标系（火星坐标系），高德地图使用
 */

// WGS-84 转 GCJ-02
export function wgs84ToGcj02(lng: number, lat: number): [number, number] {
    if (outOfChina(lng, lat)) {
      return [lng, lat];
    }
    
    const d = delta(lng, lat);
    return [lng + d[0], lat + d[1]];
  }
  
  // GCJ-02 转 WGS-84
  export function gcj02ToWgs84(lng: number, lat: number): [number, number] {
    if (outOfChina(lng, lat)) {
      return [lng, lat];
    }
    
    const d = delta(lng, lat);
    return [lng - d[0], lat - d[1]];
  }
  
  // 判断坐标是否在中国境外
  function outOfChina(lng: number, lat: number): boolean {
    return (lng < 72.004 || lng > 137.8347) || (lat < 0.8293 || lat > 55.8271);
  }
  
  // 计算偏移量
  function delta(lng: number, lat: number): [number, number] {
    const a = 6378245.0; // 椭球长半轴
    const ee = 0.00669342162296594323; // 偏心率平方
    
    let dlat = transformLat(lng - 105.0, lat - 35.0);
    let dlng = transformLng(lng - 105.0, lat - 35.0);
    
    const radlat = lat / 180.0 * Math.PI;
    let magic = Math.sin(radlat);
    magic = 1 - ee * magic * magic;
    
    const sqrtmagic = Math.sqrt(magic);
    dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * Math.PI);
    dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * Math.PI);
    
    return [dlng, dlat];
  }
  
  // 经度转换
  function transformLng(lng: number, lat: number): number {
    let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
    ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(lng * Math.PI) + 40.0 * Math.sin(lng / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(lng / 12.0 * Math.PI) + 300.0 * Math.sin(lng / 30.0 * Math.PI)) * 2.0 / 3.0;
    return ret;
  }
  
  // 纬度转换
  function transformLat(lng: number, lat: number): number {
    let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
    ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(lat * Math.PI) + 40.0 * Math.sin(lat / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(lat / 12.0 * Math.PI) + 320 * Math.sin(lat * Math.PI / 30.0)) * 2.0 / 3.0;
    return ret;
  }