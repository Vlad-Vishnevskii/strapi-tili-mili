export default {
  async beforeCreate(event: { params: { data?: Record<string, unknown> } }) {
    const data = event.params.data;

    if (!data || data.sortOrder !== undefined && data.sortOrder !== null) {
      return;
    }

    const lastCategory = await strapi.db.query('api::category.category').findOne({
      orderBy: { sortOrder: 'desc' },
      select: ['sortOrder'],
    });

    const lastSortOrder =
      lastCategory && typeof lastCategory.sortOrder === 'number' ? lastCategory.sortOrder : 0;

    data.sortOrder = lastSortOrder + 1;
  },
};
