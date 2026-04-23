import type { Schema, Struct } from '@strapi/strapi';

export interface OrderOrderItem extends Struct.ComponentSchema {
  collectionName: 'components_order_order_items';
  info: {
    description: 'Order line with product snapshot';
    displayName: 'Order Item';
  };
  attributes: {
    freezeLabel: Schema.Attribute.String;
    itemTotal: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    itemWeight: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    packageWeight: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    product: Schema.Attribute.Relation<'oneToOne', 'api::product.product'>;
    productName: Schema.Attribute.String & Schema.Attribute.Required;
    productSlug: Schema.Attribute.String & Schema.Attribute.Required;
    productSnapshot: Schema.Attribute.JSON;
    quantity: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    unitName: Schema.Attribute.String & Schema.Attribute.Required;
    unitPrice: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
  };
}

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
      'order.order-item': OrderOrderItem;
      'shared.category-description': SharedCategoryDescription;
      'shared.product-description-item': SharedProductDescriptionItem;
      'shared.subcategory': SharedSubcategory;
    }
  }
}
