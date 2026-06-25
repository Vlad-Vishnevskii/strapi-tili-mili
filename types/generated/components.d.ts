import type { Schema, Struct } from '@strapi/strapi';

export interface DeliveryContactSection extends Struct.ComponentSchema {
  collectionName: 'components_delivery_contact_sections';
  info: {
    description: 'Contact CTA section for the delivery page';
    displayName: 'Delivery Contact Section';
  };
  attributes: {
    fallbackEmail: Schema.Attribute.String;
    fallbackPhone: Schema.Attribute.String;
    kicker: Schema.Attribute.String;
    text: Schema.Attribute.RichText;
    title: Schema.Attribute.Text;
    useSiteSettingsContacts: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
  };
}

export interface DeliveryHero extends Struct.ComponentSchema {
  collectionName: 'components_delivery_heroes';
  info: {
    description: 'Hero block for the delivery page';
    displayName: 'Delivery Hero';
  };
  attributes: {
    kicker: Schema.Attribute.String;
    noteText: Schema.Attribute.RichText;
    noteTitle: Schema.Attribute.String;
    primaryButtonLink: Schema.Attribute.String;
    primaryButtonText: Schema.Attribute.String;
    secondaryButtonLink: Schema.Attribute.String;
    secondaryButtonText: Schema.Attribute.String;
    text: Schema.Attribute.RichText;
    title: Schema.Attribute.Text;
  };
}

export interface DeliveryImportantItem extends Struct.ComponentSchema {
  collectionName: 'components_delivery_important_items';
  info: {
    description: 'Important note for the delivery page';
    displayName: 'Delivery Important Item';
  };
  attributes: {
    text: Schema.Attribute.RichText;
  };
}

export interface DeliveryListSection extends Struct.ComponentSchema {
  collectionName: 'components_delivery_list_sections';
  info: {
    description: 'List section for delivery page content';
    displayName: 'Delivery List Section';
  };
  attributes: {
    items: Schema.Attribute.Component<'shared.text-item', true>;
    kicker: Schema.Attribute.String;
    listType: Schema.Attribute.Enumeration<['ordered', 'unordered']> &
      Schema.Attribute.DefaultTo<'unordered'>;
    title: Schema.Attribute.String;
  };
}

export interface DeliveryZone extends Struct.ComponentSchema {
  collectionName: 'components_delivery_zones';
  info: {
    description: 'Text description of a delivery geography zone';
    displayName: 'Delivery Zone';
  };
  attributes: {
    description: Schema.Attribute.RichText;
    details: Schema.Attribute.Component<'shared.text-item', true>;
    title: Schema.Attribute.String;
  };
}

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
    accent: Schema.Attribute.String;
    blurBackground: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    buttons: Schema.Attribute.Component<'shared.hero-banner-button', true>;
    image: Schema.Attribute.Media<'images'>;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    meta: Schema.Attribute.JSON;
    mobileImage: Schema.Attribute.Media<'images'>;
    subtitle: Schema.Attribute.Text;
    text: Schema.Attribute.Text;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedHeroBannerButton extends Struct.ComponentSchema {
  collectionName: 'components_shared_hero_banner_buttons';
  info: {
    description: 'Button for the home page hero banner';
    displayName: 'Hero Banner Button';
  };
  attributes: {
    link: Schema.Attribute.String & Schema.Attribute.Required;
    text: Schema.Attribute.String & Schema.Attribute.Required;
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

export interface SharedTextItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_text_items';
  info: {
    description: 'Reusable single text item';
    displayName: 'Text Item';
  };
  attributes: {
    text: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'delivery.contact-section': DeliveryContactSection;
      'delivery.hero': DeliveryHero;
      'delivery.important-item': DeliveryImportantItem;
      'delivery.list-section': DeliveryListSection;
      'delivery.zone': DeliveryZone;
      'order.order-item': OrderOrderItem;
      'shared.category-description': SharedCategoryDescription;
      'shared.contacts': SharedContacts;
      'shared.delivery-date-range': SharedDeliveryDateRange;
      'shared.delivery-time-interval': SharedDeliveryTimeInterval;
      'shared.hero-banner': SharedHeroBanner;
      'shared.hero-banner-button': SharedHeroBannerButton;
      'shared.product-description-item': SharedProductDescriptionItem;
      'shared.seo': SharedSeo;
      'shared.social-link': SharedSocialLink;
      'shared.text-item': SharedTextItem;
    }
  }
}
