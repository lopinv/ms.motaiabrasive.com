/**
 * 选题矩阵生成器
 * 产品×规格×行业×GCC地区×13文章类型 的组合生成
 * 目标：生成 3000 篇去重、意图区分、关键词不蚕食的选题
 */

import { models } from '../data/models';
import { productCategories, industries } from '../data/site';
import { getAllTemplateTypes, getTemplate } from './article-templates';

// ========== 基础维度定义 ==========

// 纯 Hook&Loop 变体只归属 hook-loop 家族（从 sanding-discs 剔除），
// 避免同一型号在两家族生成重复标题
const HOOK_ONLY_MODEL_SLUGS = new Set(['hook-loop-disc', 'hook-loop-disc-multi-hole', 'hook-loop-disc-film']);

export const productFamilies = [
  { slug: 'abrasive-belts', name: 'أحزمة الصنفرة', models: models.filter(m => m.categorySlug === 'abrasive-belts') },
  { slug: 'flap-discs', name: 'أقراص كوت (Flap Discs)', models: models.filter(m => m.categorySlug === 'flap-discs') },
  { slug: 'sanding-discs', name: 'أقراص الصنفرة', models: models.filter(m => m.categorySlug === 'sanding-discs' && !HOOK_ONLY_MODEL_SLUGS.has(m.slug)) },
  { slug: 'hook-loop', name: 'أقراص هوك آند لوب', models: models.filter(m => m.categorySlug === 'sanding-discs' && m.attachment.includes('Hook')) },
  { slug: 'sanding-sponges', name: 'إسفنجيات صنفرة', models: models.filter(m => m.categorySlug === 'sanding-sponges') },
] as const;

export const gccCountries = [
  { code: 'saudi-arabia', name: 'السعودية', nameEn: 'Saudi Arabia', industrialClusters: ['الرياض', 'جدة', 'الدمام', 'الجبيل', 'ينبع'] },
  { code: 'uae', name: 'الإمارات', nameEn: 'UAE', industrialClusters: ['دبي', 'أبوظبي', 'الشارقة', 'جبل علي', 'العين'] },
  { code: 'qatar', name: 'قطر', nameEn: 'Qatar', industrialClusters: ['الدوحة', 'الوكرة', 'مسيعيد', 'رأس لفان'] },
  { code: 'kuwait', name: 'الكويت', nameEn: 'Kuwait', industrialClusters: ['الكويت', 'الأحمدي', 'الشويخ', 'صباح الأحمد'] },
  { code: 'bahrain', name: 'البحرين', nameEn: 'Bahrain', industrialClusters: ['المنامة', 'سترة', 'الحورة', 'عسكر'] },
  { code: 'oman', name: 'عُمان', nameEn: 'Oman', industrialClusters: ['مسقط', 'صحار', 'صلالة', 'الدقم', 'نزوى'] },
  { code: 'general-gcc', name: 'الخليج العربي', nameEn: 'GCC General', industrialClusters: [] },
] as const;

// titleName: عنوان مختصر مخصص لبناء عناوين SEO (≤ 70 خانة) — يوضع في generateTitleVariants
export const industrySegments = [
  { code: 'woodworking', name: 'نجارة الخشب', titleName: 'النجارة', nameEn: 'Woodworking', keyProcesses: ['تجهيز الألواح', 'تشطيب الحواف', 'أثاث', 'أرضيات'] },
  { code: 'metalworking', name: 'تشطيب المعادن', titleName: 'المعادن', nameEn: 'Metalworking', keyProcesses: ['إزالة الشavings والحواف', 'إزالة الصدأ', 'طحن اللحام', 'تهيئة الأسطح', 'الصفائح المعدنية'] },
  { code: 'automotive', name: 'السيارات والصيانة', titleName: 'السيارات', nameEn: 'Automotive', keyProcesses: ['صنفرة هيكل السيارة', 'صنفرة البرايمر', 'الإصلاح', 'التلميع الدقيق'] },
  { code: 'shipbuilding', name: 'التصنيع البحري وصيانة السفن', titleName: 'حوض السفن', nameEn: 'Shipbuilding', keyProcesses: ['إزالة صدأ الصفائح الفولاذية', 'معالجة اللحام', 'معالجة ما قبل الطلاء', 'مضاد انزلاق السطح'] },
  { code: 'oil-gas', name: 'النفط والغاز - تهيئة الأسطح', titleName: 'النفط والغاز', nameEn: 'Oil & Gas', keyProcesses: ['إزالة صدأ الأنابيب', 'الأسطح الداخلية للخزانات', 'صيانة المنصات البحرية', 'معالجة ما قبل الطلاء المضاد للتآكل'] },
  { code: 'construction', name: 'مواد البناء المعالجة', titleName: 'البناء', nameEn: 'Construction Materials', keyProcesses: ['ألواح الخشب', 'صنفرة اللوح الجصي', 'تلميع الحجر', 'صنفرة الخرسانة'] },
  { code: 'general', name: 'الصناعة العامة', titleName: 'الصناعة', nameEn: 'General Industrial', keyProcesses: ['الصيانة والإصلاح', 'الصنفرة العامة', 'تنظيف الأسطح'] },
] as const;

export const articleTypes = getAllTemplateTypes();

// ========== 关键词库（用于长尾组合） ==========

export const keywordLibrary = {
  // 核心产品词（主关键词候选）
  primaryKeywords: {
    'abrasive-belts': ['أحزمة الصنفرة', 'أحزمة قاشة', 'حزام صنفرة'],
    'flap-discs': ['أقراص كوت', 'أقراص شرائح', 'فلاب ديسك'],
    'sanding-discs': ['أقراص الصنفرة', 'أقراص سنفرة', 'قرص صنفرة'],
    'hook-loop': ['أقراص هوك آند لوب', 'أقراص فيلكرو', 'أقراص خطاف وحلقة'],
    'sanding-sponges': ['إسفنجيات صنفرة', 'إسفنج صنفرة', 'وسائد صنفرة'],
  },

  // 规格词（次关键词）
  specKeywords: {
    grit: ['غرِت 40', 'غرِت 60', 'غرِت 80', 'غرِت 100', 'غرِت 120', 'غرِت 150', 'غرِت 180', 'غرِت 240', 'غرِت 320', 'غرِت 400', 'غرِت 600', 'غرِت 800', 'غرِت 1000', 'غرِت 3000', 'غرِت 5000'],
    size: ['533×75 مم', '610×100 مم', '1520×630 مم', '2200×1330 مم', '3 إنش', '4 إنش', '5 إنش', '6 إنش', '125 مم', '150 مم'],
    backing: ['قاعدة قماش', 'قاعدة ورق', 'قاعدة بوليمرية', 'قاعدة بلاستيكية', 'قاعدة ألياف زجاجية'],
    attachment: ['هوك آند لوب', 'لصق ذاتي (PSA)', 'شبكة معدنية'],
    grain: ['أكسيد الألومنيوم', 'كربيد السيليكون (SiC)', 'زركونيا ألومينا', 'حبيبات سيراميك'],
  },

  // 应用词
  applicationKeywords: {
    'woodworking': ['نجارة', 'أثاث', 'ألواح خشب', 'حواف خشب', 'أرضيات باركيه'],
    'metalworking': ['معدن', 'ستانلس ستيل', 'فولاذ', 'ألومنيوم', 'إزالة الشوائب الحادة', 'أصنعة لحام', 'إزالة الصدأ'],
    'automotive': ['سيارات', 'هياكل سيارات', 'عطل صيانة', 'دهان سيارات', 'تلميع'],
    'shipbuilding': ['سفن', 'حوض سفن', 'صيانة بحرية', 'ألواح فولاذ', 'منع الصدأ'],
    'oil-gas': ['نفط', 'غاز', 'أنابيب', 'خزانات', 'منصات بحرية', 'منع التآكل'],
    'construction': ['بناء', 'لوح جصي', 'أسمنت', 'حجر', 'بلاط'],
  },

  // 采购词
  procurementKeywords: [
    'مورد جملة', 'موزعون صناعيون', 'من المصنع مباشرة', 'عرض سعر', 'طلب عروض',
    'حد أدنى لكمية الطلب', 'مدة التوريد', 'طلب عينات', 'توريد تحت العلامة التجارية (OEM)',
    'شهادة المطابقة', 'شهادة التحليل', 'تغليف مخصص', 'شحن بحري', 'شحن جوي',
  ],

  // 地域词
  regionalKeywords: gccCountries.map(c => `مورد ${c.name}`).concat(
    gccCountries.map(c => `موزع ${c.name}`)
  ).concat(
    gccCountries.map(c => `سوق ${c.name}`)
  ),

  // 技术/标准词
  technicalKeywords: [
    'مواصفات FEPA', 'المعايير الدولية ISO', 'ANSI', 'JIS',
    'معدات الوقاية الشخصية', 'سحب الغبار', 'تهيئة الأسطح',
    'SASO', 'ESMA', 'GSO', 'درجة الغرِت', 'رابطة إسفنجية',
  ],
};

// ========== 选题生成逻辑 ==========

export interface TopicSpec {
  id: string;
  slug: string;
  title: string;
  articleType: string;
  productFamily: string;
  productModel?: string;
  industry: string;
  gccCountry: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  longTailKeywords: string[];
  searchIntent: 'informational' | 'technical' | 'commercial' | 'supplier-evaluation' | 'transactional';
  buyerJourneyStage: 'understanding' | 'evaluation' | 'comparison' | 'sourcing';
  estimatedWordCount: number;
  priority: number; // 1=高优先级(高商业价值长尾), 2=中, 3=低
  dedupeKey: string; // 用于去重
}

/**
 * 生成特定组合的选题
 */
function generateTopicsForCombination(
  productFamily: typeof productFamilies[0],
  model: typeof models[0] | null,
  industry: typeof industrySegments[0],
  gccCountry: typeof gccCountries[0],
  articleType: string
): TopicSpec[] {
  const template = getTemplate(articleType);
  if (!template) return [];

  const topics: TopicSpec[] = [];
  const baseId = `${productFamily.slug}-${model?.slug || 'general'}-${industry.code}-${gccCountry.code}-${articleType}`;

  // 根据文章类型生成变体标题；只保留首个变体（focus 0）。
  // 后续焦点变体（如 grit-size-selection）与主变体同 cell 正文 Jaccard 0.95+，
  // 属同模板换角度复制，直接不生成。
  // 例外：gcc-regional-sourcing 的两个变体（import-guide / market-logistics）
  // 正文由国家级数据驱动、差异显著，予以保留。
  const all = generateTitleVariants(productFamily, model, industry, gccCountry, articleType);
  const variants = articleType === 'gcc-regional-sourcing' ? all : all.slice(0, 1);

variants.forEach((variant, idx) => {
	    const keywords = selectKeywords(productFamily.slug, industry.code, gccCountry.code, articleType, model);
	    const modelSlug = model?.slug || 'general';
	    const dedupeKey = `${productFamily.slug}|${modelSlug}|${industry.code}|${gccCountry.code}|${articleType}|${variant.focus}`;

	    topics.push({
	      id: `${baseId}-${idx}`,
	      slug: generateSlug(productFamily.slug, modelSlug, industry.code, gccCountry.code, articleType, variant.focus, idx),
	      title: variant.title,
	      articleType,
	      productFamily: productFamily.slug,
	      productModel: model?.slug,
	      industry: industry.code,
	      gccCountry: gccCountry.code,
	      primaryKeyword: keywords.primary,
	      secondaryKeywords: keywords.secondary,
	      longTailKeywords: keywords.longTail,
	      searchIntent: mapIntent(articleType),
	      buyerJourneyStage: template.buyerJourneyStage,
	      estimatedWordCount: Math.floor((template.minWordCount + template.maxWordCount) / 2),
	      priority: calculatePriority(articleType, gccCountry.code, industry.code),
	      dedupeKey,
	    });
	  });

  return topics;
}

/**
 * 生成标题变体
 */
function generateTitleVariants(
  productFamily: typeof productFamilies[0],
  model: typeof models[0] | null,
  industry: typeof industrySegments[0],
  gccCountry: typeof gccCountries[0],
  articleType: string
): Array<{ title: string; focus: string }> {
  const variants: Array<{ title: string; focus: string }> = [];
  // 标题用 shortName（型号短名）控制长度；无型号时回落家族名
  const modelName = model ? (model.shortName || model.name) : productFamily.name;
  const countryName = gccCountry.code === 'general-gcc' ? 'الخليج العربي' : gccCountry.name;
  const industryName = industry.name;

  // العنوان يستخدم اسم القطاع المختصر (titleName) ليبقى ضمن 70 خانة
  const iName = (industry as any).titleName || industryName;

  switch (articleType) {
    case 'product-comparison':
      // 对比同家族不同规格，或跨家族（型号名保留为唯一性锚点）
      variants.push({
        title: `${modelName} أم ${getAlternativeProduct(productFamily.slug)} لـ ${iName} في ${countryName}؟`,
        focus: 'vs-alternative',
      });
      variants.push({
        title: `كيف تختار ${modelName} لـ ${iName} في ${countryName}؟`,
        focus: 'selection-guide',
      });
      break;

    case 'multi-product-comparison':
      variants.push({
        title: `مقارنة ${modelName} لـ ${iName} في ${countryName}`,
        focus: 'full-matrix',
      });
      break;

    case 'buying-guide':
      variants.push({
        title: `دليل شراء ${modelName} لـ ${iName} في ${countryName}`,
        focus: 'complete-guide',
      });
      if (model) {
        variants.push({
          title: `الغرِت والمقاس لـ ${modelName} ${iName} ${countryName}`,
          focus: 'grit-size-selection',
        });
      }
      break;

    case 'technical-guide':
      variants.push({
        title: `معايير وأنواع ${modelName} للأداء في ${iName} ${countryName}`,
        focus: 'technical-deep-dive',
      });
      break;

    case 'application-guide':
      variants.push({
        title: `${modelName} لتطبيق ${iName} ${countryName}`,
        focus: 'industry-application',
      });
      break;

    case 'process-tutorial':
      variants.push({
        title: `${getProcessName(industry.code)} بـ ${modelName} لـ ${iName} ${countryName}`,
        focus: 'step-by-step',
      });
      break;

    case 'troubleshooting':
      variants.push({
        title: `مشاكل ${modelName} في ${iName} ${countryName}`,
        focus: 'failure-modes',
      });
      break;

    case 'product-spec-detail':
      if (model) {
        variants.push({
          title: `مواصفات ${modelName} لـ ${iName} في ${countryName}`,
          focus: 'full-specs',
        });
      }
      break;

    case 'procurement-guide':
      variants.push({
        title: `تقييم موردين ${modelName} لـ ${iName} في ${countryName}`,
        focus: 'procurement-process',
      });
      break;

    case 'wholesale-oem-guide':
      variants.push({
        title: `دليل OEM والجملة لـ ${modelName} ${iName} ${countryName}`,
        focus: 'wholesale-oem',
      });
      break;

    case 'industry-market':
      variants.push({
        title: `اتجاهات ${iName} ${countryName} وتأثيرها على ${modelName}`,
        focus: 'market-trends',
      });
      break;

    case 'gcc-regional-sourcing':
      if (gccCountry.code !== 'general-gcc') {
        variants.push({
          title: `استيراد ${modelName} إلى ${countryName} لقطاع ${iName}`,
          focus: 'import-guide',
        });
        variants.push({
          title: `سوق ${modelName} في ${countryName} لقطاع ${iName}`,
          focus: 'market-logistics',
        });
      }
      break;

    case 'faq-buyers-guide':
      variants.push({
        title: `أسئلة مشتري ${modelName} ${iName} ${countryName}`,
        focus: 'buyer-faq',
      });
      break;
  }

  return variants;
}

/**
 * 选择关键词组合
 */
function selectKeywords(
  productFamilySlug: string,
  industryCode: string,
  gccCountryCode: string,
  articleType: string,
  model: typeof models[0] | null
) {
  const lib = keywordLibrary;
  const primaryCandidates = lib.primaryKeywords[productFamilySlug as keyof typeof lib.primaryKeywords] || [productFamilySlug];
  const primary = primaryCandidates[0];

  // 次关键词：规格 + 应用 + 采购
  const secondary: string[] = [];
  if (model) {
    secondary.push(...model.gritRange.slice(0, 3).map(g => `غرِت ${g}`));
    secondary.push(model.sizeAr);
  }
  secondary.push(...(lib.applicationKeywords[industryCode as keyof typeof lib.applicationKeywords] || []).slice(0, 2));
  secondary.push(...lib.procurementKeywords.slice(0, 2));
  secondary.push(...lib.technicalKeywords.slice(0, 1));

  // 长尾：地域 + 产品 + 采购/应用
  const longTail: string[] = [];
  const countryName = gccCountries.find(c => c.code === gccCountryCode)?.name || '';
  if (countryName && gccCountryCode !== 'general-gcc') {
    longTail.push(`${primary} ${countryName}`);
    longTail.push(`مورد ${primary} ${countryName}`);
    longTail.push(`${primary} لـ ${industrySegments.find(i => i.code === industryCode)?.name} ${countryName}`);
  }
  longTail.push(`${primary} ${lib.procurementKeywords[0]}`);
  longTail.push(`كيف تختار ${primary}`);

  return {
    primary,
    secondary: [...new Set(secondary)].slice(0, 6),
    longTail: [...new Set(longTail)].slice(0, 5),
  };
}

/**
 * 生成 URL slug
 */
function generateSlug(
  productFamily: string,
  modelSlug: string,
  industry: string,
  gccCountry: string,
  articleType: string,
  focus: string,
  variantIdx: number
): string {
  const parts = [productFamily, modelSlug, industry, gccCountry, articleType, focus, String(variantIdx)];
  return parts.filter(Boolean).join('-').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

/**
 * 映射文章类型到搜索意图
 */
function mapIntent(articleType: string): TopicSpec['searchIntent'] {
  const intentMap: Record<string, TopicSpec['searchIntent']> = {
    'product-comparison': 'commercial',
    'multi-product-comparison': 'commercial',
    'buying-guide': 'commercial',
    'technical-guide': 'technical',
    'application-guide': 'informational',
    'process-tutorial': 'technical',
    'troubleshooting': 'technical',
    'product-spec-detail': 'supplier-evaluation',
    'procurement-guide': 'supplier-evaluation',
    'wholesale-oem-guide': 'transactional',
    'industry-market': 'informational',
    'gcc-regional-sourcing': 'supplier-evaluation',
    'faq-buyers-guide': 'commercial',
  };
  return intentMap[articleType] || 'informational';
}

/**
 * 计算优先级（1=高，商业价值高的长尾优先）
 */
function calculatePriority(articleType: string, gccCountry: string, industry: string): number {
  // 高商业意图类型 + 核心 GCC 国家 + 核心行业 = 优先级 1
  const highIntentTypes = ['buying-guide', 'product-spec-detail', 'procurement-guide', 'wholesale-oem-guide', 'gcc-regional-sourcing', 'product-comparison'];
  const coreCountries = ['saudi-arabia', 'uae', 'qatar'];
  const coreIndustries = ['metalworking', 'woodworking', 'automotive', 'shipbuilding', 'oil-gas'];

  let score = 0;
  if (highIntentTypes.includes(articleType)) score += 2;
  if (coreCountries.includes(gccCountry)) score += 2;
  if (coreIndustries.includes(industry)) score += 1;

  if (score >= 4) return 1;
  if (score >= 2) return 2;
  return 3;
}

/**
 * 辅助函数
 */
function getAlternativeProduct(productFamilySlug: string): string {
  const alternatives: Record<string, string> = {
    'abrasive-belts': 'أقراص الصنفرة',
    'flap-discs': 'أحزمة الصنفرة',
    'sanding-discs': 'أحزمة الصنفرة',
    'hook-loop': 'أقراص لاصق PSA',
    'sanding-sponges': 'أقراص الصنفرة',
  };
  return alternatives[productFamilySlug] || 'المنتج البديل';
}

function getTechnicalTopic(productFamilySlug: string): string {
  const topics: Record<string, string> = {
    'abrasive-belts': 'أحزمة الصنفرة (الحبيبات، القاعدة، الرابطة)',
    'flap-discs': 'أقراص الشرائح (الشرائح، القاعدة، الزاوية)',
    'sanding-discs': 'أقراص الصنفرة (الشبكي، الصلب، اللاصق)',
    'hook-loop': 'نظام هوك آند لوب (الخطاف، الحلقة، التوافق)',
    'sanding-sponges': 'إسفنج الصنفرة (الكثافة، الحبيبات، المرونة)',
  };
  return topics[productFamilySlug] || 'التقنية';
}

/**
 * 技术主题词带型号名：有型号时用「产品名 (技术维度)」，
 * 无型号时回落纯技术主题。保证 technical-guide 标题含具体型号，避免同族撞题。
 */
function getTechnicalTopicForModel(
  productFamilySlug: string,
  model: typeof models[0] | null
): string {
  if (model) return `${model.name} (الحبيبات، القاعدة، الرابطة)`;
  return getTechnicalTopic(productFamilySlug);
}

function getProcessName(industryCode: string): string {
  const processes: Record<string, string> = {
    'woodworking': 'تشطيب الخشب',
    'metalworking': 'تشطيب المعادن',
    'automotive': 'تجهيز هياكل السيارات',
    'shipbuilding': 'صيانة أسطح السفن',
    'oil-gas': 'تهيئة أسطح النفط',
    'construction': 'تشطيب مواد البناء',
    'general': 'الصنفرة الصناعية',
  };
  return processes[industryCode] || 'العملية';
}

// ========== 主生成函数 ==========

/**
 * 生成完整选题矩阵（目标 ~3000 篇）
 */
export function generateTopicMatrix(): TopicSpec[] {
  const allTopics: TopicSpec[] = [];

  // 遍历所有组合
  for (const productFamily of productFamilies) {
    const modelsToUse = productFamily.models.length > 0 ? productFamily.models : [null];

    for (const model of modelsToUse) {
      for (const industry of industrySegments) {
        // 过滤：只生成相关的产品-行业组合
        if (!isRelevantCombination(productFamily.slug, industry.code, model)) continue;

        for (const gccCountry of gccCountries) {
          // 反规模化策略：内容选题按「主市场(qatar)+泛海湾(general-gcc)」双轨生成，
          // 其余 5 国只生成地域寻源篇（gcc-regional-sourcing），其正文由国家级真实数据
          // （港口、监管机构、工业集群、文化商务要点）驱动，与其他国家版本正文显著不同——
          // 不再是同模板换国名的 doorway 形态。
          const isPanGcc = gccCountry.code === 'general-gcc';
          const isPrimary = gccCountry.code === 'qatar';
          if (!isPrimary && !isPanGcc) {
            // 非主市场：仅地域寻源两型
            const regionalTypes = articleTypes.filter(t => t === 'gcc-regional-sourcing');
            for (const articleType of regionalTypes) {
              allTopics.push(...generateTopicsForCombination(productFamily, model, industry, gccCountry, articleType));
            }
            continue;
          }
          // 主市场/泛海湾：地域寻源篇在 general-gcc 不生成；泛海湾只保留核心信息型 6 类
          let relevantTypes = isPanGcc
            ? articleTypes.filter(t => t !== 'gcc-regional-sourcing')
            : articleTypes;
          if (isPanGcc) {
            // general-gcc 保留全部非地域寻源类型（泛海湾视角与 qatar 主版标题/关键词不同轨，
            // 且泛海湾篇面向 6 国汇总查询，意图可区分）
          }

          for (const articleType of relevantTypes) {
            const topics = generateTopicsForCombination(productFamily, model, industry, gccCountry, articleType);
            allTopics.push(...topics);
          }
        }
      }
    }
  }

  // 去重
  const deduped = deduplicateTopics(allTopics);

  // 按优先级排序
  deduped.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

  return deduped;
}

/**
 * 判断产品-行业-型号组合是否相关
 */
function isRelevantCombination(productFamily: string, industry: string, model: typeof models[0] | null): boolean {
  const relevanceMap: Record<string, string[]> = {
    'abrasive-belts': ['woodworking', 'metalworking', 'automotive', 'shipbuilding', 'construction', 'oil-gas', 'general'],
    'flap-discs': ['metalworking', 'automotive', 'shipbuilding', 'oil-gas', 'construction', 'woodworking', 'general'],
    'sanding-discs': ['woodworking', 'metalworking', 'automotive', 'construction', 'shipbuilding', 'general'],
    'hook-loop': ['woodworking', 'metalworking', 'automotive', 'construction', 'general'],
    'sanding-sponges': ['woodworking', 'automotive', 'construction', 'metalworking', 'general'],
  };
  return relevanceMap[productFamily]?.includes(industry) ?? true;
}

/**
 * 去重：同一 dedupeKey 只保留优先级最高的
 */
function deduplicateTopics(topics: TopicSpec[]): TopicSpec[] {
  const seen = new Map<string, TopicSpec>();
  for (const topic of topics) {
    const existing = seen.get(topic.dedupeKey);
    if (!existing || topic.priority < existing.priority) {
      seen.set(topic.dedupeKey, topic);
    }
  }
  return Array.from(seen.values());
}

/**
 * 统计报告
 */
export function printMatrixStats(topics: TopicSpec[]) {
  console.log(`\n=== 选题矩阵统计 ===`);
  console.log(`总计: ${topics.length} 篇`);

  const byType = topics.reduce((acc, t) => {
    acc[t.articleType] = (acc[t.articleType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('\n按类型:');
  Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  const byPriority = topics.reduce((acc, t) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  console.log('\n按优先级:');
  Object.entries(byPriority).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([k, v]) => console.log(`  P${k}: ${v}`));

  const byCountry = topics.reduce((acc, t) => {
    acc[t.gccCountry] = (acc[t.gccCountry] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('\n按地区:');
  Object.entries(byCountry).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  const byProduct = topics.reduce((acc, t) => {
    acc[t.productFamily] = (acc[t.productFamily] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('\n按产品族:');
  Object.entries(byProduct).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  const byIndustry = topics.reduce((acc, t) => {
    acc[t.industry] = (acc[t.industry] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('\n按行业:');
  Object.entries(byIndustry).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
}

// 导出单例
export const topicMatrix = generateTopicMatrix();
printMatrixStats(topicMatrix);