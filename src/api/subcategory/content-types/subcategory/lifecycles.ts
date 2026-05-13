export default {
  async beforeCreate(event: { params: { data?: Record<string, unknown> } }) {
    const data = event.params.data;

    if (!data || (data.sortOrder !== undefined && data.sortOrder !== null)) {
      return;
    }

    const lastSubcategory = await strapi.db.query('api::subcategory.subcategory').findOne({
      orderBy: { sortOrder: 'desc' },
      select: ['sortOrder'],
    });

    const lastSortOrder =
      lastSubcategory && typeof lastSubcategory.sortOrder === 'number'
        ? lastSubcategory.sortOrder
        : 0;

    data.sortOrder = lastSortOrder + 1;
  },
};
