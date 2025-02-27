import { useState, useEffect, useRef } from 'react';

/**
 * 防抖 Hook
 * @param value 需要防抖的值
 * @param delay 防抖延迟时间（毫秒）
 * @returns 防抖后的值
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 * 
 * useEffect(() => {
 *   // debouncedSearchTerm 改变时执行搜索
 *   if (debouncedSearchTerm) {
 *     searchAPI(debouncedSearchTerm);
 *   }
 * }, [debouncedSearchTerm]);
 */
export function useDebounce<T>(value: T, delay: number): T {
  // 存储防抖后的值
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 设置定时器
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 清理函数：在下一次 useEffect 执行前或组件卸载时调用
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]); // 依赖项：value 或 delay 改变时重新执行

  return debouncedValue;
}

/**
 * 节流 Hook（可选，如果需要的话）
 * @param value 需要节流的值
 * @param delay 节流延迟时间（毫秒）
 * @returns 节流后的值
 */
export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecuted.current;

    if (timeSinceLastExecution >= delay) {
      // 如果距离上次执行的时间超过了延迟时间，立即更新值
      setThrottledValue(value);
      lastExecuted.current = now;
    } else {
      // 否则设置一个定时器在剩余时间后更新值
      const timer = setTimeout(() => {
        setThrottledValue(value);
        lastExecuted.current = Date.now();
      }, delay - timeSinceLastExecution);

      return () => clearTimeout(timer);
    }
  }, [value, delay]);

  return throttledValue;
}