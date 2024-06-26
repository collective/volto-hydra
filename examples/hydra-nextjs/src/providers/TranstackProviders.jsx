"use client";
import React, { useEffect, useState } from 'react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic';

// Dynamically import ReactQueryDevtools with no SSR
const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then(mod => mod.ReactQueryDevtools),
  { ssr: false }
);


const TranstackProviders = ({ children }) => {
    const queryClient = new QueryClient();

    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

  return (
    <QueryClientProvider client={queryClient}> 
        {children}
      {isClient && <ReactQueryDevtools initialIsOpen={true} />}
    </QueryClientProvider>
  )
}

export default TranstackProviders