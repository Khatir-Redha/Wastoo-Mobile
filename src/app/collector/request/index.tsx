import { Redirect } from 'expo-router';

export default function CollectorRequestIndex() {
  // Should not be accessed directly - redirects to requests tab
  return <Redirect href="/collector/requests" />;
}