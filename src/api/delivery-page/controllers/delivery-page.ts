import { factories } from '@strapi/strapi';

const deliveryPagePopulate = {
  seo: {
    populate: ['ogImage'],
  },
  hero: true,
  deliveryZones: {
    populate: ['details'],
  },
  orderSection: {
    populate: ['items'],
  },
  paymentSection: {
    populate: ['items'],
  },
  importantItems: true,
  contactSection: true,
};

export default factories.createCoreController('api::delivery-page.delivery-page' as any, () => ({
  async find(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: ctx.query.populate ?? deliveryPagePopulate,
    };

    return super.find(ctx);
  },
}));
