import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json({ error: "Unauthenticated!" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const x = searchParams.get("x");
  const y = searchParams.get("y");
  const z = searchParams.get("z");
  const AMAP_API_KEY = process.env.AMAP_API_KEY;

  if (!AMAP_API_KEY) {
    return NextResponse.json(
      { error: "API key is not configured" },
      { status: 500 }
    );
  }

  if (!x || !y || !z) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // 高德地图卫星瓦片 URL
  // 卫星图样式
  const tileUrl = `https://webst0{1-4}.is.autonavi.com/appmaptile?style=6&x=${x}&y=${y}&z=${z}&key=${AMAP_API_KEY}`;
  
  // 使用随机子域名以提高并行加载性能
  const subDomain = Math.floor(Math.random() * 4) + 1;
  const finalTileUrl = tileUrl.replace('{1-4}', subDomain.toString());
  
  return NextResponse.redirect(finalTileUrl);
}