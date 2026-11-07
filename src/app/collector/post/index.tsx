import { Redirect } from 'expo-router';

export default function CollectorPostIndex() {
  // This should not be directly accessed - posts are shown in map
  return <Redirect href="/collector/map" />;
}