import nodemailer from "nodemailer";

export type InvoiceOrderItem = {
  productName?: string | null;
  quantity?: number | string | null;
  packageWeight?: number | string | null;
  unitName?: string | null;
  unitPrice?: number | string | null;
  itemWeight?: number | string | null;
  actualWeight?: number | string | null;
  itemTotal?: number | string | null;
};

export type InvoiceOrder = {
  id?: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  deliveryAddress?: string | null;
  deliveryRegion?: string | null;
  deliveryRegionCode?: string | null;
  deliveryDate?: string | null;
  deliveryTimeInterval?: string | null;
  deliveryCost?: number | string | null;
  comment?: string | null;
  totalItems: number | string;
  totalWeight: number | string;
  totalPrice: number | string;
  submittedAt: Date | string;
  items?: InvoiceOrderItem[];
};

type InvoiceEmailReason = "created" | "delivering";

const SMTP_PORT = toNumericValue(process.env.SMTP_PORT) ?? 465;
const SMTP_SECURE = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE.toLowerCase() === "true"
  : SMTP_PORT === 465;
const SMTP_CONNECTION_TIMEOUT =
  toNumericValue(process.env.SMTP_CONNECTION_TIMEOUT) ?? 5000;
const SMTP_GREETING_TIMEOUT =
  toNumericValue(process.env.SMTP_GREETING_TIMEOUT) ?? 5000;
const SMTP_SOCKET_TIMEOUT =
  toNumericValue(process.env.SMTP_SOCKET_TIMEOUT) ?? 10000;

const priceFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const weightFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 3,
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function isCustomerInvoiceEmailEnabled() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim() &&
      process.env.SMTP_FROM?.trim(),
  );
}

function toNumericValue(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().replace(",", ".");

    if (!normalizedValue) {
      return null;
    }

    const numericValue = Number(normalizedValue);

    return Number.isFinite(numericValue) ? numericValue : null;
  }

  return null;
}

function roundDecimal(value: number, fractionDigits = 2) {
  return Number(value.toFixed(fractionDigits));
}

function formatPrice(value: number | string | null | undefined) {
  const numericValue = toNumericValue(value);

  if (numericValue === null) {
    return String(value ?? 0);
  }

  return priceFormatter.format(numericValue);
}

function formatWeight(value: number | string | null | undefined) {
  const numericValue = toNumericValue(value);

  if (numericValue === null) {
    return "0";
  }

  return weightFormatter.format(numericValue);
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return dateFormatter.format(date);
}

function formatComment(value: string | null | undefined) {
  if (!value || !value.trim()) {
    return "—";
  }

  return value.trim();
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isWeightUnitName(unitName: string | null | undefined) {
  const normalizedUnitName = unitName?.trim().toLowerCase();

  return normalizedUnitName === "кг" || normalizedUnitName === "kg";
}

function getOrderedWeight(item: InvoiceOrderItem) {
  const packageWeight = toNumericValue(item.packageWeight) ?? 0;
  const quantity = toNumericValue(item.quantity) ?? 0;

  return roundDecimal(packageWeight * quantity, 3);
}

function getPrintableItemMeasure(item: InvoiceOrderItem) {
  return isWeightUnitName(item.unitName)
    ? (toNumericValue(item.actualWeight ?? item.itemWeight) ??
        getOrderedWeight(item))
    : getOrderedWeight(item);
}

function getItemMeasureLabel(item: InvoiceOrderItem) {
  return isWeightUnitName(item.unitName) ? "Факт. вес" : "Факт. кол-во";
}

function getPricedItemMeasure(item: InvoiceOrderItem) {
  if (isWeightUnitName(item.unitName)) {
    return getPrintableItemMeasure(item);
  }

  return Math.max(Math.trunc(toNumericValue(item.quantity) ?? 0), 0);
}

function getItemUnitPrice(item: InvoiceOrderItem) {
  const unitPrice = toNumericValue(item.unitPrice);

  if (unitPrice !== null && unitPrice > 0) {
    return unitPrice;
  }

  const itemTotal = toNumericValue(item.itemTotal);
  const pricedMeasure = getPricedItemMeasure(item);

  if (itemTotal !== null && pricedMeasure > 0) {
    return itemTotal / pricedMeasure;
  }

  return null;
}

export function buildCustomerInvoiceHtml(order: InvoiceOrder) {
  const items = order.items ?? [];
  const totalPrice = toNumericValue(order.totalPrice) ?? 0;
  const deliveryCost = toNumericValue(order.deliveryCost) ?? 0;
  const totalWithDelivery = roundDecimal(totalPrice + deliveryCost);
  const rows = items
    .map((item, index) => {
      const quantity = toNumericValue(item.quantity) ?? 0;
      const actualMeasure = getPrintableItemMeasure(item);
      const unitPrice = getItemUnitPrice(item);

      return `
        <tr>
          <td class="cell muted" style="border:1px solid #d1d5db;padding:8px 6px;vertical-align:top;color:#6b7280;">${index + 1}</td>
          <td class="cell name" style="border:1px solid #d1d5db;padding:8px 6px;vertical-align:top;font-weight:600;width:30%;">${escapeHtml(item.productName || `Позиция ${index + 1}`)}</td>
          <td class="cell numeric" style="border:1px solid #d1d5db;padding:8px 6px;vertical-align:top;text-align:right;white-space:nowrap;">${escapeHtml(quantity)}</td>
          <td class="cell numeric" style="border:1px solid #d1d5db;padding:8px 6px;vertical-align:top;text-align:right;white-space:nowrap;">${escapeHtml(getItemMeasureLabel(item))}: ${escapeHtml(formatWeight(actualMeasure))} ${escapeHtml(item.unitName ?? "")}</td>
          <td class="cell numeric" style="border:1px solid #d1d5db;padding:8px 6px;vertical-align:top;text-align:right;white-space:nowrap;">${escapeHtml(unitPrice === null ? "—" : formatPrice(unitPrice))}</td>
          <td class="cell numeric total" style="border:1px solid #d1d5db;padding:8px 6px;vertical-align:top;text-align:right;white-space:nowrap;font-weight:700;">${escapeHtml(formatPrice(item.itemTotal ?? 0))}</td>
        </tr>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <title>Накладная ${escapeHtml(order.orderNumber)}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #1f2933;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        line-height: 1.35;
      }
      .page { width: 100%; }
      .header {
        align-items: flex-start;
        border-bottom: 2px solid #1f2933;
        display: flex;
        justify-content: space-between;
        gap: 24px;
        padding-bottom: 16px;
      }
      h1 { font-size: 26px; line-height: 1.1; margin: 0 0 8px; }
      .meta { color: #5c6670; font-size: 12px; }
      .order-number { font-size: 18px; font-weight: 700; text-align: right; }
      .section { margin-top: 18px; }
      .grid {
        display: grid;
        gap: 8px 24px;
        grid-template-columns: 1fr 1fr;
      }
      .label {
        color: #6b7280;
        font-size: 10px;
        letter-spacing: .04em;
        text-transform: uppercase;
      }
      .value { font-size: 13px; font-weight: 600; margin-top: 2px; }
      table { border-collapse: collapse; margin-top: 10px; width: 100%; }
      th {
        background: #f3f4f6;
        border: 1px solid #d1d5db;
        color: #374151;
        font-size: 10px;
        padding: 8px 6px;
        text-align: left;
        text-transform: uppercase;
      }
      .cell { border: 1px solid #d1d5db; padding: 8px 6px; vertical-align: top; }
      .name { font-weight: 600; width: 30%; }
      .numeric { text-align: right; white-space: nowrap; }
      .muted { color: #6b7280; }
      .total { font-weight: 700; }
      .summary { display: flex; justify-content: flex-end; margin-top: 12px; }
      .summary-table { margin: 0; width: 280px; }
      .summary-table td { border: 1px solid #d1d5db; padding: 8px; }
      .summary-table td:last-child { font-weight: 700; text-align: right; }
      .comment {
        border: 1px solid #d1d5db;
        margin-top: 10px;
        min-height: 44px;
        padding: 10px;
        white-space: pre-wrap;
      }
      @media print {
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
      }
    </style>
  </head>
  <body style="margin:0;color:#1f2933;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.35;background:#ffffff;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="page" style="border-collapse:collapse;width:100%;margin:0;color:#1f2933;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.35;">
      <tr>
        <td style="padding:0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="header" style="border-collapse:collapse;width:100%;border-bottom:2px solid #1f2933;margin:0;">
            <tr>
              <td style="padding:0 24px 16px 0;vertical-align:top;">
                <h1 style="font-size:26px;line-height:1.1;margin:0 0 8px;font-weight:700;">Накладная</h1>
                <div class="meta" style="color:#5c6670;font-size:12px;">Для комплектации и вложения в заказ</div>
              </td>
              <td style="padding:0 0 16px 24px;vertical-align:top;text-align:right;white-space:nowrap;">
                <div class="order-number" style="font-size:18px;font-weight:700;text-align:right;">${escapeHtml(order.orderNumber)}</div>
                <div class="meta" style="color:#5c6670;font-size:12px;">${escapeHtml(formatDate(order.submittedAt))}</div>
              </td>
            </tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="section grid" style="border-collapse:collapse;width:100%;margin-top:18px;">
            <tr>
              <td style="padding:0 24px 8px 0;vertical-align:top;width:50%;">
                <div class="label" style="color:#6b7280;font-size:10px;letter-spacing:.04em;text-transform:uppercase;">Получатель</div>
                <div class="value" style="font-size:13px;font-weight:600;margin-top:2px;">${escapeHtml(order.customerName)}</div>
              </td>
              <td style="padding:0 0 8px 0;vertical-align:top;width:50%;">
                <div class="label" style="color:#6b7280;font-size:10px;letter-spacing:.04em;text-transform:uppercase;">Телефон</div>
                <div class="value" style="font-size:13px;font-weight:600;margin-top:2px;">${escapeHtml(order.customerPhone)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 8px 0;vertical-align:top;width:50%;">
                <div class="label" style="color:#6b7280;font-size:10px;letter-spacing:.04em;text-transform:uppercase;">Email</div>
                <div class="value" style="font-size:13px;font-weight:600;margin-top:2px;">${escapeHtml(formatComment(order.customerEmail))}</div>
              </td>
              <td style="padding:0 0 8px 0;vertical-align:top;width:50%;">
                <div class="label" style="color:#6b7280;font-size:10px;letter-spacing:.04em;text-transform:uppercase;">Адрес доставки</div>
                <div class="value" style="font-size:13px;font-weight:600;margin-top:2px;">${escapeHtml(formatComment(order.deliveryAddress))}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 8px 0;vertical-align:top;width:50%;">
                <div class="label" style="color:#6b7280;font-size:10px;letter-spacing:.04em;text-transform:uppercase;">Регион доставки</div>
                <div class="value" style="font-size:13px;font-weight:600;margin-top:2px;">${escapeHtml(formatComment(order.deliveryRegion))} (${escapeHtml(formatComment(order.deliveryRegionCode))})</div>
              </td>
              <td style="padding:0 0 8px 0;vertical-align:top;width:50%;">
                <div class="label" style="color:#6b7280;font-size:10px;letter-spacing:.04em;text-transform:uppercase;">Дата доставки</div>
                <div class="value" style="font-size:13px;font-weight:600;margin-top:2px;">${escapeHtml(formatComment(order.deliveryDate))}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 0 0;vertical-align:top;width:50%;">
                <div class="label" style="color:#6b7280;font-size:10px;letter-spacing:.04em;text-transform:uppercase;">Интервал доставки</div>
                <div class="value" style="font-size:13px;font-weight:600;margin-top:2px;">${escapeHtml(formatComment(order.deliveryTimeInterval))}</div>
              </td>
              <td style="padding:0;vertical-align:top;width:50%;">&nbsp;</td>
            </tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="section" style="border-collapse:collapse;width:100%;margin-top:18px;">
            <tr>
              <td style="padding:0;">
                <div class="label" style="color:#6b7280;font-size:10px;letter-spacing:.04em;text-transform:uppercase;">Состав заказа</div>
                <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:10px;width:100%;">
                  <thead>
                    <tr>
                      <th style="background:#f3f4f6;border:1px solid #d1d5db;color:#374151;font-size:10px;padding:8px 6px;text-align:left;text-transform:uppercase;">№</th>
                      <th style="background:#f3f4f6;border:1px solid #d1d5db;color:#374151;font-size:10px;padding:8px 6px;text-align:left;text-transform:uppercase;">Товар</th>
                      <th style="background:#f3f4f6;border:1px solid #d1d5db;color:#374151;font-size:10px;padding:8px 6px;text-align:left;text-transform:uppercase;">Кол-во</th>
                      <th style="background:#f3f4f6;border:1px solid #d1d5db;color:#374151;font-size:10px;padding:8px 6px;text-align:left;text-transform:uppercase;">Факт.</th>
                      <th style="background:#f3f4f6;border:1px solid #d1d5db;color:#374151;font-size:10px;padding:8px 6px;text-align:left;text-transform:uppercase;">Цена за 1 кг/шт</th>
                      <th style="background:#f3f4f6;border:1px solid #d1d5db;color:#374151;font-size:10px;padding:8px 6px;text-align:left;text-transform:uppercase;">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows || '<tr><td class="cell" colspan="6" style="border:1px solid #d1d5db;padding:8px 6px;vertical-align:top;">Позиции заказа не найдены.</td></tr>'}
                  </tbody>
                </table>
              </td>
            </tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="summary" style="border-collapse:collapse;width:100%;margin-top:12px;">
            <tr>
              <td style="padding:0;">&nbsp;</td>
              <td style="padding:0;width:280px;vertical-align:top;">
                <table cellpadding="0" cellspacing="0" border="0" class="summary-table" style="border-collapse:collapse;margin:0;width:280px;">
                  <tbody>
                    <tr>
                      <td style="border:1px solid #d1d5db;padding:8px;">Позиций</td>
                      <td style="border:1px solid #d1d5db;padding:8px;font-weight:700;text-align:right;">${escapeHtml(order.totalItems)}</td>
                    </tr>
                    <tr>
                      <td style="border:1px solid #d1d5db;padding:8px;">Вес весовых позиций</td>
                      <td style="border:1px solid #d1d5db;padding:8px;font-weight:700;text-align:right;">${escapeHtml(formatWeight(order.totalWeight))} кг</td>
                    </tr>
                    <tr>
                      <td style="border:1px solid #d1d5db;padding:8px;">Итого</td>
                      <td style="border:1px solid #d1d5db;padding:8px;font-weight:700;text-align:right;">${escapeHtml(formatPrice(order.totalPrice))}</td>
                    </tr>
                    <tr>
                      <td style="border:1px solid #d1d5db;padding:8px;">Стоимость доставки</td>
                      <td style="border:1px solid #d1d5db;padding:8px;font-weight:700;text-align:right;">${escapeHtml(formatPrice(order.deliveryCost ?? 0))}</td>
                    </tr>
                    <tr>
                      <td style="border:1px solid #d1d5db;padding:8px;">Итого с учетом доставки</td>
                      <td style="border:1px solid #d1d5db;padding:8px;font-weight:700;text-align:right;">${escapeHtml(formatPrice(totalWithDelivery))}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="section" style="border-collapse:collapse;width:100%;margin-top:18px;">
            <tr>
              <td style="padding:0;">
                <div class="label" style="color:#6b7280;font-size:10px;letter-spacing:.04em;text-transform:uppercase;">Комментарий</div>
                <div class="comment" style="border:1px solid #d1d5db;margin-top:10px;min-height:44px;padding:10px;white-space:pre-wrap;">${escapeHtml(formatComment(order.comment))}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildCustomerInvoiceText(
  order: InvoiceOrder,
  reason: InvoiceEmailReason,
) {
  const totalPrice = toNumericValue(order.totalPrice) ?? 0;
  const deliveryCost = toNumericValue(order.deliveryCost) ?? 0;
  const totalWithDelivery = roundDecimal(totalPrice + deliveryCost);
  const statusLine =
    reason === "delivering"
      ? 'Ваш заказ переведен в статус "Отгружается".'
      : "Ваш заказ принят в работу.";

  return [
    statusLine,
    "",
    `Накладная к заказу ${order.orderNumber}`,
    `Получатель: ${order.customerName}`,
    `Телефон: ${order.customerPhone}`,
    `Адрес доставки: ${formatComment(order.deliveryAddress)}`,
    `Дата доставки: ${formatComment(order.deliveryDate)}`,
    `Интервал доставки: ${formatComment(order.deliveryTimeInterval)}`,
    "",
    `Итого: ${formatPrice(order.totalPrice)}`,
    `Стоимость доставки: ${formatPrice(order.deliveryCost ?? 0)}`,
    `Итого с учетом доставки: ${formatPrice(totalWithDelivery)}`,
  ].join("\n");
}

function getInvoiceSubject(order: InvoiceOrder, reason: InvoiceEmailReason) {
  if (reason === "delivering") {
    return `Заказ от TiliMili ${order.orderNumber} отгружается`;
  }

  return `Накладная к заказу TiliMili ${order.orderNumber}`;
}

export async function sendCustomerInvoiceEmail(
  order: InvoiceOrder,
  reason: InvoiceEmailReason = "created",
) {
  const customerEmail = order.customerEmail?.trim();

  if (!customerEmail || !isCustomerInvoiceEmailEnabled()) {
    return false;
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

  const html = buildCustomerInvoiceHtml(order);

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: customerEmail,
    subject: getInvoiceSubject(order, reason),
    text: buildCustomerInvoiceText(order, reason),
    html,
  });

  return true;
}
