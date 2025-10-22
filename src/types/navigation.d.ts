// src/types/navigation.d.ts
import type { RootStackParamList } from '../navigation/RootStack';

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}