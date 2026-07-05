import { env } from "@/lib/env";

export function getMissingLivePipelineEnv(): string[] {
  const requiredEntries = {
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: env.OPENAI_API_KEY
  };

  return Object.entries(requiredEntries)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

export function canUseLivePipeline(): boolean {
  return getMissingLivePipelineEnv().length === 0;
}

export function getMissingProfileSearchEnv(): string[] {
  const requiredEntries = {
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    SERPAPI_API_KEY: env.SERPAPI_API_KEY
  };

  return Object.entries(requiredEntries)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

export function canUseProfileSearchPipeline(): boolean {
  return getMissingProfileSearchEnv().length === 0;
}
