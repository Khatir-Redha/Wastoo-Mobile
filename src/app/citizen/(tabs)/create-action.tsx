import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function CreateActionScreen() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/create-post');
  }, []);
  return null;
}
