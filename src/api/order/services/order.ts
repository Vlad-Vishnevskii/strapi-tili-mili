import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import nodemailer from 'nodemailer';

type RawPayload = {
  customerName?: unknown;
  customerPhone?: unknown;
  customerEmail?: unknown;
  deliveryAddress?: unknown;
  comment?: unknown;
  items?: unknown;
};

type NormalizedOrderItemInput = {
  productId: number;
  quantity: number;
  packageWeight: number;
};

type NormalizedOrderRequest = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  comment?: string;
  items: NormalizedOrderItemInput[];
};

type ProductRecord = {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  price: number | string;
  unitName: string;
  unitValue?: number | string | null;
  freezeLabel?: string | null;
  promoLabel?: string | null;
  isOutOfStock?: boolean | null;
};

const FREE_DELIVERY_THRESHOLD = toFiniteNumber(process.env.ORDER_FREE_DELIVERY_THRESHOLD, 0);
const SMTP_PORT = toFiniteNumber(process.env.SMTP_PORT, 465);
const SMTP_SECURE = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE.toLowerCase() === 'true'
  : SMTP_PORT === 465;
const SMTP_CONNECTION_TIMEOUT = toFiniteNumber(process.env.SMTP_CONNECTION_TIMEOUT, 5000);
const SMTP_GREETING_TIMEOUT = toFiniteNumber(process.env.SMTP_GREETING_TIMEOUT, 5000);
const SMTP_SOCKET_TIMEOUT = toFiniteNumber(process.env.SMTP_SOCKET_TIMEOUT, 10000);

function getNotificationRecipient() {
  return process.env.ORDER_NOTIFICATIONS_TO?.trim();
}

function isEmailNotificationEnabled() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim() &&
      process.env.SMTP_FROM?.trim() &&
      getNotificationRecipient()
  );
}

function toFiniteNumber(value: unknown, fallback?: number) {
  const numericValue = typeof value === 'number' ? value : Number(value);

  if (Number.isFinite(numericValue)) {
    return numericValue;
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new errors.ValidationError('Expected a finite number value.');
}

function roundDecimal(value: number, fractionDigits = 2) {
  return Number(value.toFixed(fractionDigits));
}

function requireNonEmptyString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new errors.ValidationError(`Field "${fieldName}" is required.`);
  }

  return value.trim();
}

function requireEmail(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new errors.ValidationError(`Field "${fieldName}" is required.`);
  }

  const normalizedValue = value.trim().toLowerCase();

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalizedValue)) {
    throw new errors.ValidationError(`Field "${fieldName}" must be a valid email address.`);
  }

  return normalizedValue;
}

function normalizeOrderRequest(payload: RawPayload): NormalizedOrderRequest {
  const customerName = requireNonEmptyString(payload.customerName, 'customerName');
  const customerPhone = requireNonEmptyString(payload.customerPhone, 'customerPhone');
  const customerEmail = requireEmail(payload.customerEmail, 'customerEmail');
  const deliveryAddress = requireNonEmptyString(payload.deliveryAddress, 'deliveryAddress');

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new errors.ValidationError('Field "items" must be a non-empty array.');
  }

  const items = payload.items.map((rawItem, index) => {
    if (!rawItem || typeof rawItem !== 'object') {
      throw new errors.ValidationError(`Item at index ${index} must be an object.`);
    }

    const item = rawItem as Record<string, unknown>;
    const productId = toFiniteNumber(item.productId);
    const quantity = toFiniteNumber(item.quantity);
    const packageWeight = toFiniteNumber(item.packageWeight);

    if (!Number.isInteger(productId) || productId <= 0) {
      throw new errors.ValidationError(`Item at index ${index} has invalid "productId".`);
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new errors.ValidationError(`Item at index ${index} has invalid "quantity".`);
    }

    if (packageWeight <= 0) {
      throw new errors.ValidationError(`Item at index ${index} has invalid "packageWeight".`);
    }

    return {
      productId,
      quantity,
      packageWeight,
    };
  });

  const comment =
    typeof payload.comment === 'string' && payload.comment.trim() ? payload.comment.trim() : undefined;

  return {
    customerName,
    customerPhone,
    customerEmail,
    deliveryAddress,
    comment,
    items,
  };
}

function buildOrderNumber(orderId: number, submittedAt: Date) {
  const year = submittedAt.getFullYear();
  const month = String(submittedAt.getMonth() + 1).padStart(2, '0');
  const day = String(submittedAt.getDate()).padStart(2, '0');
  const paddedId = String(orderId).padStart(6, '0');

  return `ORD-${year}${month}${day}-${paddedId}`;
}

async function sendNewOrderNotification(order: {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  comment?: string;
  totalItems: number;
  totalWeight: number;
  totalPrice: number;
  amountLeftForFreeDelivery: number;
  submittedAt: Date;
  items: Array<{
    productName: string;
    quantity: number;
    packageWeight: number;
    itemWeight: number;
    unitPrice: number;
    itemTotal: number;
    unitName: string;
  }>;
}) {
  if (!isEmailNotificationEnabled()) {
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    connectionTimeout: SMTP_CONNECTION_TIMEOUT,
    greetingTimeout: SMTP_GREETING_TIMEOUT,
    socketTimeout: SMTP_SOCKET_TIMEOUT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const itemLines = order.items
    .map((item, index) => {
      return [
        `${index + 1}. ${item.productName}`,
        `   Кол-во: ${item.quantity}`,
        `   Фасовка: ${item.packageWeight} ${item.unitName}`,
        `   Вес позиции: ${item.itemWeight}`,
        `   Цена за единицу: ${item.unitPrice}`,
        `   Сумма позиции: ${item.itemTotal}`,
      ].join('\n');
    })
    .join('\n\n');

  const text = [
    `Новый заказ на сайте`,
    ``,
    `Номер заказа: ${order.orderNumber}`,
    `ID заказа: ${order.id}`,
    `Дата: ${order.submittedAt.toISOString()}`,
    ``,
    `Клиент: ${order.customerName}`,
    `Телефон: ${order.customerPhone}`,
    `Email: ${order.customerEmail || '-'}`,
    `Адрес: ${order.deliveryAddress}`,
    `Комментарий: ${order.comment || '-'}`,
    ``,
    `Товаров: ${order.totalItems}`,
    `Общий вес: ${order.totalWeight}`,
    `Общая сумма: ${order.totalPrice}`,
    `Осталось до бесплатной доставки: ${order.amountLeftForFreeDelivery}`,
    ``,
    `Состав заказа:`,
    itemLines,
  ].join('\n');

  const htmlItems = order.items
    .map((item, index) => {
      return `
        <li>
          <strong>${index + 1}. ${item.productName}</strong><br />
          Кол-во: ${item.quantity}<br />
          Фасовка: ${item.packageWeight} ${item.unitName}<br />
          Вес позиции: ${item.itemWeight}<br />
          Цена за единицу: ${item.unitPrice}<br />
          Сумма позиции: ${item.itemTotal}
        </li>
      `;
    })
    .join('');

  const html = `
    <h2>Новый заказ на сайте</h2>
    <p><strong>Номер заказа:</strong> ${order.orderNumber}</p>
    <p><strong>ID заказа:</strong> ${order.id}</p>
    <p><strong>Дата:</strong> ${order.submittedAt.toISOString()}</p>
    <hr />
    <p><strong>Клиент:</strong> ${order.customerName}</p>
    <p><strong>Телефон:</strong> ${order.customerPhone}</p>
    <p><strong>Email:</strong> ${order.customerEmail || '-'}</p>
    <p><strong>Адрес:</strong> ${order.deliveryAddress}</p>
    <p><strong>Комментарий:</strong> ${order.comment || '-'}</p>
    <hr />
    <p><strong>Товаров:</strong> ${order.totalItems}</p>
    <p><strong>Общий вес:</strong> ${order.totalWeight}</p>
    <p><strong>Общая сумма:</strong> ${order.totalPrice}</p>
    <p><strong>Осталось до бесплатной доставки:</strong> ${order.amountLeftForFreeDelivery}</p>
    <hr />
    <h3>Состав заказа</h3>
    <ol>${htmlItems}</ol>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: getNotificationRecipient(),
    subject: `Новый заказ ${order.orderNumber}`,
    text,
    html,
  });
}

export default factories.createCoreService('api::order.order' as any, ({ strapi }) => ({
  async createFromRequest(rawPayload: RawPayload) {
    const payload = normalizeOrderRequest(rawPayload);
    const submittedAt = new Date();
    const uniqueProductIds = [...new Set(payload.items.map((item) => item.productId))];

    const products = (await strapi.db.query('api::product.product').findMany({
      where: {
        id: {
          $in: uniqueProductIds,
        },
        publishedAt: {
          $notNull: true,
        },
      },
      select: ['id', 'documentId', 'name', 'slug', 'price', 'unitName', 'unitValue', 'freezeLabel', 'promoLabel', 'isOutOfStock'],
    })) as ProductRecord[];

    const productById = new Map(products.map((product) => [Number(product.id), product]));
    const missingProductIds = uniqueProductIds.filter((productId) => !productById.has(productId));

    if (missingProductIds.length > 0) {
      throw new errors.ValidationError(`Products not found: ${missingProductIds.join(', ')}.`);
    }

    let totalItems = 0;
    let totalWeight = 0;
    let totalPrice = 0;

    const orderItems = payload.items.map((item) => {
      const product = productById.get(item.productId);

      if (!product) {
        throw new errors.ValidationError(`Product ${item.productId} not found.`);
      }

      const unitPrice = roundDecimal(toFiniteNumber(product.price));
      const itemWeight = roundDecimal(item.packageWeight * item.quantity, 3);
      const itemTotal = roundDecimal(unitPrice * item.packageWeight * item.quantity);

      totalItems += item.quantity;
      totalWeight += itemWeight;
      totalPrice += itemTotal;

      return {
        product: product.id,
        productName: product.name,
        productSlug: product.slug,
        unitName: product.unitName,
        unitPrice,
        packageWeight: roundDecimal(item.packageWeight, 3),
        quantity: item.quantity,
        itemWeight,
        itemTotal,
        freezeLabel: product.freezeLabel ?? null,
        productSnapshot: {
          id: product.id,
          documentId: product.documentId ?? null,
          name: product.name,
          slug: product.slug,
          price: unitPrice,
          unitName: product.unitName,
          unitValue: roundDecimal(toFiniteNumber(product.unitValue, 1), 3),
          freezeLabel: product.freezeLabel ?? null,
          promoLabel: product.promoLabel ?? null,
          isOutOfStock: Boolean(product.isOutOfStock),
          capturedAt: submittedAt.toISOString(),
        },
      };
    });

    const roundedTotalWeight = roundDecimal(totalWeight, 3);
    const roundedTotalPrice = roundDecimal(totalPrice);
    const amountLeftForFreeDelivery = roundDecimal(
      Math.max(FREE_DELIVERY_THRESHOLD - roundedTotalPrice, 0)
    );

    const provisionalOrderNumber = `PENDING-${Date.now()}`;

    const createdOrder = await strapi.entityService.create('api::order.order' as any, {
      data: {
        orderNumber: provisionalOrderNumber,
        status: 'new',
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        customerEmail: payload.customerEmail ?? null,
        deliveryAddress: payload.deliveryAddress,
        comment: payload.comment ?? null,
        totalItems,
        totalWeight: roundedTotalWeight,
        totalPrice: roundedTotalPrice,
        amountLeftForFreeDelivery,
        source: 'site',
        submittedAt,
        items: orderItems,
      } as any,
    });

    const orderId = Number(createdOrder.id);
    const orderNumber = buildOrderNumber(orderId, submittedAt);

    await strapi.entityService.update('api::order.order' as any, orderId, {
      data: {
        orderNumber,
      },
    });

    void sendNewOrderNotification({
      id: orderId,
      orderNumber,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerEmail: payload.customerEmail,
      deliveryAddress: payload.deliveryAddress,
      comment: payload.comment,
      totalItems,
      totalWeight: roundedTotalWeight,
      totalPrice: roundedTotalPrice,
      amountLeftForFreeDelivery,
      submittedAt,
      items: orderItems.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        packageWeight: item.packageWeight,
        itemWeight: item.itemWeight,
        unitPrice: item.unitPrice,
        itemTotal: item.itemTotal,
        unitName: item.unitName,
      })),
    }).catch((error) => {
      strapi.log.error(`Failed to send order notification for ${orderNumber}`, error);
    });

    return {
      id: orderId,
      orderNumber,
    };
  },
}));
