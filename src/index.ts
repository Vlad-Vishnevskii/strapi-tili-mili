import type { Core } from '@strapi/strapi';

const now = new Date();
type UnitName = 'кг' | 'шт' | 'упак';
type EntityId = string | number;

const ORDER_STATUSES = new Set(['new', 'delivering', 'done', 'cancelled']);
const LEGACY_ORDER_STATUS_MAP = new Map<string, string>([
  ['confirmed', 'delivering'],
  ['packed', 'delivering'],
]);

async function migrateOrderStatuses(strapi: Core.Strapi) {
  const knex = strapi.db.connection;
  const hasOrdersTable = await knex.schema.hasTable('orders');

  if (!hasOrdersTable) {
    return;
  }

  const hasLegacyStatusColumn = await knex.schema.hasColumn('orders', 'status');
  const hasOrderStatusColumn = await knex.schema.hasColumn('orders', 'order_status');

  if (!hasLegacyStatusColumn || !hasOrderStatusColumn) {
    return;
  }

  const orders = (await knex('orders').select('id', 'status', 'order_status')) as Array<{
    id: number;
    status: string | null;
    order_status: string | null;
  }>;

  for (const order of orders) {
    if (!order.order_status && order.status) {
      const nextStatus = ORDER_STATUSES.has(order.status)
        ? order.status
        : LEGACY_ORDER_STATUS_MAP.get(order.status);

      if (nextStatus) {
        await knex('orders').where({ id: order.id }).update({ order_status: nextStatus });
      }
    }

    if (order.order_status && !ORDER_STATUSES.has(order.order_status)) {
      const mappedOrderStatus = LEGACY_ORDER_STATUS_MAP.get(order.order_status);

      if (mappedOrderStatus) {
        await knex('orders').where({ id: order.id }).update({ order_status: mappedOrderStatus });
      }
    }
  }
}

const categorySeeds = [
  {
    name: 'Птица/Мясо',
    slug: 'ptica-myaso',
    descriptionBlocks: [
      {
        text: 'В этом разделе собраны фермерская курица, индейка и мясные позиции для повседневного рациона и домашней кухни. Мы делаем акцент на понятном составе, аккуратной разделке и удобном формате покупки.',
      },
      {
        text: 'Здесь удобно выбрать как базовые продукты для супов, запекания и жарки, так и более выразительные позиции для семейного стола. Категория подходит тем, кто ищет свежее мясо и птицу с понятным происхождением и бережной упаковкой.',
      },
    ],
    subcategories: [{ label: 'Филе' }, { label: 'Бедро' }, { label: 'Для бульона' }],
  },
  {
    name: 'Полуфабрикаты',
    slug: 'polufabrikaty',
    descriptionBlocks: [
      {
        text: 'Раздел с полуфабрикатами создан для тех, кто хочет готовить быстрее без компромиссов по качеству. В подборке собраны заготовки, которые удобно хранить и использовать для будничных ужинов и быстрых обедов.',
      },
      {
        text: 'Мы сохраняем понятный состав, аккуратную фасовку и домашний подход к продукту, чтобы полуфабрикаты оставались не просто удобными, но и вкусными.',
      },
    ],
    subcategories: [{ label: 'Котлеты' }, { label: 'Пельмени' }, { label: 'Фарш' }],
  },
  {
    name: 'Маринады',
    slug: 'marinady',
    descriptionBlocks: [
      {
        text: 'В категории маринадов собраны позиции, которые помогают быстро подготовить мясо и птицу к запеканию, жарке или грилю. Это удобный выбор для тех, кто ценит насыщенный вкус и экономию времени.',
      },
      {
        text: 'Подобрали варианты для домашнего ужина, сезонных посиделок и выходных на природе, чтобы в каждом продукте сохранялись сочность, аромат и аккуратная текстура.',
      },
    ],
    subcategories: [{ label: 'Для курицы' }, { label: 'Для мяса' }, { label: 'Для гриля' }],
  },
  {
    name: 'Мясные деликатесы',
    slug: 'myasnye-delikatesy',
    descriptionBlocks: [
      {
        text: 'Мясные деликатесы подойдут для праздничной подачи, красивой нарезки и выразительных закусок. В этой категории собраны продукты с более насыщенным вкусом и деликатной текстурой.',
      },
      {
        text: 'Раздел удобно использовать и для повседневных бутербродов, и для составления гастрономических наборов к столу. Мы сохраняем акцент на качестве сырья и аккуратной подготовке.',
      },
    ],
    subcategories: [{ label: 'Колбасы' }, { label: 'Рулеты' }, { label: 'Нарезка' }],
  },
  {
    name: 'Молочная продукция, яйца',
    slug: 'molochnaya-produkciya-yajca',
    descriptionBlocks: [
      {
        text: 'В этом разделе собраны базовые фермерские продукты на каждый день: яйца, молочная продукция и привычные позиции для кухни. Категория помогает быстро закрыть повседневные покупки в одном месте.',
      },
      {
        text: 'Такие продукты удобно брать для завтраков, выпечки, домашнего меню и запаса на несколько дней. Здесь важны свежесть, аккуратная доставка и понятный вкус без лишнего.',
      },
    ],
    subcategories: [{ label: 'Яйца' }, { label: 'Молоко' }, { label: 'Сметана' }],
  },
  {
    name: 'Сыры',
    slug: 'syry',
    descriptionBlocks: [
      {
        text: 'Категория сыров собрана для тех, кто ценит насыщенный вкус, натуральную текстуру и универсальность продукта. Здесь можно выбрать сыры как для ежедневного стола, так и для подачи гостям.',
      },
      {
        text: 'Они подходят для завтраков, пасты, закусок, салатов и красивых сырных тарелок. Важно, чтобы каждый продукт сохранял свежесть, аромат и удобный формат хранения.',
      },
    ],
    subcategories: [{ label: 'Мягкие' }, { label: 'Твердые' }, { label: 'Выдержанные' }],
  },
  {
    name: 'Подарочные наборы',
    slug: 'podarochnye-nabory',
    descriptionBlocks: [
      {
        text: 'Подарочные наборы помогают собрать понятный и красивый гастрономический подарок без лишних усилий. Это удобный формат для семейных праздников, деловых знаков внимания и сезонных поводов.',
      },
      {
        text: 'Мы делаем акцент на сочетании вкуса, аккуратной упаковки и цельного впечатления, чтобы набор выглядел продуманно и радовал не только содержимым, но и подачей.',
      },
    ],
    subcategories: [{ label: 'Праздничные' }, { label: 'Семейные' }, { label: 'Корпоративные' }],
  },
  {
    name: 'Консервация',
    slug: 'konservaciya',
    descriptionBlocks: [
      {
        text: 'В категории консервации собраны продукты, которые удобно держать под рукой для быстрого перекуса, дополнения к гарнирам и домашнего запаса. Такой формат особенно полезен, когда нужен насыщенный вкус и длительное хранение.',
      },
      {
        text: 'Мы сохраняем упор на понятный состав, аккуратную фасовку и удобство использования, чтобы консервация оставалась практичной и действительно вкусной.',
      },
    ],
    subcategories: [{ label: 'Тушенка' }, { label: 'Паштеты' }, { label: 'Готовые блюда' }],
  },
];

const productSeeds = [
  {
    name: 'Филе бедра индейки',
    slug: 'file-bedra-indejki',
    price: 910,
    isOutOfStock: true,
    promoLabel: 'Акция',
    freezeLabel: 'Заморозка',
    unitValue: 1,
    unitName: 'кг' as UnitName,
    categorySlug: 'ptica-myaso',
    descriptionItems: [
      { name: 'Цена:', text: 'Товар весовой, конечная стоимость будет рассчитана в соответствии с его весом.' },
      { name: 'Вес:', text: '1 кг. (0.5-1.5 кг.)' },
      { name: 'Важно:', text: 'Допускается наличие небольшого количества перьев на кожном покрове в силу ручного ощипывания.' },
      { name: 'Срок годности:', text: '180 суток.' },
      { name: 'Упаковка:', text: 'Коробка.' },
    ],
  },
  {
    name: 'Бедро цыпленка-бройлера',
    slug: 'bedro-cyplenka-brojlera',
    price: 910,
    unitValue: 1,
    unitName: 'кг' as UnitName,
    categorySlug: 'ptica-myaso',
    descriptionItems: [
      { name: 'Цена:', text: 'Товар весовой, конечная стоимость будет рассчитана в соответствии с его весом.' },
      { name: 'Вес:', text: '1 кг. (0.5-1.5 кг.)' },
      { name: 'Срок годности:', text: '180 суток.' },
      { name: 'Условия хранения:', text: 'При температуре не выше -18 °C. После вскрытия хранить 24 часа.' },
    ],
  },
  {
    name: 'Домашние котлеты',
    slug: 'domashnie-kotlety',
    price: 640,
    unitValue: 1,
    unitName: 'упак' as UnitName,
    categorySlug: 'polufabrikaty',
    descriptionItems: [
      { name: 'Формат:', text: 'Быстрая заготовка для будничного ужина.' },
      { name: 'Вес:', text: '800 г.' },
      { name: 'Состав:', text: 'Натуральное мясо, лук, специи.' },
    ],
  },
  {
    name: 'Маринад для курицы',
    slug: 'marinad-dlya-kuricy',
    price: 240,
    promoLabel: 'Хит цены',
    unitValue: 1,
    unitName: 'шт' as UnitName,
    categorySlug: 'marinady',
    descriptionItems: [
      { name: 'Назначение:', text: 'Подходит для духовки, гриля и сковороды.' },
      { name: 'Объем:', text: '350 мл.' },
      { name: 'Вкус:', text: 'Умеренно пряный, с чесноком и травами.' },
    ],
  },
  {
    name: 'Копченый рулет',
    slug: 'kopchenyj-rulet',
    price: 1290,
    unitValue: 1,
    unitName: 'кг' as UnitName,
    categorySlug: 'myasnye-delikatesy',
    descriptionItems: [
      { name: 'Подача:', text: 'Подходит для нарезки и праздничного стола.' },
      { name: 'Вкус:', text: 'Насыщенный, с легкой копченой ноткой.' },
      { name: 'Срок годности:', text: '20 суток.' },
    ],
  },
  {
    name: 'Яйца фермерские',
    slug: 'yajca-fermerskie',
    price: 180,
    unitValue: 10,
    unitName: 'шт' as UnitName,
    categorySlug: 'molochnaya-produkciya-yajca',
    descriptionItems: [
      { name: 'Категория:', text: 'Отборные.' },
      { name: 'Количество:', text: '10 шт.' },
      { name: 'Хранение:', text: 'В холодильнике.' },
    ],
  },
  {
    name: 'Сыр выдержанный',
    slug: 'syr-vyderzhannyj',
    price: 1450,
    unitValue: 1,
    unitName: 'кг' as UnitName,
    categorySlug: 'syry',
    descriptionItems: [
      { name: 'Текстура:', text: 'Плотная, с выраженным сливочным вкусом.' },
      { name: 'Выдержка:', text: '6 месяцев.' },
      { name: 'Подача:', text: 'Для сырной тарелки и пасты.' },
    ],
  },
  {
    name: 'Тушенка домашняя',
    slug: 'tushenka-domashnyaya',
    price: 390,
    unitValue: 1,
    unitName: 'шт' as UnitName,
    categorySlug: 'konservaciya',
    descriptionItems: [
      { name: 'Формат:', text: 'Стеклянная банка.' },
      { name: 'Вес:', text: '500 г.' },
      { name: 'Использование:', text: 'Для быстрых обедов и запаса.' },
    ],
  },
];

export default {
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await migrateOrderStatuses(strapi);

    const categoryIdBySlug = new Map<string, EntityId>();

    for (const category of categorySeeds) {
      const existingCategories = await strapi.entityService.findMany('api::category.category', {
        filters: { slug: category.slug },
        publicationState: 'preview',
        limit: 1,
      });

      const existingCategory = Array.isArray(existingCategories) ? existingCategories[0] : null;

      if (existingCategory) {
        categoryIdBySlug.set(category.slug, existingCategory.id);
        continue;
      }

      const createdCategory = await strapi.entityService.create('api::category.category', {
        data: {
          ...category,
          publishedAt: now,
        },
      });

      categoryIdBySlug.set(category.slug, createdCategory.id);
    }

    for (const product of productSeeds) {
      const categoryId = categoryIdBySlug.get(product.categorySlug);

      if (!categoryId) {
        continue;
      }

      const existingProducts = await strapi.entityService.findMany('api::product.product', {
        filters: { slug: product.slug },
        publicationState: 'preview',
        populate: ['category'],
        limit: 1,
      });

      const existingProduct = (Array.isArray(existingProducts) ? existingProducts[0] : null) as
        | ({ id: EntityId; category?: { id?: EntityId } | EntityId | null })
        | null;

      if (existingProduct) {
        const existingCategoryId =
          typeof existingProduct.category === 'object' && existingProduct.category !== null
            ? existingProduct.category.id
            : existingProduct.category;

        if (existingCategoryId !== categoryId) {
          await strapi.entityService.update('api::product.product', existingProduct.id, {
            data: {
              category: categoryId,
            },
          });
        }

        continue;
      }

      await strapi.entityService.create('api::product.product', {
        data: {
          name: product.name,
          slug: product.slug,
          price: product.price,
          promoLabel: product.promoLabel,
          freezeLabel: product.freezeLabel,
          isOutOfStock: product.isOutOfStock ?? false,
          unitValue: product.unitValue,
          unitName: product.unitName,
          descriptionItems: product.descriptionItems,
          category: categoryId,
          publishedAt: now,
        },
      });
    }
  },
};
