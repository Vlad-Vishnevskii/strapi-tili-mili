import type { Schema, Struct } from '@strapi/strapi';

export interface OrderOrderItem extends Struct.ComponentSchema {
  collectionName: 'components_order_order_items';
  info: {
    description: 'Order line with product snapshot';
    displayName: 'Order Item';
  };
  attributes: {
    actualWeight: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
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

export interface SharedContacts extends Struct.ComponentSchema {
  collectionName: 'components_shared_contacts';
  info: {
    description: 'Shared company contact information';
    displayName: 'Contacts';
  };
  attributes: {
    address: Schema.Attribute.Text;
    email: Schema.Attribute.Email;
    phone: Schema.Attribute.String;
    secondaryPhone: Schema.Attribute.String;
    workingHours: Schema.Attribute.Text;
  };
}

export interface SharedDeliveryDateRange extends Struct.ComponentSchema {
  collectionName: 'components_shared_delivery_date_ranges';
  info: {
    description: 'Delivery date range with start and end dates';
    displayName: 'Delivery Date Range';
  };
  attributes: {
    dateFrom: Schema.Attribute.Date & Schema.Attribute.Required;
    dateTo: Schema.Attribute.Date & Schema.Attribute.Required;
  };
}

export interface SharedDeliveryTimeInterval extends Struct.ComponentSchema {
  collectionName: 'components_shared_delivery_time_intervals';
  info: {
    description: 'Delivery time interval with start and end time';
    displayName: 'Delivery Time Interval';
  };
  attributes: {
    timeFrom: Schema.Attribute.Time & Schema.Attribute.Required;
    timeTo: Schema.Attribute.Time & Schema.Attribute.Required;
  };
}

export interface SharedHeroBanner extends Struct.ComponentSchema {
  collectionName: 'components_shared_hero_banners';
  info: {
    description: 'Banner slide for the home page carousel';
    displayName: 'Hero Banner';
  };
  attributes: {
    buttonLink: Schema.Attribute.String;
    buttonText: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    mobileImage: Schema.Attribute.Media<'images'>;
    subtitle: Schema.Attribute.Text;
    title: Schema.Attribute.String & Schema.Attribute.Required;
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

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: 'Reusable SEO metadata';
    displayName: 'SEO';
  };
  attributes: {
    canonicalUrl: Schema.Attribute.String;
    metaDescription: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    metaKeywords: Schema.Attribute.String;
    metaTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 70;
      }>;
    noIndex: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    ogDescription: Schema.Attribute.Text;
    ogImage: Schema.Attribute.Media<'images'>;
    ogTitle: Schema.Attribute.String;
  };
}

export interface SharedSocialLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_social_links';
  info: {
    description: 'Link to social or messenger profile';
    displayName: 'Social Link';
  };
  attributes: {
    iconName: Schema.Attribute.String;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'order.order-item': OrderOrderItem;
      'shared.category-description': SharedCategoryDescription;
      'shared.contacts': SharedContacts;
      'shared.delivery-date-range': SharedDeliveryDateRange;
      'shared.delivery-time-interval': SharedDeliveryTimeInterval;
      'shared.hero-banner': SharedHeroBanner;
      'shared.product-description-item': SharedProductDescriptionItem;
      'shared.seo': SharedSeo;
      'shared.social-link': SharedSocialLink;
    }
  }
}
