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
    subcategories: [
      { name: 'Филе', slug: 'ptica-myaso-file' },
      { name: 'Бедро', slug: 'ptica-myaso-bedro' },
      { name: 'Для бульона', slug: 'ptica-myaso-dlya-bulona' },
    ],
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
    subcategories: [
      { name: 'Котлеты', slug: 'polufabrikaty-kotlety' },
      { name: 'Пельмени', slug: 'polufabrikaty-pelmeni' },
      { name: 'Фарш', slug: 'polufabrikaty-farsh' },
    ],
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
    subcategories: [
      { name: 'Для курицы', slug: 'marinady-dlya-kuricy' },
      { name: 'Для мяса', slug: 'marinady-dlya-myasa' },
      { name: 'Для гриля', slug: 'marinady-dlya-grilya' },
    ],
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
    subcategories: [
      { name: 'Колбасы', slug: 'myasnye-delikatesy-kolbasy' },
      { name: 'Рулеты', slug: 'myasnye-delikatesy-rulety' },
      { name: 'Нарезка', slug: 'myasnye-delikatesy-narezka' },
    ],
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
    subcategories: [
      { name: 'Яйца', slug: 'molochnaya-produkciya-yajca-yajca' },
      { name: 'Молоко', slug: 'molochnaya-produkciya-yajca-moloko' },
      { name: 'Сметана', slug: 'molochnaya-produkciya-yajca-smetana' },
    ],
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
    subcategories: [
      { name: 'Мягкие', slug: 'syry-myagkie' },
      { name: 'Твердые', slug: 'syry-tverdye' },
      { name: 'Выдержанные', slug: 'syry-vyderzhannye' },
    ],
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
    subcategories: [
      { name: 'Праздничные', slug: 'podarochnye-nabory-prazdnichnye' },
      { name: 'Семейные', slug: 'podarochnye-nabory-semejnye' },
      { name: 'Корпоративные', slug: 'podarochnye-nabory-korporativnye' },
    ],
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
    subcategories: [
      { name: 'Тушенка', slug: 'konservaciya-tushenka' },
      { name: 'Паштеты', slug: 'konservaciya-pashtety' },
      { name: 'Готовые блюда', slug: 'konservaciya-gotovye-blyuda' },
    ],
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
    dietLabel: 'Диетическое',
    unitValue: 1,
    unitName: 'кг' as UnitName,
    categorySlug: 'ptica-myaso',
    subcategorySlug: 'ptica-myaso-file',
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
    subcategorySlug: 'ptica-myaso-bedro',
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
    subcategorySlug: 'polufabrikaty-kotlety',
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
    subcategorySlug: 'marinady-dlya-kuricy',
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
    subcategorySlug: 'myasnye-delikatesy-rulety',
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
    subcategorySlug: 'molochnaya-produkciya-yajca-yajca',
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
    subcategorySlug: 'syry-vyderzhannye',
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
    subcategorySlug: 'konservaciya-tushenka',
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
    const subcategoryIdBySlug = new Map<string, EntityId>();

    for (const category of categorySeeds) {
      const { subcategories, ...categoryData } = category;
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
          ...categoryData,
          publishedAt: now,
        },
      });

      categoryIdBySlug.set(category.slug, createdCategory.id);
    }

    for (const category of categorySeeds) {
      const categoryId = categoryIdBySlug.get(category.slug);

      if (!categoryId) {
        continue;
      }

      for (const [index, subcategory] of category.subcategories.entries()) {
        const existingSubcategories = await strapi.entityService.findMany('api::subcategory.subcategory', {
          filters: { slug: subcategory.slug },
          publicationState: 'preview',
          populate: ['category'],
          limit: 1,
        });

        const existingSubcategory = (Array.isArray(existingSubcategories) ? existingSubcategories[0] : null) as
          | ({ id: EntityId; category?: { id?: EntityId } | EntityId | null })
          | null;

        if (existingSubcategory) {
          const existingCategoryId =
            typeof existingSubcategory.category === 'object' && existingSubcategory.category !== null
              ? existingSubcategory.category.id
              : existingSubcategory.category;

          if (existingCategoryId !== categoryId) {
            await strapi.entityService.update('api::subcategory.subcategory', existingSubcategory.id, {
              data: {
                category: categoryId,
              },
            });
          }

          subcategoryIdBySlug.set(subcategory.slug, existingSubcategory.id);
          continue;
        }

        const createdSubcategory = await strapi.entityService.create('api::subcategory.subcategory', {
          data: {
            name: subcategory.name,
            slug: subcategory.slug,
            sortOrder: index + 1,
            category: categoryId,
            publishedAt: now,
          },
        });

        subcategoryIdBySlug.set(subcategory.slug, createdSubcategory.id);
      }
    }

    for (const product of productSeeds) {
      const categoryId = categoryIdBySlug.get(product.categorySlug);
      const subcategoryId = subcategoryIdBySlug.get(product.subcategorySlug);

      if (!categoryId) {
        continue;
      }

      const existingProducts = await strapi.entityService.findMany('api::product.product', {
        filters: { slug: product.slug },
        publicationState: 'preview',
        populate: ['category', 'subcategory'],
        limit: 1,
      });

      const existingProduct = (Array.isArray(existingProducts) ? existingProducts[0] : null) as
        | ({
            id: EntityId;
            category?: { id?: EntityId } | EntityId | null;
            subcategory?: { id?: EntityId } | EntityId | null;
          })
        | null;

      if (existingProduct) {
        const existingCategoryId =
          typeof existingProduct.category === 'object' && existingProduct.category !== null
            ? existingProduct.category.id
            : existingProduct.category;
        const existingSubcategoryId =
          typeof existingProduct.subcategory === 'object' && existingProduct.subcategory !== null
            ? existingProduct.subcategory.id
            : existingProduct.subcategory;

        if (existingCategoryId !== categoryId || existingSubcategoryId !== subcategoryId) {
          await strapi.entityService.update('api::product.product', existingProduct.id, {
            data: {
              category: categoryId,
              subcategory: subcategoryId,
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
          dietLabel: product.dietLabel,
          isOutOfStock: product.isOutOfStock ?? false,
          unitValue: product.unitValue,
          unitName: product.unitName,
          descriptionItems: product.descriptionItems,
          category: categoryId,
          subcategory: subcategoryId,
          publishedAt: now,
        },
      });
    }
  },
};
