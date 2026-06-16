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

const getRelationId = (relation?: { id?: EntityId } | EntityId | null) =>
  typeof relation === 'object' && relation !== null ? relation.id : relation;

const haveSameIds = (left: EntityId[], right: EntityId[]) => {
  const leftIds = new Set(left.map(String));
  const rightIds = new Set(right.map(String));

  if (leftIds.size !== rightIds.size) {
    return false;
  }

  return [...leftIds].every((id) => rightIds.has(id));
};

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

const deliveryPageSeed = {
  seo: {
    metaTitle: 'Доставка | TILI-MILI',
    metaDescription:
      'Условия доставки фермерских продуктов TILI-MILI по Москве, Московской области, Санкт-Петербургу и Ленинградской области.',
  },
  hero: {
    kicker: 'Доставка фермерских продуктов',
    title: 'Привозим свежие деревенские продукты домой в удобное время',
    text:
      'Мы сохраняем аккуратную доставку, бережную упаковку и живое подтверждение каждого заказа без автоматических сюрпризов.',
    primaryButtonText: 'Перейти в каталог',
    primaryButtonLink: '/',
    secondaryButtonText: 'Позвонить менеджеру',
    secondaryButtonLink: 'tel:+79163672825',
    noteTitle: 'Как мы работаем',
    noteText:
      'После оформления заказа мы всегда подтверждаем наличие товаров, итоговую стоимость и ближайшую дату доставки лично.',
  },
  zonesSectionKicker: 'География доставки',
  zonesSectionTitle: 'Доставляем по основным направлениям',
  deliveryZones: [
    {
      title: 'Москва и Московская область',
      description:
        'Доставляем заказы курьером в согласованный день и удобный временной интервал. После оформления обязательно связываемся для подтверждения состава и адреса.',
      details: [
        { text: 'Бережно упаковываем охлажденные и замороженные продукты.' },
        { text: 'Уточняем стоимость доставки по адресу при подтверждении заказа.' },
        { text: 'Сообщаем дату ближайшего выезда заранее.' },
      ],
    },
    {
      title: 'Санкт-Петербург и Ленинградская область',
      description:
        'Отправляем сборные доставки по графику. Если вы оформляете заказ заранее, мы резервируем позиции и подтверждаем дату отправки отдельно.',
      details: [
        { text: 'Доставка выполняется в согласованный день.' },
        { text: 'Перед отправкой менеджер подтверждает наличие и итоговую сумму.' },
        { text: 'Для удаленных адресов время и стоимость согласовываются индивидуально.' },
      ],
    },
  ],
  orderSection: {
    kicker: 'Оформление',
    title: 'Как проходит заказ',
    listType: 'ordered',
    items: [
      { text: 'Выберите товары в каталоге и оформите заказ на сайте.' },
      { text: 'Мы свяжемся с вами, подтвердим наличие, адрес и удобное время.' },
      { text: 'Соберем заказ, бережно упакуем продукты и передадим в доставку.' },
      { text: 'В день доставки напомним о заказе и передадим актуальный статус.' },
    ],
  },
  paymentSection: {
    kicker: 'Оплата',
    title: 'Условия оплаты',
    listType: 'unordered',
    items: [
      {
        text:
          'Наличными или переводом при получении, если это согласовано при подтверждении заказа.',
      },
      {
        text:
          'Предоплатой для крупных, праздничных и индивидуально собранных заказов.',
      },
      {
        text:
          'Итоговая сумма может корректироваться для весовых позиций после фактической сборки.',
      },
    ],
  },
  importantSectionKicker: 'Важно знать',
  importantSectionTitle: 'Несколько деталей перед оформлением',
  importantItems: [
    {
      text:
        'Минимальную сумму заказа и стоимость доставки уточняем при подтверждении, так как они зависят от направления и объема корзины.',
    },
    {
      text:
        'Если какого-то товара не оказалось в наличии, мы заранее предложим замену и ничего не добавим без вашего согласия.',
    },
    {
      text:
        'Просим проверять заказ при получении, чтобы мы сразу помогли решить любой вопрос.',
    },
  ],
  contactSection: {
    kicker: 'Есть вопросы?',
    title: 'Поможем подобрать доставку под ваш адрес',
    text:
      'Если вы оформляете заказ впервые или хотите уточнить условия по конкретному району, свяжитесь с нами, и мы быстро сориентируем по срокам.',
    useSiteSettingsContacts: true,
    fallbackPhone: '+7 (916) 367-28-25',
    fallbackEmail: 'info@tili-mili.ru',
  },
};

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
      const subcategorySlugs =
        'subcategorySlugs' in product && Array.isArray(product.subcategorySlugs)
          ? product.subcategorySlugs
          : [product.subcategorySlug];
      const subcategoryIds = subcategorySlugs
        .map((slug) => subcategoryIdBySlug.get(slug))
        .filter((id): id is EntityId => id !== undefined);

      if (!categoryId) {
        continue;
      }

      const existingProducts = await strapi.entityService.findMany('api::product.product', {
        filters: { slug: product.slug },
        publicationState: 'preview',
        populate: ['category', 'subcategories'],
        limit: 1,
      });

      const existingProduct = (Array.isArray(existingProducts) ? existingProducts[0] : null) as
        | ({
            id: EntityId;
            category?: { id?: EntityId } | EntityId | null;
            subcategories?: Array<{ id?: EntityId } | EntityId> | null;
          })
        | null;

      if (existingProduct) {
        const existingCategoryId = getRelationId(existingProduct.category);
        const existingSubcategoryIds = (existingProduct.subcategories ?? [])
          .map(getRelationId)
          .filter((id): id is EntityId => id !== undefined && id !== null);

        if (existingCategoryId !== categoryId || !haveSameIds(existingSubcategoryIds, subcategoryIds)) {
          await strapi.entityService.update('api::product.product', existingProduct.id, {
            data: {
              category: categoryId,
              subcategories: subcategoryIds,
            } as any,
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
          subcategories: subcategoryIds,
          publishedAt: now,
        } as any,
      });
    }

    const existingDeliveryPage = await strapi.entityService.findMany('api::delivery-page.delivery-page' as any, {
      publicationState: 'preview',
    } as any);

    if (!existingDeliveryPage) {
      await strapi.entityService.create('api::delivery-page.delivery-page' as any, {
        data: {
          ...deliveryPageSeed,
          publishedAt: now,
        } as any,
      });
    }
  },
};
