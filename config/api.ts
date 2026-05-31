import type { Core } from '@strapi/strapi';

const config: Core.Config.Api = {
  rest: {
    defaultLimit: 1000,
    maxLimit: 1000,
    withCount: true,
  },
};

export default config;
