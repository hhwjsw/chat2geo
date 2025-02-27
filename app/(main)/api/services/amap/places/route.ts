import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// 返回高德地图 JavaScript API 脚本 URL
export async function GET(request: Request) {
  // 验证用户身份
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthenticated!" }, { status: 401 });
  }

  const NEXT_PUBLIC_AMAP_API_KEY = process.env.NEXT_PUBLIC_AMAP_API_KEY;

  if (!NEXT_PUBLIC_AMAP_API_KEY) {
    return NextResponse.json({ error: "API key is missing" }, { status: 500 });
  }

  // 高德地图 JavaScript API 脚本 URL
  const scriptUrl = `https://webapi.amap.com/maps?v=2.0&key=${NEXT_PUBLIC_AMAP_API_KEY}&plugin=AMap.PlaceSearch,AMap.Geocoder,AMap.ToolBar,AMap.Scale`;

  return NextResponse.json({ scriptUrl });
}

// POI 搜索接口
export async function POST(request: Request) {
  try {
    // 验证用户身份
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Unauthenticated!" }, { status: 401 });
    }

    // 解析请求体
    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      console.error("Invalid JSON in request body:", error);
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    const { 
      query,
      city = "北京",  // 默认城市
      citylimit = true,  // 是否限制在城市内
      location,  // 可选的中心点
      radius = 5000,  // 搜索半径，默认5公里
      types,  // 可选的 POI 类型
      sortrule = "distance"  // 排序规则：distance-距离优先，weight-权重优先
    } = requestData;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const AMAP_API_KEY = process.env.AMAP_API_KEY;

    if (!AMAP_API_KEY) {
      return NextResponse.json(
        { error: "API key is not configured" },
        { status: 500 }
      );
    }

    // 构建请求参数
    const params = new URLSearchParams({
      keywords: query,
      key: AMAP_API_KEY,
      extensions: 'all',  // 返回详细信息
      output: 'JSON',
      offset: '25',  // 每页记录数
      page: '1',     // 当前页数
      sortrule,
      city,
      citylimit: citylimit ? 'true' : 'false'
    });

    // 添加可选参数
    if (location && location.lat && location.lng) {
      params.append('location', `${location.lng},${location.lat}`);
      params.append('radius', radius.toString());
    }

    if (types) {
      params.append('types', types);
    }
    
    const response = await fetch(
      `https://restapi.amap.com/v3/place/text?${params.toString()}`,
      { next: { revalidate: 300 } }  // 缓存5分钟
    );

    if (!response.ok) {
      throw new Error(`高德地图 API 响应错误: ${response.status}`);
    }

    const data = await response.json();

    // 检查 API 响应状态
    if (data.status !== '1') {
      return NextResponse.json({ 
        error: data.info || '地点搜索失败',
        details: data
      }, { status: 400 });
    }

    // 检查并处理搜索结果
    if (!data.pois || !Array.isArray(data.pois)) {
      return NextResponse.json({ 
        results: [],
        status: "OK",
        total: 0
      });
    }

    // 转换高德数据格式为统一格式
    const results = data.pois.map((item: any) => {
      const [lng, lat] = item.location.split(',').map(Number);
      
      return {
        place_id: item.id,
        name: item.name,
        formatted_address: item.address || `${item.pname}${item.cityname}${item.adname}`,
        geometry: {
          location: { lat, lng }
        },
        types: item.type?.split(';') || [],
        vicinity: item.address || item.adname,
        // 位置信息
        pname: item.pname,          // 省份名
        cityname: item.cityname,    // 城市名
        adname: item.adname,        // 区域名
        // 扩展信息
        rating: parseFloat(item.biz_ext?.rating || '0'),
        price: parseFloat(item.biz_ext?.cost || '0'),
        tel: item.tel || '',
        distance: parseInt(item.distance || '0'),
        business_area: item.business_area || '',
        tag: item.tag || ''
      };
    });

    // 返回格式化的响应
    return NextResponse.json({
      results,
      status: "OK",
      total: parseInt(data.count) || 0,
      suggestion: data.suggestion || null
    });

  } catch (error: any) {
    console.error("Places search error:", error);
    return NextResponse.json(
      { 
        error: "搜索失败", 
        details: error.message,
        status: "ERROR"
      },
      { status: 500 }
    );
  }
}