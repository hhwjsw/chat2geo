import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useZoomRequestStore from "../stores/use-map-zoom-request-store";
import useToastMessageStore from "@/stores/use-toast-message-store";
import { useDebounce } from "@/features/maps/hooks/use-debounce";

// 类型定义
interface AMapSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    }
  };
  vicinity?: string;
  types?: string[];
  adname?: string;
  pname?: string;
  cityname?: string;
}

interface SearchHistoryItem {
  id: string;
  text: string;
  timestamp: number;
}

export default function AddressSearch() {
  // 状态管理
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<AMapSearchResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Hooks
  const debouncedAddress = useDebounce(address, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Store
  const { setToastMessage } = useToastMessageStore();
  const setZoomToAddressRequest = useZoomRequestStore(
    (state) => state.setZoomToAddressRequest
  );

  // 统一的搜索处理函数
  const handleSearch = async (searchText: string) => {
    if (!searchText.trim()) return;
    
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    try {
      setSearchLoading(true);
      const response = await fetch("/api/services/amap/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: searchText,
          city: "丽水",  // 可以根据需要修改或从配置中获取
          citylimit: true
        }),
        signal: controller.signal
      });

      if (controller.signal.aborted) return;

      const data = await response.json();

      if (response.ok) {
        setSuggestions(data.results || []);
        setShowHistory(false);
        setError(data.results.length === 0 ? "未找到相关地点" : null);
      } else {
        setError(data.error || "搜索请求失败");
        setSuggestions([]);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error("搜索错误:", err);
        setError("搜索请求失败");
        setSuggestions([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setSearchLoading(false);
      }
    }
  };

  // 加载搜索历史
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("addressSearchHistory");
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory) as SearchHistoryItem[];
        setSearchHistory(parsedHistory.slice(0, 10));
      }
    } catch (err) {
      console.error("加载搜索历史失败:", err);
    }
  }, []);

  // 保存搜索历史
  const saveToHistory = useCallback((text: string) => {
    try {
      const newItem: SearchHistoryItem = {
        id: Date.now().toString(),
        text,
        timestamp: Date.now()
      };
      
      const updatedHistory = [
        newItem,
        ...searchHistory.filter(item => item.text !== text)
      ].slice(0, 10);
      
      setSearchHistory(updatedHistory);
      localStorage.setItem("addressSearchHistory", JSON.stringify(updatedHistory));
    } catch (err) {
      console.error("保存搜索历史失败:", err);
    }
  }, [searchHistory]);

  // 清除搜索历史
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem("addressSearchHistory");
  }, []);

  // 显示错误消息
  useEffect(() => {
    if (error) {
      setToastMessage(error, "error");
    }
  }, [error, setToastMessage]);

  // 监听输入变化，使用防抖处理
  useEffect(() => {
    if (debouncedAddress.trim()) {
      handleSearch(debouncedAddress);
    } else {
      setSuggestions([]);
    }
  }, [debouncedAddress]);

  // 处理输入变化
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setAddress(input);
    setShowHistory(input.trim() === "");
  };

  // 处理建议点击
  const handleSuggestionClick = (suggestion: AMapSearchResult) => {
    const displayText = suggestion.name;
    setAddress(displayText);
    setSuggestions([]);
    saveToHistory(displayText);
    
    if (suggestion.geometry && suggestion.geometry.location) {
      setZoomToAddressRequest(suggestion.geometry.location);
      setOpen(false);
    }
  };

  // 处理历史记录点击
  const handleHistoryItemClick = (item: SearchHistoryItem) => {
    setAddress(item.text);
    handleSearch(item.text);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(address);
    }
  };

  // 处理弹出框打开
  const handlePopoverOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
        setShowHistory(!address.trim());
      }, 100);
    }
  };

  // 清除输入
  const handleClearInput = () => {
    setAddress("");
    setSuggestions([]);
    setShowHistory(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <Popover open={open} onOpenChange={handlePopoverOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="bg-background rounded-xl [&_svg]:size-5"
            >
              <Search className="text-foreground" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>搜索地点</TooltipContent>
      </Tooltip>

      <PopoverContent className="w-80">
        <div className="relative">
          <Input
            ref={inputRef}
            value={address}
            onChange={handleAddressChange}
            onKeyDown={handleKeyDown}
            placeholder="搜索地点、地址"
            className="w-full pl-10 pr-8"
          />
          <Button
            onClick={() => handleSearch(address)}
            variant="ghost"
            className="absolute inset-y-0 left-0 flex items-center px-2"
            disabled={loading || !address.trim()}
          >
            {searchLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-foreground" />
            ) : (
              <Search className="w-4 h-4 text-foreground" />
            )}
          </Button>
          {address && (
            <Button
              onClick={handleClearInput}
              variant="ghost"
              size="icon"
              className="absolute inset-y-0 right-0 flex items-center px-2 h-full"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}
        </div>
        
        {searchLoading && (
          <div className="flex justify-center mt-2">
            <Loader2 className="w-4 h-4 animate-spin text-foreground" />
          </div>
        )}
        
        {!searchLoading && suggestions.length > 0 && (
          <ul className="mt-2 max-h-60 overflow-y-auto border border-stone-600 rounded-md bg-background">
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.place_id}
                className="cursor-pointer p-2 hover:bg-muted text-sm"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="font-medium">{suggestion.name}</div>
                <div className="text-xs text-muted-foreground">
                  {suggestion.vicinity || suggestion.formatted_address || 
                   `${suggestion.pname || ''}${suggestion.cityname || ''}${suggestion.adname || ''}`}
                </div>
                {suggestion.types && suggestion.types.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {suggestion.types.slice(0, 2).join(' • ')}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        
        {!searchLoading && showHistory && searchHistory.length > 0 && (
          <div className="mt-2 border border-stone-600 rounded-md bg-background">
            <div className="flex justify-between items-center p-2 border-b border-stone-600">
              <span className="text-xs font-medium">最近搜索</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs"
                onClick={clearHistory}
              >
                清除
              </Button>
            </div>
            <ul className="max-h-40 overflow-y-auto">
              {searchHistory.map((item) => (
                <li
                  key={item.id}
                  className="cursor-pointer p-2 hover:bg-muted text-sm flex items-center"
                  onClick={() => handleHistoryItemClick(item)}
                >
                  <Search className="w-3 h-3 mr-2 text-muted-foreground" />
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}