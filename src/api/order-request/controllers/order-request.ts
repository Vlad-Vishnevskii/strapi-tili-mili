import { errors } from '@strapi/utils';

export default {
  async create(ctx) {
    const payload = (ctx.request.body?.data ?? ctx.request.body) as Record<string, unknown>;

    try {
      const result = await strapi.service('api::order.order').createFromRequest(payload);

      ctx.status = 201;
      ctx.body = {
        success: true,
        ...result,
      };
    } catch (error) {
      if (error instanceof errors.ValidationError) {
        return ctx.badRequest(error.message, error.details ?? undefined);
      }

      throw error;
    }
  },
};
