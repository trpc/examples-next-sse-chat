'use client';

import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
  loggerLink,
  splitLink,
  unstable_httpBatchStreamLink,
  unstable_httpSubscriptionLink,
  createTRPCClient,
} from '@trpc/client';
import { createQueryClient } from '~/lib/query-client';
import { TRPCProvider } from '~/lib/trpc';
import { useState } from 'react';
import SuperJSON from 'superjson';
import { AppRouter } from '~/server/routers/_app';

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return createQueryClient();
  } else {
    // Browser: use singleton pattern to keep the same query client
    return (clientQueryClientSingleton ??= createQueryClient());
  }
};

const getUrl = () => {
  const base = (() => {
    if (typeof window !== 'undefined') return window.location.origin;
    if (process.env.APP_URL) return process.env.APP_URL;
    return `http://localhost:${process.env.PORT ?? 3000}`;
  })();

  return `${base}/api/trpc`;
};

export function TRPCProviders(props: Readonly<{ children: React.ReactNode }>) {
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        // adds pretty logs to your console in development and logs errors in production
        loggerLink(),
        splitLink({
          condition: (op) => op.type === 'subscription',
          true: unstable_httpSubscriptionLink({
            url: getUrl(),
            /**
             * @see https://trpc.io/docs/v11/data-transformers
             */
            transformer: SuperJSON,
          }),
          false: unstable_httpBatchStreamLink({
            url: getUrl(),
            /**
             * @see https://trpc.io/docs/v11/data-transformers
             */
            transformer: SuperJSON,
          }),
        }),
      ],
    }),
  );
  return (
    (<QueryClientProvider client={getQueryClient()}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {props.children}
      </TRPCProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>)
  );
}
