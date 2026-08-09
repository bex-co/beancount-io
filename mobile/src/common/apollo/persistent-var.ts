// persistentVar.ts
import { makeVar, ReactiveVar } from "@apollo/client";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 存储后端接口（默认 AsyncStorage；凭证类数据请传安全存储）
export type PersistentStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

// 定义泛型类型，支持任意类型的持久化变量
export function createPersistentVar<T>(
  key: string, // 存储键名
  defaultValue: T, // 默认值（初始加载失败时使用）
  serialize?: (value: T) => string, // 序列化函数（默认 JSON.stringify）
  deserialize?: (value: string) => T, // 反序列化函数（默认 JSON.parse）
  storage: PersistentStorage = AsyncStorage, // 存储后端
): [ReactiveVar<T>, () => Promise<T | null>] {
  // 初始化变量（内存中的响应式变量）
  const varInstance = makeVar<T>(defaultValue);

  // 序列化与反序列化方法（默认使用 JSON）
  const serializeValue = serialize || ((value) => JSON.stringify(value));
  const deserializeValue = deserialize || ((value) => JSON.parse(value) as T);

  // 加载存储的值并更新变量（异步）
  const loadFromStorage = async (): Promise<T | null> => {
    try {
      const storedValue = await storage.getItem(key);
      if (storedValue !== null) {
        const result = deserializeValue(storedValue);
        varInstance(result); // 更新内存变量
        return result;
      }
      return null;
    } catch (error) {
      console.error(`Failed to load ${key} from AsyncStorage:`, error);
      return null;
    }
  };

  // 监听变量变化并写入存储（异步）
  const saveToStorage = async (newValue: T): Promise<void> => {
    try {
      const serializedValue = serializeValue(newValue);
      await storage.setItem(key, serializedValue);
    } catch (error) {
      console.error(`Failed to save ${key} to AsyncStorage:`, error);
    }
  };

  varInstance.onNextChange(function onNextChange(value) {
    saveToStorage(value);
    // https://github.com/apollographql/apollo-client/blob/v3.13.8/src/react/hooks/useReactiveVar.ts#L33
    varInstance.onNextChange(onNextChange);
  });

  // 返回变量实例和手动加载方法（可选）
  return [varInstance, loadFromStorage];
}
