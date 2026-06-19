import * as React from "react";
import { Page, useFetchClient, useNotification } from "@strapi/strapi/admin";
import {
  Box,
  Button,
  DatePicker,
  Flex,
  Loader,
  MultiSelect,
  MultiSelectOption,
  SingleSelect,
  SingleSelectOption,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from "@strapi/design-system";
import { Eye, FilePdf } from "@strapi/icons";

type Period = "all" | "today" | "yesterday" | "month" | "custom";
type OrderStatus = "new" | "delivering" | "done" | "cancelled";
type City = "msk" | "spb";

type Relation = {
  id?: number;
  documentId?: string;
  name?: string;
  slug?: string;
} | null;

type OrderItem = {
  product?: number | Relation;
  productName?: string | null;
  productSlug?: string | null;
  quantity?: number | string | null;
  unitName?: string | null;
  itemWeight?: number | string | null;
  actualWeight?: number | string | null;
  itemTotal?: number | string | null;
  productSnapshot?: Record<string, unknown> | null;
};

type Order = {
  id: number;
  documentId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  deliveryRegionCode?: City | null;
  submittedAt: string;
  items?: OrderItem[];
};

type Product = {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  category?: Relation;
};

type Category = {
  id: number;
  documentId?: string;
  name: string;
  slug?: string;
};

type CollectionResponse<T> = {
  results?: T[];
  pagination?: {
    page?: number;
    pageCount?: number;
  };
};

type ReportRow = {
  key: string;
  name: string;
  category: string;
  unit: string;
  measure: number;
  cost: number;
  orders: Array<{ number: string; measure: number }>;
};

type Report = {
  rows: ReportRow[];
  orderCount: number;
  totalCost: number;
  createdAt: Date;
  periodLabel: string;
  statusesLabel: string;
  categoriesLabel: string;
  citiesLabel: string;
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Новый",
  delivering: "Отгружается",
  done: "Завершён",
  cancelled: "Отменён",
};

const CITY_LABELS: Record<City, string> = {
  msk: "Москва",
  spb: "Санкт-Петербург",
};

const STATUS_OPTIONS = Object.keys(STATUS_LABELS) as OrderStatus[];
const CITY_OPTIONS = Object.keys(CITY_LABELS) as City[];
const PAGE_SIZE = 100;

const numberFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 3,
});
const moneyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const toNumber = (value: unknown) => {
  const parsed =
    typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isWeightUnit = (unit: string | null | undefined) =>
  unit?.trim().toLowerCase() === "кг" || unit?.trim().toLowerCase() === "kg";

const startOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

const getPeriodBounds = (
  period: Period,
  from?: Date,
  to?: Date,
): { from?: Date; to?: Date } => {
  const now = new Date();

  if (period === "all") return {};
  if (period === "today") return { from: startOfDay(now), to: endOfDay(now) };
  if (period === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
  }
  if (period === "month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }

  return {
    from: from ? startOfDay(from) : undefined,
    to: to ? endOfDay(to) : undefined,
  };
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

const OrdersReportPage = () => {
  const { get } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  const [period, setPeriod] = React.useState<Period>("all");
  const [dateFrom, setDateFrom] = React.useState<Date>();
  const [dateTo, setDateTo] = React.useState<Date>();
  const [statuses, setStatuses] = React.useState<string[]>(STATUS_OPTIONS);
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(
    [],
  );
  const [cities, setCities] = React.useState<string[]>(CITY_OPTIONS);
  const [report, setReport] = React.useState<Report>();

  const loadAll = React.useCallback(
    async <T,>(uid: string, extraQuery = "") => {
      const result: T[] = [];
      let page = 1;
      let pageCount = 1;

      do {
        const response = await get<CollectionResponse<T>>(
          `/content-manager/collection-types/${uid}?page=${page}&pageSize=${PAGE_SIZE}${extraQuery}`,
        );
        result.push(
          ...(Array.isArray(response.data?.results)
            ? response.data.results
            : []),
        );
        pageCount = Math.max(response.data?.pagination?.pageCount ?? 1, 1);
        page += 1;
      } while (page <= pageCount);

      return result;
    },
    [get],
  );

  React.useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const [nextOrders, nextProducts, nextCategories] = await Promise.all([
          loadAll<Order>("api::order.order", "&sort=submittedAt:desc"),
          loadAll<Product>("api::product.product", "&sort=name:asc"),
          loadAll<Category>("api::category.category", "&sort=sortOrder:asc"),
        ]);
        setOrders(nextOrders);
        setProducts(nextProducts);
        setCategories(nextCategories);
      } catch {
        setHasError(true);
        toggleNotification({
          type: "danger",
          message: "Не удалось загрузить данные для отчёта.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    void loadData();
  }, [loadAll, toggleNotification]);

  const createReport = React.useCallback(() => {
    const bounds = getPeriodBounds(period, dateFrom, dateTo);
    const hasDateFilter = Boolean(bounds.from && bounds.to);

    if (period === "custom" && !hasDateFilter) {
      toggleNotification({
        type: "warning",
        message: "Укажите начало и конец периода.",
      });
      return;
    }
    if (bounds.from && bounds.to && bounds.from > bounds.to) {
      toggleNotification({
        type: "warning",
        message: "Дата начала не может быть позже даты окончания.",
      });
      return;
    }

    const productBySlug = new Map(
      products.map((product) => [product.slug, product]),
    );
    const productById = new Map(
      products.map((product) => [product.id, product]),
    );
    const categoryNames = new Set(selectedCategories);
    const grouped = new Map<string, ReportRow>();
    let orderCount = 0;

    orders.forEach((order) => {
      const submittedAt = new Date(order.submittedAt);
      if (
        (hasDateFilter &&
          (Number.isNaN(submittedAt.getTime()) ||
            submittedAt < bounds.from! ||
            submittedAt > bounds.to!)) ||
        !statuses.includes(order.orderStatus) ||
        !order.deliveryRegionCode ||
        !cities.includes(order.deliveryRegionCode)
      )
        return;

      let hasIncludedItems = false;
      (order.items ?? []).forEach((item) => {
        const relationId =
          typeof item.product === "number" ? item.product : item.product?.id;
        const product =
          (item.productSlug
            ? productBySlug.get(item.productSlug)
            : undefined) ??
          (relationId ? productById.get(relationId) : undefined);
        const category = product?.category?.name?.trim() || "Без категории";
        if (categoryNames.size > 0 && !categoryNames.has(category)) return;

        hasIncludedItems = true;
        const unit = isWeightUnit(item.unitName)
          ? "кг"
          : item.unitName?.trim() || "шт";
        const measure = isWeightUnit(item.unitName)
          ? toNumber(item.actualWeight ?? item.itemWeight)
          : toNumber(item.quantity);
        const key =
          item.productSlug ||
          product?.slug ||
          `${item.productName ?? "Товар"}:${unit}`;
        const current = grouped.get(key) ?? {
          key,
          name:
            item.productName?.trim() || product?.name || "Товар без названия",
          category,
          unit,
          measure: 0,
          cost: 0,
          orders: [],
        };
        current.measure += measure;
        current.cost += toNumber(item.itemTotal);
        current.orders.push({ number: order.orderNumber, measure });
        grouped.set(key, current);
      });
      if (hasIncludedItems) orderCount += 1;
    });

    const rows = Array.from(grouped.values()).sort(
      (left, right) =>
        left.category.localeCompare(right.category, "ru") ||
        left.name.localeCompare(right.name, "ru"),
    );
    setReport({
      rows,
      orderCount,
      totalCost: rows.reduce((sum, row) => sum + row.cost, 0),
      createdAt: new Date(),
      periodLabel:
        bounds.from && bounds.to
          ? `${dateFormatter.format(bounds.from)} — ${dateFormatter.format(bounds.to)}`
          : "Все даты",
      statusesLabel:
        statuses.length === STATUS_OPTIONS.length
          ? "Все статусы"
          : statuses
              .map((status) => STATUS_LABELS[status as OrderStatus])
              .join(", ") || "Не выбраны",
      categoriesLabel: selectedCategories.length
        ? selectedCategories.join(", ")
        : "Все категории",
      citiesLabel:
        cities.length === CITY_OPTIONS.length
          ? "Все города"
          : cities.map((city) => CITY_LABELS[city as City]).join(", ") ||
            "Не выбраны",
    });
  }, [
    cities,
    dateFrom,
    dateTo,
    orders,
    period,
    products,
    selectedCategories,
    statuses,
    toggleNotification,
  ]);

  const printReport = React.useCallback(() => {
    if (!report) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toggleNotification({
        type: "warning",
        message: "Разрешите всплывающие окна для печати отчёта.",
      });
      return;
    }
    printWindow.opener = null;
    const rows = report.rows
      .map(
        (row, index) => `<tr>
      <td>${index + 1}</td><td>${escapeHtml(row.name)}</td>
      <td class="num">${escapeHtml(numberFormatter.format(row.measure))} ${escapeHtml(row.unit)}</td>
      <td>${row.orders.map((entry) => `${escapeHtml(entry.number)} — ${escapeHtml(numberFormatter.format(entry.measure))} ${escapeHtml(row.unit)}`).join("<br>")}</td>
      <td class="num">${escapeHtml(moneyFormatter.format(row.cost))}</td><td>${escapeHtml(row.category)}</td>
    </tr>`,
      )
      .join("");
    printWindow.document
      .write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Отчёт по заказам</title><style>
      @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font:11px Arial,sans-serif;color:#172b4d;margin:0}h1{font-size:20px;margin:0 0 8px}.meta{line-height:1.55;margin-bottom:16px;color:#4a5568}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd5e0;padding:7px;text-align:left;vertical-align:top}th{background:#edf2f7;font-size:9px;text-transform:uppercase}.num{text-align:right;white-space:nowrap}tfoot td{font-weight:bold}.empty{text-align:center;padding:24px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body><h1>Отчёт «Товары в заказах»</h1><div class="meta">
      Период: ${escapeHtml(report.periodLabel)}<br>Статусы: ${escapeHtml(report.statusesLabel)}<br>
      Категории: ${escapeHtml(report.categoriesLabel)}<br>Города: ${escapeHtml(report.citiesLabel)}<br>
      Заказов: ${report.orderCount}. Сформирован: ${escapeHtml(report.createdAt.toLocaleString("ru-RU"))}
    </div><table><thead><tr><th>№</th><th>Наименование товара</th><th>Количество / вес</th><th>В заказах</th><th>Стоимость</th><th>Категория</th></tr></thead>
    <tbody>${rows || '<tr><td class="empty" colspan="6">По выбранным условиям данных нет</td></tr>'}</tbody>
    <tfoot><tr><td colspan="4">Итого</td><td class="num">${escapeHtml(moneyFormatter.format(report.totalCost))}</td><td>${report.rows.length} поз.</td></tr></tfoot></table>
    <script>window.addEventListener('load',()=>{window.print();});<\/script></body></html>`);
    printWindow.document.close();
  }, [report, toggleNotification]);

  if (isLoading)
    return (
      <>
        <Page.Title>Отчёт по заказам</Page.Title>
        <Page.Main>
          <Flex justifyContent="center" paddingTop={10}>
            <Loader>Загружаю данные...</Loader>
          </Flex>
        </Page.Main>
      </>
    );
  if (hasError)
    return (
      <>
        <Page.Title>Отчёт по заказам</Page.Title>
        <Page.Error />
      </>
    );

  return (
    <>
      <Page.Title>Отчёт по заказам</Page.Title>
      <Page.Main>
        <Flex direction="column" alignItems="stretch" gap={6} padding={8}>
          <Flex gap={5} alignItems="center">
            <Typography variant="alpha">Отчёт «Товары в заказах»</Typography>
            <Typography textColor="neutral600">
              Настройте условия и сформируйте сводную таблицу по товарам.
            </Typography>
          </Flex>

          <Box
            background="neutral0"
            padding={6}
            shadow="filterShadow"
            hasRadius
          >
            <Box
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "24px",
              }}
            >
              <Box>
                <Typography variant="pi" fontWeight="bold">
                  Отчётный период
                </Typography>
                <SingleSelect
                  aria-label="Отчётный период"
                  value={period}
                  onChange={(value) => setPeriod(String(value) as Period)}
                >
                  <SingleSelectOption value="all">Все даты</SingleSelectOption>
                  <SingleSelectOption value="today">Сегодня</SingleSelectOption>
                  <SingleSelectOption value="yesterday">
                    Вчера
                  </SingleSelectOption>
                  <SingleSelectOption value="month">
                    Текущий месяц
                  </SingleSelectOption>
                  <SingleSelectOption value="custom">
                    Произвольный диапазон
                  </SingleSelectOption>
                </SingleSelect>
              </Box>
              <Box>
                <Typography variant="pi" fontWeight="bold">
                  Статусы заказов
                </Typography>
                <MultiSelect
                  aria-label="Статусы заказов"
                  placeholder="Выберите статусы"
                  value={statuses}
                  onChange={setStatuses}
                  withTags
                >
                  {STATUS_OPTIONS.map((status) => (
                    <MultiSelectOption key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </MultiSelectOption>
                  ))}
                </MultiSelect>
              </Box>
              <Box>
                <Typography variant="pi" fontWeight="bold">
                  Категории товаров
                </Typography>
                <MultiSelect
                  aria-label="Категории товаров"
                  placeholder="Все категории"
                  value={selectedCategories}
                  onChange={setSelectedCategories}
                  withTags
                >
                  {categories.map((category) => (
                    <MultiSelectOption
                      key={category.documentId ?? category.id}
                      value={category.name}
                    >
                      {category.name}
                    </MultiSelectOption>
                  ))}
                  <MultiSelectOption value="Без категории">
                    Без категории
                  </MultiSelectOption>
                </MultiSelect>
              </Box>
              <Box>
                <Typography variant="pi" fontWeight="bold">
                  Города заказов
                </Typography>
                <MultiSelect
                  aria-label="Города заказов"
                  placeholder="Выберите города"
                  value={cities}
                  onChange={setCities}
                  withTags
                >
                  {CITY_OPTIONS.map((city) => (
                    <MultiSelectOption key={city} value={city}>
                      {CITY_LABELS[city]}
                    </MultiSelectOption>
                  ))}
                </MultiSelect>
              </Box>
            </Box>

            {period === "custom" && (
              <Flex gap={4} marginTop={5} wrap="wrap">
                <Box minWidth="260px">
                  <Typography variant="pi" fontWeight="bold">
                    Дата начала
                  </Typography>
                  <DatePicker
                    aria-label="Дата начала"
                    locale="ru-RU"
                    value={dateFrom}
                    onChange={setDateFrom}
                    clearLabel="Очистить дату начала"
                  />
                </Box>
                <Box minWidth="260px">
                  <Typography variant="pi" fontWeight="bold">
                    Дата окончания
                  </Typography>
                  <DatePicker
                    aria-label="Дата окончания"
                    locale="ru-RU"
                    value={dateTo}
                    onChange={setDateTo}
                    clearLabel="Очистить дату окончания"
                  />
                </Box>
              </Flex>
            )}

            <Flex gap={3} marginTop={6} wrap="wrap">
              <Button startIcon={<Eye />} onClick={createReport}>
                Сформировать отчёт
              </Button>
              <Button
                startIcon={<FilePdf />}
                variant="secondary"
                onClick={printReport}
                disabled={!report}
              >
                Распечатать
              </Button>
            </Flex>
          </Box>

          {report && (
            <Box
              background="neutral0"
              padding={6}
              shadow="filterShadow"
              hasRadius
            >
              <Flex
                justifyContent="space-between"
                alignItems="flex-start"
                gap={4}
                wrap="wrap"
                paddingBottom={4}
              >
                <Flex alignItems="center" gap={5}>
                  <Typography variant="beta">Результат</Typography>
                  <Typography textColor="neutral600">
                    {report.periodLabel} · заказов: {report.orderCount} ·
                    позиций: {report.rows.length}
                  </Typography>
                </Flex>
                <Typography variant="beta">
                  {moneyFormatter.format(report.totalCost)}
                </Typography>
              </Flex>
              <Box overflow="auto">
                <Table colCount={6} rowCount={report.rows.length}>
                  <Thead>
                    <Tr>
                      <Th>
                        <Typography variant="sigma">№</Typography>
                      </Th>
                      <Th>
                        <Typography variant="sigma">
                          Наименование товара
                        </Typography>
                      </Th>
                      <Th>
                        <Typography variant="sigma">
                          Количество / вес
                        </Typography>
                      </Th>
                      <Th>
                        <Typography variant="sigma">В заказах</Typography>
                      </Th>
                      <Th>
                        <Typography variant="sigma">Стоимость</Typography>
                      </Th>
                      <Th>
                        <Typography variant="sigma">Категория</Typography>
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {report.rows.length ? (
                      report.rows.map((row, index) => (
                        <Tr key={row.key}>
                          <Td>{index + 1}</Td>
                          <Td>
                            <Typography fontWeight="semiBold">
                              {row.name}
                            </Typography>
                          </Td>
                          <Td>
                            <Typography variant="omega" fontWeight="semiBold">
                              {numberFormatter.format(row.measure)} {row.unit}
                            </Typography>
                          </Td>
                          <Td>
                            {row.orders.map((entry) => (
                              <div key={`${row.key}-${entry.number}`}>
                                <Typography variant="pi">
                                  {entry.number} —{" "}
                                  {numberFormatter.format(entry.measure)}{" "}
                                  {row.unit}
                                </Typography>
                              </div>
                            ))}
                          </Td>
                          <Td>
                            <Typography variant="omega" fontWeight="semiBold">
                              {moneyFormatter.format(row.cost)}
                            </Typography>
                          </Td>
                          <Td>
                            <Typography variant="omega">{row.category}</Typography>
                          </Td>
                        </Tr>
                      ))
                    ) : (
                      <Tr>
                        <Td colSpan={6}>
                          <Box padding={6} textAlign="center">
                            <Typography textColor="neutral600">
                              По выбранным условиям данных нет.
                            </Typography>
                          </Box>
                        </Td>
                      </Tr>
                    )}
                  </Tbody>
                </Table>
              </Box>
            </Box>
          )}
        </Flex>
      </Page.Main>
    </>
  );
};

export default OrdersReportPage;
