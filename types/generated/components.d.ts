import type { Schema, Struct } from '@strapi/strapi';

export interface SharedCategoryDescription extends Struct.ComponentSchema {
  collectionName: 'components_shared_category_descriptions';
  info: {
    description: 'Paragraph block for category descriptions';
    displayName: 'Category Description';
  };
  attributes: {
    text: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface SharedProductDescriptionItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_product_description_items';
  info: {
    description: 'Name-value pair for product details';
    displayName: 'Product Description Item';
  };
  attributes: {
    name: Schema.Attribute.String & Schema.Attribute.Required;
    text: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface SharedSubcategory extends Struct.ComponentSchema {
  collectionName: 'components_shared_subcategories';
  info: {
    description: 'Simple subcategory label';
    displayName: 'Subcategory';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'shared.category-description': SharedCategoryDescription;
      'shared.product-description-item': SharedProductDescriptionItem;
      'shared.subcategory': SharedSubcategory;
    }
  }
}
