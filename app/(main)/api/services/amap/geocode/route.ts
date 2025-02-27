import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    // 验证用户身份
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Unauthenticated!" }, { status: 401 });
    }

    // [修改 1] 添加请求体解析的错误处理
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

    const { address, city } = requestData;  // [修改 2] 添加可选的城市参数

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    const AMAP_API_KEY = process.env.AMAP_API_KEY;

    if (!AMAP_API_KEY) {
      return NextResponse.json(
        { error: "API key is not configured" },
        { status: 500 }
      );
    }

    // [修改 3] 构建请求参数
    const params = new URLSearchParams({
      address: address,
      key: AMAP_API_KEY,
      output: 'JSON'
    });

    // [修改 4] 添加可选参数
    if (city) {
      params.append('city', city);
    }

    // [修改 5] 调整缓存时间，添加日志
    console.log("Calling AMap Geocoding API:", `https://restapi.amap.com/v3/geocode/geo?${params.toString()}`);
    
    const response = await fetch(
      `https://restapi.amap.com/v3/geocode/geo?${params.toString()}`,
      { next: { revalidate: 300 } }  // [修改 6] 缓存改为 5 分钟
    );
    
    if (!response.ok) {
      throw new Error(`高德地图 API 响应错误: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("AMap Geocoding response:", data);  // [修改 7] 添加响应日志
    
    // [修改 8] 改进错误处理
    if (data.status !== '1') {
      return NextResponse.json({ 
        error: data.info || '地理编码失败',
        details: data
      }, { status: 400 });
    }
    
    // [修改 9] 检查 geocodes 数组
    if (!data.geocodes || !Array.isArray(data.geocodes) || data.geocodes.length === 0) {
      return NextResponse.json({ 
        results: [],
        status: "ZERO_RESULTS" 
      });
    }
    
    // [修改 10] 改进数据转换
    const results = data.geocodes.map((item: any) => {
      const [lng, lat] = item.location.split(',').map(Number);
      
      return {
        formatted_address: item.formatted_address,
        geometry: {
          location: { lat, lng }
        },
        place_id: item.adcode,
        address_components: [
          { long_name: item.province, short_name: item.province, types: ['administrative_area_level_1'] },
          { long_name: item.city, short_name: item.city, types: ['locality'] },
          { long_name: item.district, short_name: item.district, types: ['administrative_area_level_2'] },
          { long_name: item.street || '', short_name: item.street || '', types: ['route'] },
          { long_name: item.number || '', short_name: item.number || '', types: ['street_number'] }
        ].filter(comp => comp.long_name),
        // [新增] 添加更多有用的信息
        level: item.level,
        confidence: parseInt(item.confidence || '0'),
        neighborhood: item.neighborhood || '',
        building: item.building || '',
        township: item.township || '',
        district: item.district || '',
        city: item.city || '',
        province: item.province || ''
      };
    });
    
    return NextResponse.json({
      results,
      status: "OK",
      total: results.length
    });
    
  } catch (error: any) {
    console.error("Geocoding error:", error);
    return NextResponse.json(
      { 
        error: "地理编码失败", 
        details: error.message,
        status: "ERROR"
      },
      { status: 500 }
    );
  }
}