import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function CreateActionScreen() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/citizen/create-post');
  }, [router]);
  return null;
}
