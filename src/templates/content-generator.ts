/**
 * 文章内容生成器
 * 基于选题规格 + 模板 + 产品数据 生成符合提示词规范的阿语文章 HTML
 */

import { models, getModelByCategory } from '../data/models';
import { productCategories, industries, SITE, applicationScenes } from '../data/site';
import { glossary } from '../data/glossary';
import { articleTemplates, getTemplate, ArticleTemplate } from './article-templates';
import { TopicSpec, topicMatrix, gccCountries, industrySegments, keywordLibrary } from './topic-matrix';

// ========== 确定性种子（slug → 0..N 变体选择，保证可复现） ==========

/**
 * FNV-1a 32 位：同一 slug 永远同值（可增量重建），不同 slug 均匀落桶。
 * 用于驱动措辞模板/FAQ 滑窗/可选章节的确定性变体，降低同质化且无随机性。
 */
export function seedOf(slug: string, mod: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % mod;
}

/** 按种子从数组中取一个元素（空数组返回 undefined） */
function pickBySeed<T>(arr: T[], seed: number, mod: number): T | undefined {
  if (!arr?.length) return undefined;
  return arr[seed % arr.length];
}

// ========== 术语表快速查找 ==========

const termMap = new Map(glossary.map(g => [g.term.toLowerCase(), g.ar]));
const productTermMap: Record<string, string> = {
  'abrasive belts': 'أحزمة الصنفرة',
  'sanding belts': 'أحزمة صنفرة',
  'grinding belts': 'أحزمة شحذ',
  'abrasive discs': 'أقراص قاشة',
  'sanding discs': 'أقراص الصنفرة',
  'flap discs': 'أقراص كوت (Flap Disc)',
  'mesh sanding discs': 'أقراص صنفرة شبكية',
  'PSA': 'لصق ذاتي (PSA)',
  'hook-and-loop': 'هوك آند لوب',
  'sanding sponges': 'إسفنجيات صنفرة',
  'grit': 'درجة الغرِت',
  'backing': 'القاعدة',
  'resin bond': 'رابطة إسفنجية',
  'aluminum oxide': 'أكسيد الألومنيوم',
  'zirconia alumina': 'زركونيا ألومينا',
  'ceramic': 'حبيبات سيراميك',
  'silicon carbide': 'كربيد السيليكون (SiC)',
};

function t(term: string): string {
  return productTermMap[term.toLowerCase()] || termMap.get(term.toLowerCase()) || term;
}

// ========== 内容生成核心 ==========

export interface GeneratedArticle {
  frontmatter: Record<string, any>;
  html: string;
  slug: string;
}

function getModel(slug: string) {
  return models.find(m => m.slug === slug);
}

function getProductCategory(slug: string) {
  const cat = productCategories.find(c => c.slug === slug);
  if (!cat) {
    console.warn(`[WARN] Product category not found for slug: ${slug}`);
    // 返回一个最小的回退对象，避免后续代码报错
    return {
      slug,
      name: getProductFamilyNameAr(slug),
      title: '',
      description: '',
      image: '',
      applications: [],
      specs: [],
      faq: [],
    } as typeof productCategories[0];
  }
  return cat;
}

function getIndustry(slug: string) {
  return industries.find(i => i.slug === slug);
}

function getGCCCountry(code: string) {
  return gccCountries.find(c => c.code === code);
}

/**
 * 生成单篇文章
 */
export function generateArticle(topic: TopicSpec): GeneratedArticle {
  const template = getTemplate(topic.articleType);
  if (!template) throw new Error(`Unknown template: ${topic.articleType}`);

  const model = topic.productModel ? getModel(topic.productModel) : null;
  const productCat = getProductCategory(topic.productFamily);
  const industry = getIndustry(topic.industry);
  const gccCountry = getGCCCountry(topic.gccCountry);

  const frontmatter = buildFrontmatter(topic, template, model, productCat, industry, gccCountry);
  const html = buildArticleHTML(topic, template, model, productCat, industry, gccCountry);

  return { frontmatter, html, slug: topic.slug };
}

/**
 * 构建 Frontmatter（符合 Content Collections schema）
 */
function buildFrontmatter(
  topic: TopicSpec,
  template: ArticleTemplate,
  model: typeof models[0] | null,
  productCat: typeof productCategories[0] | undefined,
  industry: typeof industries[0] | undefined,
  gccCountry: typeof gccCountries[0] | undefined
) {
  const now = new Date().toISOString();

  // 内链：至少 3 条
  const internalLinks = buildInternalLinks(topic, model, productCat, industry);

  // 外链：2-4 条权威来源
  const externalLinks = buildExternalLinks(topic, industry, gccCountry);

  // FAQ
  const faq = buildFAQ(topic, model, productCat, industry, gccCountry);

  // 规格表
  const specsTable = buildSpecsTable(topic, model, productCat);

  // 信息块
  const infoBoxes = buildInfoBoxes(topic, model, productCat, industry, gccCountry);

  // 语音搜索查询
  const voiceSearchQueries = buildVoiceSearchQueries(topic, model, productCat, industry, gccCountry);

  // CTA
  const cta = buildCTA(topic, model, productCat);

  return {
    title: topic.title,
    description: buildMetaDescription(topic, model, productCat),
    publishDate: now,
    updatedDate: now,
    author: 'MoTai Abrasives',
    category: topic.articleType,
    productFamily: topic.productFamily,
    productModel: topic.productModel,
    industry: topic.industry,
    gccCountry: topic.gccCountry,
    keywords: [topic.primaryKeyword, ...topic.secondaryKeywords, ...topic.longTailKeywords],
    primaryKeyword: topic.primaryKeyword,
    secondaryKeywords: topic.secondaryKeywords,
    longTailKeywords: topic.longTailKeywords,
    searchIntent: topic.searchIntent,
    featuredImage: model?.image ? `https://ar.motaiabrasive.com${model.image}` : productCat?.image ? `https://ar.motaiabrasive.com${productCat.image}` : undefined,
    featuredImageAlt: model?.imageAlt || productCat?.name,
    internalLinks,
    externalLinks,
    cta,
    faq,
    specsTable,
    infoBoxes,
    voiceSearchQueries,
    buyerJourneyStage: topic.buyerJourneyStage,
    notes: `Generated from topic matrix. Priority: P${topic.priority}. DedupeKey: ${topic.dedupeKey}`,
  };
}

/**
 * 构建文章 HTML 正文
 */
function buildArticleHTML(
  topic: TopicSpec,
  template: ArticleTemplate,
  model: typeof models[0] | null,
  productCat: typeof productCategories[0] | undefined,
  industry: typeof industries[0] | undefined,
  gccCountry: typeof gccCountries[0] | undefined
): string {
  const sections: string[] = [];

  // 根容器
  sections.push('<div dir="rtl" lang="ar" class="article-content">');

  // 型号真实规格差异块（根 div 内、BLUF 前），保证同类目跨型号正文可区分（B 去重）
  sections.push(buildModelSpecBlock(model));

  // BLUF + 直接回答块
  sections.push(buildBLUF(topic, model, productCat, industry, gccCountry));
  sections.push(buildDirectAnswerBlock(topic, model, productCat, industry, gccCountry));

  // 按模板结构生成 H2 章节
  template.structure.forEach((h2Title, idx) => {
    const sectionHtml = buildSection(h2Title, topic, model, productCat, industry, gccCountry, template, idx);
    if (sectionHtml) sections.push(sectionHtml);
  });

  // 广度差异化：按种子插入 0–2 个可选附加章节（复用现有构建器，章节数随 slug 浮动）
  const optSeed = seedOf(topic.slug + ':opt', 1_000_000);
  const optionalSections: Array<{ title: string; build: () => string }> = [
    { title: 'تحسين التكلفة على دورة الاستخدام', build: () => buildCostOptimization(topic, model, productCat) },
    { title: 'الصيانة الوقائية والعمر التشغيلي', build: () => buildPreventiveMaintenance(topic, model) },
    { title: 'بطاقة المصطلحات السريعة', build: () => buildGlossaryCard(topic) },
  ];
  // 选 0–2 个：bit 各独立决定一个章节是否插入（k0 ~50%，k1 ~33%）
  for (let k = 0; k < 2; k++) {
    const on = k === 0 ? optSeed % 2 === 0 : optSeed % 3 === 0;
    if (on) {
      const sec = optionalSections[k];
      const html = sec.build();
      if (html) sections.push(`<h2>${sec.title}</h2>\n${html}`);
    }
  }

  // FAQ
  sections.push(buildFAQSection(topic, model, productCat, industry, gccCountry));

  // CTA
  sections.push(buildCTASection(topic, model, productCat));

  sections.push('</div>');

  return sections.join('\n\n');
}

/** 型号真实规格差异块（根 div 内、BLUF 前），保证同类目跨型号正文可区分（B 去重） */
function buildModelSpecBlock(model: typeof models[0] | null): string {
  if (!model) return '';
  const grits = model.gritRange.slice(0, 4).join('–') + (model.gritRange.length > 4 ? '…' : '');
  const lines = [
    // MDX 合法注释语法（HTML 注释 <!-- --> 在 MDX/JSX 中非法，会中断构建）
    '{/* model-spec-block */}',
    `<h2>مواصفات ${model.name} (الفروقات الجوهرية)</h2>`,
    `<ul class="plain-links">`,
    `  <li><strong>درجات الغرِت المتاحة:</strong> ${grits}</li>`,
    `  <li><strong>القاعدة/الخلف:</strong> ${model.backing}</li>`,
    `  <li><strong>نظام التثبيت:</strong> ${model.attachment}</li>`,
    ...model.useCases.map((u) => `  <li><strong>استخدام أساسي:</strong> ${u}</li>`),
    ...model.notes.slice(0, 2).map((n) => `  <li><strong>ملاحظة فنية:</strong> ${n}</li>`),
    `</ul>`,
  ];
  return lines.join('\n');
}

/**
 * BLUF 开篇段
 */
function buildBLUF(
  topic: TopicSpec,
  model: typeof models[0] | null,
  productCat: typeof productCategories[0] | undefined,
  industry: typeof industries[0] | undefined,
  gccCountry: typeof gccCountries[0] | undefined
): string {
  const productName = model?.name || productCat?.name || getProductFamilyNameAr(topic.productFamily);
  const industryName = industry?.name || industrySegments.find(i => i.code === topic.industry)?.name || '';
  const countryName = gccCountry?.name || '';
  // 确定性种子：同一 slug 永远同一组变体（可复现），不同 slug 均匀分散
  const sv = seedOf(topic.slug, 1_000_000);
  const pick3 = <T,>(arr: T[]) => pickBySeed(arr, sv, 3) ?? arr[0];
  const pick2 = <T,>(arr: T[]) => pickBySeed(arr, Math.floor(sv / 3), 2) ?? arr[0];
  // 型号专属数据注入（有型号才加）
  const useCase = model?.useCases?.length ? ` من التطبيقات الداعمة: ${pick2([...model.useCases])}.` : '';
  const note = model?.notes?.length ? ` ${pick2([...model.notes])}.` : '';
  // 行业痛点注入（3 行业 site.ts + 4 行业 fallback）
  const challenge = industry?.challenges?.length ? ` أبرز التحدي: ${industry.challenges[sv % industry.challenges.length]}.` : '';

  let bluf = '';

  switch (topic.articleType) {
    case 'product-comparison':
      bluf = pick3([
        `اختيار ${productName} يعتمد على مادة القطعة، مرحلة التشطيب، ونوع الماكينة. للـ ${industryName}${countryName ? ` في ${countryName}` : ''}، تُحدد درجة الغرِت، عرض الحزام/قطر القرص، ونظام التثبيت قبل الطلب.`,
        `قرار ${productName} مقابل البدائل يُبنى على ثلاث محاور: المادة، مرحلة العمل، والتوافق مع الماكينة. للـ ${industryName}${countryName ? ` في ${countryName}` : ''}، المقاس ونظام التثبيت يحددان الخاطئ من الصائب.`,
        `قبل الطلب، حدّد للمادة والمرحلة والماكينة، ثم اختر من ${productName} المواصفة المناسبة لـ ${industryName}${countryName ? ` في ${countryName}` : ''}. الدرجات، القياس، ونظام التثبيت محاور القرار الأساسية.`,
      ]);
      bluf += useCase;
      break;
    case 'buying-guide':
      bluf = pick3([
        `تحديد مواصفات ${productName} يتم في ثلاث خطوات: مادة العمل → مرحلة التشطيب → توافق الماكينة. هذا الدليل يغطي المعايير، تسلسل الدرجات، ونموذج طلب عرض سعر جاهز للاستخدام.`,
        `إعداد طلب ${productName} بدقة يبدأ من ثلاثة أسئلة: ما المادة، ما مرحلة التشطيب، وأي ماكينة ستُستخدم. الدليل التالي يربط الإجابات بمواصفة قابلة للاستفسار.`,
        `قبل طلب عرض سعر لـ ${productName}، حدد المادة، المرحلة، ونظام التثبيت: هذه المحاور الثلاثة تبني عليها المواصفة النهائية مع تسلسل الدرجات ونموذج الاستفسار.`,
      ]);
      bluf += useCase + challenge;
      break;
    case 'technical-guide':
      bluf = pick3([
        `${productName} يعتمد على نوع الحبيبات (أكسيد الألومنيوم، زركونيا، سيراميك)، القاعدة (قماش/ورق/بوليمر)، والرابطة الإسفنجية. معايير FEPA/ISO تحدد درجة الغرِت بدقة.`,
        `ثلاثة مكونات تحدد أداء ${productName}: الحبيبات، القاعدة، والرابطة. اختيار الحبيبات وفق المادة، والقاعدة وفق الماكينة، والدرجة وفق FEPA P.`,
        `فهم ${productName} يبدأ من نوع الحبيبات (Al₂O₃/SiC/زركونيا/سيراميك) ثم القاعدة والرابطة، ثم قراءة درجة الغرِت وفق FEPA P دون خلطها بـ ANSI أو JIS.`,
      ]);
      bluf += note;
      break;
    case 'application-guide':
      bluf = pick3([
        `في ${industryName}${countryName ? ` (${countryName})` : ''}، دورة ${productName} تشمل: إزالة → تشطيب متوسط → لمسة نهائية. تسلسل الغرِت النموذجي: 60–80 → 120–180 → 240–400 حسب المادة.`,
        `تطبيق ${productName} في ${industryName}${countryName ? ` (${countryName})` : ''} يمر بثلاث مراحل: الإزالة الخشنة، التسوية، واللمسة النهائية، مع تسلسل غرِت يبدأ من 60–80 وينتهي عند 240–400 أو أعلى.`,
        `للعمل على ${industryName}${countryName ? ` في ${countryName}` : ''}، رتّب تشغيل ${productName} من الخشن إلى الناعم: إزالة (60–80) ثم تسوية (120–180) ثم تشطيب (240–400+) حسب المادة والنتيجة.`,
      ]);
      bluf += useCase + challenge;
      break;
    case 'process-tutorial':
      bluf = pick2([
        `العملية القياسية لـ ${industryName || 'التطبيق'} باستخدام ${productName}: تجهيز السطح → درجة خشنة للإزالة → درجة متوسطة للتسوية → درجة ناعمة للتشطيب. كل مرحلة لها معلمات ماكينة محددة.`,
        `تسلسل تشغيل ${productName} في ${industryName || 'التطبيق'}: نظّف السطح، ثم صنفرة الإزالة، ثم التسوية، ثم التشطيب. المعلمات (سرعة، ضغط، تغذية) تُضبط لكل مرحلة.`,
      ]);
      bluf += note;
      break;
    case 'troubleshooting':
      bluf = pick3([
        `أعطال ${productName} الشائعة (تآكل سريع، انسداد، انحراف) تعود عادةً إلى: درجة غرِت غير مناسبة، ضغط زائد، سرعة غير مطابقة، أو ضعف سحب الغبار. الجدول أدناه يربط العارض بالسبب والحل.`,
        `عند ملاحظة تآكل غير طبيعي أو انسداد أو انحراف في ${productName}، راجع بالترتيب: الغرِت، الضغط، السرعة، ثم نظام الشفط. كل عارض له سبب محدد وحل مباشر في الجدول التالي.`,
        `تشخيص مشاكل ${productName} يبدأ من العارض المرصود (سرعة العطل، نمط الانسداد، اتجاه الانحراف) ثم يطابق السبب: غير ملاءمة الغرِت، تحميل زائد، أو قصور في الشفط.`,
      ]);
      bluf += useCase;
      break;
    case 'product-spec-detail':
      bluf = pick2([
        `${model?.name || productName}: ${model?.summary || productCat?.description || 'مواصفات كاملة في الأسفل'}. المقاس: ${model?.sizeAr || 'متعدد'}، الدرجات: ${model?.gritRange.join('، ') || 'حسب الطلب'}، القاعدة: ${model?.backing || 'يُحدد مع المشتري'}.`,
        `${model?.name || productName} يتوفر بالمقاس ${model?.sizeAr || 'متعدد'} بدرجات ${model?.gritRange.join('–') || 'حسب الطلب'} وقاعدة ${model?.backing || 'تُحدد مع المشتري'}. التفاصيل الكاملة وخيارات التخصيص في الجداول أدناه.`,
      ]);
      bluf += note;
      break;
    case 'procurement-guide':
      bluf = pick3([
        `شراء ${productName} باحترافية: 1) اكتب مواصفة تقنية كاملة 2) اطلب عينات للمقارنة 3) قيّم الموردين بمصفوفة موحدة 4) قارن العروض الكلية (سعر+شحن+شروط) 5) ثبت شروط التعاقد والجودة.`,
        `دورة شراء ${productName} تبدأ من مواصفة مكتوبة واضحة، ثم عينات مطابقة، ثم تقييم الموردين بمعايير موحدة قبل قارن العروض الشاملة وتثبيت بنود التعاقد.`,
        `لشراء ${productName} بالجملة دون مفاجآت: صُغ المواصفة، اطلب عينة، قيّم الموردين بمصفوفة واحدة، وقارن العروض على السعر الشامل والمهلة والشروط. الخطوات مفصلة أدناه.`,
      ]);
      bluf += useCase + challenge;
      break;
    case 'wholesale-oem-guide':
      bluf = pick3([
        `التعاون بالجملة/OEM لـ ${productName}: نحدد خيارات التخصيص (الشعار، التغليف، الألوان)، الحد الأدنى للكمية، مراحل تأكيد العينة، وجدول التوريد. كل التفاصيل في الدليل أدناه.`,
        `لطلب OEM/جملة على ${productName}، جهّز ملف الشعار والتغليف والدرجات المطلوبة، ثم تمر عبر العينة المؤكدة قبل الإنتاج الكمي. خيارات التخصيص والحد الأدنى موضحان أدناه.`,
        `مسار الجملة و OEM لـ ${productName} يمر بخمسة محطات: المواصفة، العينة، التأكيد، الإنتاج الكمي، والتسليم الموثق. خيارات التغليف والتخصيص محددة في الدليل التالي.`,
      ]);
      bluf += note;
      break;
    case 'industry-market':
      bluf = pick2([
        `قطاع ${industryName} في ${gccCountry?.name || 'الخليج'} يشهد تحديث معايير (FEPA/ISO/SASO/ESMA) واتجاه نحو حبيبات سيراميك/زركوريا للأداء الأعلى. التأثير على قرارات شراء ${productName}: مواصفات أدق، دورات أقصر.`,
        `تحولات قطاع ${industryName} في ${gccCountry?.name || 'الخليج'} (معايير FEPA/ISO، حبيبات متطورة، توثيق أدق) تعني أن شراء ${productName} أصبح قرارًا بالمواصفة لا بالاسم التجاري.`,
      ]);
      bluf += challenge;
      break;
    case 'gcc-regional-sourcing':
      bluf = pick3([
        `استيراد ${productName} إلى ${gccCountry?.name}: مطلب SASO/ESMA/GSO للامتثال، ميناء ${getMainPort(gccCountry?.code)} للتخليص، مهلة بحري 25–35 يوماً، دفع LC/TT. لا نملك مخزوناً محلياً ولا مكتباً في ${gccCountry?.name}.`,
        `خطة توريد ${productName} إلى ${gccCountry?.name} تعني: مطابقة SASO/ESMA/GSO، التخليص عبر ميناء ${getMainPort(gccCountry?.code)}، مهلة بحرية 25–35 يوماً، وشروط دفع LC/TT. الشحن من المصنع مباشرة دون مخزون محلي.`,
        `لضمان سلاسة استيراد ${productName} إلى ${gccCountry?.name}: جهّز شهادات المطابقة، حدد ميناء التخليص (${getMainPort(gccCountry?.code)})، ونسق الدفع (LC/TT). لا يوجد مخزون أو مكتب محلي لدينا.`,
      ]);
      bluf += useCase;
      break;
    case 'faq-buyers-guide':
      bluf = pick2([
        `أهم 3 أسئلة لمشتري ${productName}: 1) أي درجة غرِت لـ ${industryName}؟ → تعتمد على مرحلة العمل. 2) ما الحد الأدنى للطلب؟ → يُحدد بالمواصفة. 3) كم مدة التوريد؟ → تُحدد في عرض السعر حسب الكمية والمواصفة. التفاصيل في الأسئلة أدناه.`,
        `مشترو ${productName} يسألون عادةً عن: اختيار الغرِت لـ ${industryName}، حد الكمية الأدنى، ومهلة التوريد. الإجابات المباشرة في قسم الأسئلة أدناه مع نموذج الاستفسار الجاهز.`,
      ]);
      bluf += challenge;
      break;
    default:
      bluf = `${productName} لـ ${industryName}${countryName ? ` في ${countryName}` : ''}: المواصفات، الدرجات، وخطوات الطلب موضحة أدناه.`;
      bluf += useCase;
  }

  return `<p class="bluf"><strong>${bluf}</strong></p>`;
}

/**
 * 直接回答块（AEO 优化）
 */
function buildDirectAnswerBlock(
  topic: TopicSpec,
  model: typeof models[0] | null,
  productCat: typeof productCategories[0] | undefined,
  industry: typeof industries[0] | undefined,
  gccCountry: typeof gccCountries[0] | undefined
): string {
  const productName = model?.name || productCat?.name || getProductFamilyNameAr(topic.productFamily);
  let answer = '';

  switch (topic.articleType) {
    case 'product-comparison':
      answer = `${productName} يناسب ${industry?.name || 'التطبيقات الصناعية'} عند الحاجة إلى إزالة مادة سريعة/متوسطة مع تحكم في التشطيب. البديل (أقراص/أحزمة أخرى) يُختار عند مساحات أضيق أو ماكينات مختلفة.`;
      break;
    case 'buying-guide':
      answer = `حدد: 1) مادة القطعة (خشب/معدن/بلاستيك) 2) مرحلة العمل (إزالة/تشطيب/لمسة نهائية) 3) ماكينة ومقاس التثبيت. ثم اختر الغرِت: 40–80 للإزالة، 100–180 للتشطيب، 240+ للنهائي.`;
      break;
    case 'technical-guide':
      answer = `الحبيبات: أكسيد ألومنيوم (عام)، زركونيا (معدن صلب)، سيراميك (أداء عالي). القاعدة: قماش (مرن)، ورق (ثابت)، بوليمر (مقاوم رطوبة). الرابطة: إسبنجية تقاوم الحرارة. الغرِت وفق FEPA P.`;
      break;
    case 'application-guide':
      answer = `التسلسل المعياري: درجة 60–80 (إزالة صدأ/طلاء/مادة) → 120–180 (تسوية) → 240–400 (تشطيب نهائي). للـ ${industry?.name} يضاف: تنظيف → فحص → تجهيز للدهان/الطلاء.`;
      break;
    case 'process-tutorial':
      answer = `الخطوات: 1) تنظيف القطعة 2) اختيار الغرِت الأول 3) ضبط سرعة/ضغط الماكينة 4) صنفرة بالتسلسل 5) تنظيف بين المراحل 6) فحص نهائي. المعلمات تختلف حسب المادة والماكينة.`;
      break;
    case 'troubleshooting':
      answer = `التآكل السريع → غرِت أدق أو ضغط أقل. الانسداد (Loading) → قاعدة شبكية أو مبرد. الانحراف → فحص بكرات الماكينة واتجاه الحزام. ضعف الشفط → تنظيف الفلاتر وخراطيم السحب.`;
      break;
    case 'product-spec-detail':
      answer = `${model?.name || productName}: ${model?.sizeAr || 'أبعاد متعددة'}، غرِت ${model?.gritRange.join('–') || 'حسب الطلب'}، قاعدة ${model?.backing || 'قماش/ورق/بوليمر'}، تثبيت ${model?.attachment || 'يُحدد مع الماكينة'}.`;
      break;
    case 'procurement-guide':
      answer = `المواصفة التقنية: المنتج، المقاس، الغرِت، القاعدة، التثبيت، الكمية، التغليف، وجهة الشحن. التقييم: السعر الشامل، المهلة، الشهادات، مرونة OEM، سجل التسليم. التعاقد: شروط الدفع، جزاءات التأخر، مواصفات الجودة.`;
      break;
    case 'wholesale-oem-guide':
      answer = `OEM يتطلب: ملف شعار فيكتور، رسومات تغليف، لغات الأسواق المستهدفة، مواصفات طباعة. الحد الأدنى للكمية يُحدد حسب المنتج والتخصيص. العينة تؤكد قبل الإنتاج الكمي.`;
      break;
    case 'industry-market':
      answer = `المعايير المحدثة (FEPA P، ISO 6344، SASO، ESMA) تشدد على اتساق الغرِت وانبعاثات الغبار. الاتجاه: حبيبات سيراميك/زركوريا للخدمة الشاقة، قواعد بوليمرية للبيئات الرطبة.`;
      break;
    case 'gcc-regional-sourcing':
      answer = `المتطلبات: شهادة مطابقة SASO (السعودية)/ESMA (الإمارات)/GSO (الخليج). الميناء الرئيسي: ${getMainPort(gccCountry?.code)}. مهلة بحري 25–35 يوم. الدفع: LC مستندي أو TT مسبق. لا وجود لمخزن محلي.`;
      break;
    case 'faq-buyers-guide':
      answer = `1) كيف أختار الغرِت؟ → مرحلة العمل تحدد. 2) ما الـ MOQ؟ → بالمواصفة. 3) مهلة التوريد؟ → تُحدد في عرض السعر. 4) هل تدعمون OEM؟ → نعم، بشروط. 5) كيف أطلب عرضاً؟ → نموذج الاستفسار مع المواصفة الكاملة.`;
      break;
    default:
      answer = `الجواب المباشر: ${productName} يُختار حسب المادة، المرحلة، والماكينة. التفاصيل في المقال.`;
  }

  return `
<div class="direct-answer" style="background:#f5f8ff;border-right:4px solid #2563eb;padding:1rem;margin:1.5rem 0;border-radius:0 8px 8px 0;">
  <strong>إجابة مباشرة:</strong> ${answer}
</div>`;
}

/**
 * 构建各章节
 */
function buildSection(
  h2Title: string,
  topic: TopicSpec,
  model: typeof models[0] | null,
  productCat: typeof productCategories[0] | undefined,
  industry: typeof industries[0] | undefined,
  gccCountry: typeof gccCountries[0] | undefined,
  template: ArticleTemplate,
  idx: number
): string {
  let content = '';
  const type = topic.articleType;

  // GCC Regional Sourcing - 精确逐节匹配
  if (type === 'gcc-regional-sourcing') {
    if (h2Title.includes('لوائح') || h2Title.includes('امتثال') || h2Title.includes('SASO') || h2Title.includes('ESMA') || h2Title.includes('GSO')) {
      content = buildImportCompliance(gccCountry);
    }
    else if (h2Title.includes('لوجستيات') || h2Title.includes('موانئ') || h2Title.includes('التخليص') || h2Title.includes('مسارات')) {
      content = buildLogisticsPorts(gccCountry);
    }
    else if (h2Title.includes('موزعين') || h2Title.includes('وكلاء') || h2Title.includes('نموذج الموزع')) {
      content = buildDistributionModel(gccCountry);
    }
    else if (h2Title.includes('أسعار الصرف') || h2Title.includes('طرق الدفع') || h2Title.includes('شروط التجارة')) {
      content = buildPaymentTerms(gccCountry);
    }
    else if (h2Title.includes('ثقافية') || h2Title.includes('تواصل') || h2Title.includes('نقاط ثقافية')) {
      content = buildCulturalNotes(gccCountry);
    }
    else if (h2Title.includes('إخلاء') || h2Title.includes('ما لا نلتزم') || h2Title.includes('مسؤولية')) {
      content = buildDisclaimer(gccCountry);
    }
  }
  // Industry Market - 精确逐节匹配
  else if (type === 'industry-market') {
    if (h2Title.includes('خلفية') || h2Title.includes('عوامل') || h2Title.includes('محركات')) {
      content = buildMarketContext(topic, industry, gccCountry);
    }
    else if (h2Title.includes('تحديثات') || h2Title.includes('معايير') || h2Title.includes('قراءة') || h2Title.includes('FEPA') || h2Title.includes('ISO') || h2Title.includes('SASO') || h2Title.includes('ESMA') || h2Title.includes('GSO')) {
      content = buildStandardsAnalysis(topic, industry, gccCountry);
    }    else if (h2Title.includes('حجم السوق') || h2Title.includes('بيانات') || h2Title.includes('نمو') || h2Title.includes('اقتباس')) {
      content = buildMarketData(topic, industry, gccCountry);
    }
    else if (h2Title.includes('اتجاهات تقنية') || h2Title.includes('ابتكار') || h2Title.includes('اتجاهات المنتج')) {
      content = buildTechTrends(topic, industry, gccCountry);
    }
    else if (h2Title.includes('قرارات') || h2Title.includes('انعكاس') || h2Title.includes('مشتريات')) {
      content = buildProcurementImplications(topic, industry, gccCountry);
    }
  }
  // Procurement Guide - 精确逐节匹配
  else if (type === 'procurement-guide') {
    if (h2Title.includes('منهجية') || h2Title.includes('5 خطوات') || h2Title.includes('خطوات التحديد')) {
      content = buildDecisionGuide(topic, model, productCat, industry);
    }
    else if (h2Title.includes('توحيد') || h2Title.includes('نموذج مواصفة') || h2Title.includes('نموذج طلب')) {
      content = buildProcurementTemplate(topic, model, productCat);
    }
    else if (h2Title.includes('بطاقة تقييم') || h2Title.includes('عينات')) {
      content = buildSampleEvaluation(topic, model, productCat);
    }
    else if (h2Title.includes('مصفوفة تقييم') || h2Title.includes('موردين')) {
      content = buildSupplierMatrix(topic, model, productCat);
    }
    else if (h2Title.includes('مقارنة') || h2Title.includes('عروض') || h2Title.includes('نقاط المقارنة')) {
      content = buildQuoteComparison(topic, model, productCat);
    }
    else if (h2Title.includes('فخاخ') || h2Title.includes('مصائد') || h2Title.includes('أخطاء')) {
      content = buildCommonMistakes(topic, model, productCat);
    }
    else if (h2Title.includes('بنود') || h2Title.includes('عقود') || h2Title.includes('شروط التسليم')) {
      content = buildContractTerms(topic, model, productCat);
    }
  }
  // Wholesale OEM Guide - 精确逐节匹配
  else if (type === 'wholesale-oem-guide') {
    if (h2Title.includes('سير عمل') || h2Title.includes('نظرة عامة') || h2Title.includes('OEM')) {
      content = buildOEMOverview(topic, model, productCat);
    }
    else if (h2Title.includes('مصفوفة خيارات') || h2Title.includes('خيارات تخصيص')) {
      content = buildOEMOptions(topic, model, productCat);
    }
    else if (h2Title.includes('مواصفات تصميم') || h2Title.includes('التغليف') || h2Title.includes('العلامة التجارية')) {
      content = buildPackagingSpecs(topic, model, productCat);
    }
    else if (h2Title.includes('حد أدنى') || h2Title.includes('شرائح الأسعار') || h2Title.includes('MOQ')) {
      content = buildMOQPricing(topic, model, productCat);
    }
    else if (h2Title.includes('عملية تأكيد') || h2Title.includes('معايير تأكيد') || h2Title.includes('عينات')) {
      content = buildSampleApproval(topic, model, productCat);
    }
    else if (h2Title.includes('فحص الجودة') || h2Title.includes('معايير الاستلام') || h2Title.includes('فحص الجودة')) {
      content = buildQAStandards(topic, model, productCat);
    }
    else if (h2Title.includes('لوجستيات') || h2Title.includes('جمارك') || h2Title.includes('تنسيق')) {
      content = buildLogisticsCustoms(topic, model, productCat);
    }
    else if (h2Title.includes('إطار') || h2Title.includes('طويل الأمد') || h2Title.includes('شراكة') || h2Title.includes('إطار عمل')) {
      content = buildPartnershipFramework(topic, model, productCat);
    }
  }
  // Application Guide - 精确逐节匹配
  else if (type === 'application-guide') {
    if (h2Title.includes('نقاط الألم') || h2Title.includes('حلول') || h2Title.includes('نقاط الوجع')) {
      content = buildPainPoints(topic, model, productCat, industry);
    }
    else if (h2Title.includes('تفصيل') || h2Title.includes('عمليات') || h2Title.includes('مراحل العمل') || h2Title.includes('دورة العمل')) {
      content = buildApplicationSection(topic, model, productCat, industry, gccCountry);
    }
    else if (h2Title.includes('تركيبة') || h2Title.includes('مجموعة المنتجات') || h2Title.includes('تسلسل الغرِت')) {
      content = buildProductCombo(topic, model, productCat, industry);
    }
    else if (h2Title.includes('إعدادات') || h2Title.includes('معامل') || h2Title.includes('المعلمات')) {
      content = buildProcessParams(topic, model, productCat);
    }
    else if (h2Title.includes('سلامة') || h2Title.includes('امتثال') || h2Title.includes('SASO') || h2Title.includes('ESMA') || h2Title.includes('GSO')) {
      content = buildSafetyCompliance(topic, industry, gccCountry);
    }
    else if (h2Title.includes('تكلفة') || h2Title.includes('تحسين') || h2Title.includes('مقايضة')) {
      content = buildCostOptimization(topic, model, productCat);
    }
    else if (h2Title.includes('نموذج مواصفة') || h2Title.includes('مشتريات')) {
      content = buildProcurementTemplate(topic, model, productCat);
    }
  }
  // Buying Guide - 精确逐节匹配
  else if (type === 'buying-guide') {
    if (h2Title.includes('三步') || h2Title.includes('خطوات التحديد') || h2Title.includes('مخطط تدفق')) {
      content = buildDecisionGuide(topic, model, productCat, industry);
    }
    else if (h2Title.includes('مقاييس') || h2Title.includes('المعالم الرئيسية') || h2Title.includes('المعايير الأساسية')) {
      content = buildKeyParamsTable(topic, model, productCat);
    }
    else if (h2Title.includes('تسلسل الغرِت') || h2Title.includes('حسب المادة') || h2Title.includes('توصيات')) {
      content = buildGritSequenceTable(topic, model, productCat, industry);
    }
    else if (h2Title.includes('兼容性') || h2Title.includes('兼容') || h2Title.includes('توافق') || h2Title.includes('قائمة تحقق')) {
      content = buildCompatibilityChecklist(topic, model, productCat);
    }
    else if (h2Title.includes('评估') || h2Title.includes('عينات') || h2Title.includes('معايير')) {
      content = buildSampleEvaluation(topic, model, productCat);
    }
    else if (h2Title.includes('معلومات') || h2Title.includes('طلب') || h2Title.includes('قبل العرض')) {
      content = buildInquiryChecklist(topic, model, productCat);
    }
  }
  // Product Comparison
  else if (type === 'product-comparison') {
    if (h2Title.includes('直接') || h2Title.includes('何时选') || h2Title.includes('متى تختار')) {
      content = buildComparisonDirectAnswer(topic, model, productCat);
    }
    else if (h2Title.includes('差异') || h2Title.includes('فروقات') || h2Title.includes('对比') || h2Title.includes('核心差异')) {
      content = buildComparisonTable(topic, model, productCat);
    }
    else if (h2Title.includes('决策') || h2Title.includes('سيناريوهات التطبيق') || h2Title.includes('شجرة القرار') || h2Title.includes('السيناريو')) {
      content = buildApplicationDecisionTree(topic, model, productCat, industry);
    }
    else if (h2Title.includes('المعلمات') || h2Title.includes('المواصفات') || h2Title.includes('تحليل معمق') || h2Title.includes('المواصفات')) {
      content = buildSpecsSection(topic, model, productCat);
    }
    else if (h2Title.includes('误区') || h2Title.includes('错误') || h2Title.includes('أخطاء') || h2Title.includes('常见')) {
      content = buildCommonMistakes(topic, model, productCat);
    }
    else if (h2Title.includes('采购') || h2Title.includes('确认') || h2Title.includes('清单') || h2Title.includes('采购确认')) {
      content = buildProcurementChecklist(topic, model, productCat);
    }
  }
  // Multi Product Comparison
  else if (type === 'multi-product-comparison') {
    if (h2Title.includes('一句话') || h2Title.includes('核心差异')) {
      content = buildComparisonDirectAnswer(topic, model, productCat);
    }
    else if (h2Title.includes('矩阵') || h2Title.includes('多维度') || h2Title.includes('对比矩阵')) {
      content = buildMultiComparisonMatrix(topic, model, productCat);
    }
    else if (h2Title.includes('变体') || h2Title.includes('ظروف التشغيل') || h2Title.includes('كل متغير') || h2Title.includes('مناسب')) {
      content = buildVariantDetails(topic, model, productCat);
    }
    else if (h2Title.includes('الأداء') || h2Title.includes('التكلفة') || h2Title.includes('مقايضة') || h2Title.includes('مقايضة')) {
      content = buildCostPerformanceTradeoff(topic, model, productCat);
    }
    else if (h2Title.includes('兼容') || h2Title.includes('ماكينة') || h2Title.includes('توافق')) {
      content = buildMachineCompatibility(topic, model, productCat);
    }
    else if (h2Title.includes('批量') || h2Title.includes('采购建议') || h2Title.includes('الجملة')) {
      content = buildBulkProcurementAdvice(topic, model, productCat);
    }
  }
  // Technical Guide
  else if (type === 'technical-guide') {
    if (h2Title.includes('3 句') || h2Title.includes('核心概念') || h2Title.includes('المفهوم')) {
      content = buildTechConceptSummary(topic, model, productCat);
    }
    else if (h2Title.includes('原理') || h2Title.includes('深度') || h2Title.includes('技术原理') || h2Title.includes('تحليل')) {
      content = buildTechDeepDive(topic, model, productCat);
    }
    else if (h2Title.includes('标准') || h2Title.includes('FEPA') || h2Title.includes('ANSI') || h2Title.includes('JIS') || h2Title.includes('مقارنة')) {
      content = buildStandardsComparison(topic, model, productCat);
    }
    else if (h2Title.includes('参数') || h2Title.includes('影响') || h2Title.includes('性能') || h2Title.includes('كيف تؤثر')) {
      content = buildParameterImpact(topic, model, productCat);
    }
    else if (h2Title.includes('误区') || h2Title.includes('概念') || h2Title.includes('错误') || h2Title.includes('تفنيد')) {
      content = buildMythBusting(topic, model, productCat);
    }
    else if (h2Title.includes('速查') || h2Title.includes('规格核对') || h2Title.includes('جدول مواصفات')) {
      content = buildSpecChecklist(topic, model, productCat);
    }
  }
  // Process Tutorial
  else if (type === 'process-tutorial') {
    if (h2Title.includes('概览') || h2Title.includes('标准工序') || h2Title.includes('سير العملية')) {
      content = buildProcessOverview(topic, model, industry);
    }
    else if (h2Title.includes('分步') || h2Title.includes('步骤') || h2Title.includes('指南') || h2Title.includes('详细') || h2Title.includes('إجراء')) {
      content = buildProcessSteps(topic, model, productCat, industry);
    }
    else if (h2Title.includes('递进') || h2Title.includes('序列') || h2Title.includes('تسلسل') || h2Title.includes('原则')) {
      content = buildGritProgressionTable(topic, model, industry);
    }
    else if (h2Title.includes('控制') || h2Title.includes('质检') || h2Title.includes('关键点') || h2Title.includes('نقاط التحكم')) {
      content = buildQualityControl(topic, model, industry);
    }
    else if (h2Title.includes('缺陷') || h2Title.includes('对策') || h2Title.includes('عيوب') || h2Title.includes('工艺缺陷')) {
      content = buildDefectTroubleshooting(topic, model, industry);
    }
    else if (h2Title.includes('材质') || h2Title.includes('调整') || h2Title.includes('不同材质') || h2Title.includes('نقاط الضبط')) {
      content = buildMaterialAdjustments(topic, model, industry);
    }
    else if (h2Title.includes('安全') || h2Title.includes('提示') || h2Title.includes('تنبيهات') || h2Title.includes('سلامة')) {
      content = buildSafetyTips(topic, industry);
    }
  }
  // Troubleshooting
  else if (type === 'troubleshooting') {
    if (h2Title.includes('速查') || h2Title.includes('表') || h2Title.includes('故障-原因') || h2Title.includes('العطل-السبب')) {
      content = buildTroubleshootingTable(topic, model);
    }
    else if (h2Title.includes('分类') || h2Title.includes('诊断') || h2Title.includes('逻辑') || h2Title.includes('تصنيف')) {
      content = buildFailureClassification(topic, model);
    }
    else if (h2Title.includes('逐项') || h2Title.includes('بالتفصيل') || h2Title.includes('كل حالة') || h2Title.includes('تحليل')) {
      content = buildRootCauseAnalysis(topic, model);
    }
    else if (h2Title.includes('根因') || h2Title.includes('排查') || h2Title.includes('清单') || h2Title.includes('قائمة')) {
      content = buildRootCauseChecklist(topic, model);
    }
    else if (h2Title.includes('预防') || h2Title.includes('维护') || h2Title.includes('الصيانة') || h2Title.includes('وقائية')) {
      content = buildPreventiveMaintenance(topic, model);
    }
    else if (h2Title.includes('支持') || h2Title.includes('联系') || h2Title.includes('تصعد') || h2Title.includes('何时')) {
      content = buildSupportEscalation();
    }
  }
  // Product Spec Detail
  else if (type === 'product-spec-detail') {
    if (h2Title.includes('定位') || h2Title.includes('核心') || h2Title.includes('适用') || h2Title.includes('التموضع')) {
      content = buildProductPositioning(topic, model, productCat);
    }
    else if (h2Title.includes('完整') || h2Title.includes('جميع المعلمات') || h2Title.includes('معاملات المواصفات') || h2Title.includes('المواصفات الكامل')) {
      content = buildFullSpecsTable(topic, model, productCat);
    }
    else if (h2Title.includes('التصميم') || h2Title.includes('المبادئ') || h2Title.includes('الأداء') || h2Title.includes('مبادئ')) {
      content = buildDesignPrinciples(topic, model, productCat);
    }
    else if (h2Title.includes('التوافق') || h2Title.includes('طراز الماكينة') || h2Title.includes('التركيب') || h2Title.includes('الماكينات')) {
      content = buildCompatibilityGuide(topic, model, productCat);
    }
    else if (h2Title.includes('التخصيص') || h2Title.includes('درجات الغرِت') || h2Title.includes('الأبعاد') || h2Title.includes('القاعدة') || h2Title.includes('العلامة التجارية') || h2Title.includes('اختياري')) {
      content = buildCustomizationOptions(topic, model, productCat);
    }
    else if (h2Title.includes('الطلب') || h2Title.includes('MOQ') || h2Title.includes('مهلة التوريد') || h2Title.includes('التغليف') || h2Title.includes('معلومات الطلب')) {
      content = buildOrderingInfo(topic, model, productCat);
    }
  }
  // FAQ Buyers Guide
  else if (type === 'faq-buyers-guide') {
    if (h2Title.includes('3 个') || h2Title.includes('Top 3') || h2Title.includes('أهم 3')) {
      content = buildTop3FAQ(topic, model, productCat);
    }
    else if (h2Title.includes('مجمعة') || h2Title.includes('分组') || h2Title.includes('按主题')) {
      content = '<p>الأسئلة أدناه مجمعة حسب المحور لتسهيل الوصول السريع.</p>';
    }
    else if (h2Title.includes('决策') || h2Title.includes('参考') || h2Title.includes('جدول مرجعي')) {
      content = buildDecisionReferenceTable(topic, model, productCat);
    }
    else if (h2Title.includes('نموذج') || h2Title.includes('تحميل') || h2Title.includes('نموذج طلب') || h2Title.includes('استفسار')) {
      content = buildInquiryTemplate(topic);
    }
    else if (h2Title.includes('术语') || h2Title.includes('速查') || h2Title.includes('مصطلحات') || h2Title.includes('بطاقة')) {
      content = buildGlossaryCard(topic);
    }
    else if (h2Title.includes('联系') || h2Title.includes('响应') || h2Title.includes('قنوات') || h2Title.includes('تواصل')) {
      content = buildContactInfo();
    }
  }
  // 其他类型的通用匹配
  else {
    // 通用规格表
    if (h2Title.includes('规格') || h2Title.includes('参数') || h2Title.includes('مواصفات') || h2Title.includes('مقاييس') || h2Title.includes('المعايير')) {
      content = buildSpecsSection(topic, model, productCat);
    }
    // 通用应用
    else if (h2Title.includes('应用') || h2Title.includes('场景') || h2Title.includes('工况') || h2Title.includes('تطبيقات') || h2Title.includes('دورة العمل')) {
      content = buildApplicationSection(topic, model, productCat, industry, gccCountry);
    }
    // 通用步骤
    else if (h2Title.includes('步骤') || h2Title.includes('工序') || h2Title.includes('خطوات') || h2Title.includes('تسلسل') || h2Title.includes('إجراء')) {
      content = buildProcessSteps(topic, model, productCat, industry);
    }
    // 通用安全
    else if (h2Title.includes('安全') || h2Title.includes('合规') || h2Title.includes('سلامة') || h2Title.includes('تنبيهات') || h2Title.includes('标准')) {
      content = buildSafetyCompliance(topic, industry, gccCountry);
    }
    // 通用成本
    else if (h2Title.includes('成本') || h2Title.includes('优化') || h2Title.includes('价格') || h2Title.includes('تكلفة') || h2Title.includes('تحسين')) {
      content = buildCostOptimization(topic, model, productCat);
    }
  }

  // 信息块插入（在合适位置）
  const infoBoxHtml = buildInlineInfoBoxes(topic, idx);
  if (infoBoxHtml) content = infoBoxHtml + '\n\n' + content;

  if (!content) return '';

  return `<h2>${h2Title}</h2>\n${content}`;
}

// 专门的故障排查详情构建
function buildTroubleshootingDetail(
  topic: TopicSpec,
  model: typeof models[0] | null,
  h2Title: string
): string {
  if (h2Title.includes('تصنيف') || h2Title.includes('منطق')) {
    return buildComparisonTable(topic, model, undefined); // 复用表格结构做故障-原因-对策表
  }
  if (h2Title.includes('تحليل') || h2Title.includes('أسباب')) {
    return buildRootCauseAnalysis(topic, model);
  }
  if (h2Title.includes('وقائية')) {
    return buildPreventiveMaintenance(topic, model);
  }
  if (h2Title.includes('تصعد') || h2Title.includes('دعم')) {
    return buildSupportEscalation();
  }
  return '';
}

// 专门的 FAQ 买家指南详情
function buildFAQBuyersDetail(
  topic: TopicSpec,
  model: typeof models[0] | null,
  h2Title: string
): string {
  if (h2Title.includes('مجمعة')) {
    return '<p>الأسئلة أدناه مجمعة حسب المحور لتسهيل الوصول السريع。</p>';
  }
  if (h2Title.includes('قرارات')) {
    return buildDecisionGuide(topic, model, undefined, undefined);
  }
  if (h2Title.includes('نموذج طلب')) {
    return buildInquiryTemplate(topic);
  }
  if (h2Title.includes('مصطلحات')) {
    return buildGlossaryCard(topic);
  }
  if (h2Title.includes('تواصل')) {
    return buildContactInfo();
  }
  return '';
}

// ========== 缺失的辅助函数 ==========

function buildKeyParamsTable(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  const productName = model?.name || productCat?.name || t(topic.productFamily);
  return `
<h3>المقاييس الرئيسية لاختيار ${productName}</h3>
<table class="spec-table">
  <thead><tr><th>المقياس</th><th>الوصف</th><th>كيف تحدد</th></tr></thead>
  <tbody>
    <tr><td>مادة القطعة</td><td>خشب، معدن، بلاستيك، مركب</td><td>حدد المادة الأساسية</td></tr>
    <tr><td>مرحلة العمل</td><td>إزالة / تشطيب / لمسة نهائية</td><td>الغرِت: 40–80 / 100–180 / 240+</td></tr>
    <tr><td>نظام التثبيت</td><td>هوك آند لوب / PSA / شبكي</td><td>طابق مع قاعدة الماكينة</td></tr>
    <tr><td>المقاس</td><td>طول×عرض (حزام) / قطر (قرص)</td><td>راجع دليل الماكينة</td></tr>
    <tr><td>نوع الحبيبات</td><td>أكسيد ألومنيوم / زركونيا / سيراميك</td><td>حسب صلادة المادة</td></tr>
    <tr><td>القاعدة</td><td>قماش / ورق / بوليمر</td><td>مرونة vs ثبات الأبعاد</td></tr>
  </tbody>
</table>`;
}

function buildGritSequenceTable(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined, industry: typeof industries[0] | undefined): string {
  const industryName = industry?.name || '';
  return `
<h3>تسلسل الغرِت المقترح لـ ${industryName}</h3>
<table class="spec-table">
  <thead><tr><th>المرحلة</th><th>الغرِت (FEPA P)</th><th>الهدف</th><th>ملاحظات</th></tr></thead>
  <tbody>
    <tr><td>إزالة مادة/صدأ/طلاء</td><td>40 – 80</td><td>إنتاجية عالية، إزالة سريعة</td><td>زركونيا/سيراميك للمعدن</td></tr>
    <tr><td>تشطيب متوسط</td><td>100 – 180</td><td>تسوية آثار المرحلة السابقة</td><td>أكسيد ألومنيوم عام</td></tr>
    <tr><td>تشطيب ناعم</td><td>240 – 400</td><td>تحضير للدهان/الطلاء</td><td>تجنب اللمعان المفرط</td></tr>
    <tr><td>لمسة نهائية</td><td>600 – 1500+</td><td>أسطح مرئية/دقيقة</td><td>للأثاث، السيارات، دقة</td></tr>
  </tbody>
</table>`;
}

function buildCompatibilityChecklist(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return `
<h3>قائمة تحقق توافق الماكينة</h3>
<ul class="plain-links">
  <li>☐ مقاس الحزام/القرص يطابق مواصفات الماكينة</li>
  <li>☐ نظام التثبيت (هوك آند لوب / PSA / شبكي) متوافق مع القاعدة</li>
  <li>☐ اتجاه دوران الحزام صحيح (للأحزمة)</li>
  <li>☐ طريقة الوصل مناسبة (مستقيم/مائل/متداخل)</li>
  <li>☐ سرعة الماكينة (RPM) ضمن حد المنتج</li>
  <li>☐ نظام الشفط يتوافق مع نوع القرص (مثقوب/شبكي)</li>
  <li>☐ وسادة التثبيت بحالة جيدة (خاصة هوك آند لوب)</li>
</ul>`;
}

function buildInquiryChecklist(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return buildProcurementTemplate(topic, model, productCat);
}

function buildComparisonDirectAnswer(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  const productName = model?.name || productCat?.name || t(topic.productFamily);
  const altProduct = getAlternativeProduct(topic.productFamily);
  return `
<p>${productName} يناسب عند الحاجة إلى إزالة مادة سريعة/متوسطة مع تحكم في التشطيب على مساحات كبيرة بماكينات حزام/قرص. ${altProduct} يُختار للأماكن الضيقة، الماكينات غير المتوافقة، أو أعمال التفاصيل الدقيقة.</p>`;
}

function buildApplicationDecisionTree(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined, industry: typeof industries[0] | undefined): string {
  return buildDecisionGuide(topic, model, productCat, industry);
}

function buildProcurementChecklist(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return buildInquiryChecklist(topic, model, productCat);
}

function buildMultiComparisonMatrix(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return buildComparisonTable(topic, model, productCat);
}

function buildVariantDetails(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return buildApplicationSection(topic, model, productCat, undefined, undefined);
}

function buildCostPerformanceTradeoff(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return buildCostOptimization(topic, model, productCat);
}

function buildMachineCompatibility(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return buildCompatibilityChecklist(topic, model, productCat);
}

function buildBulkProcurementAdvice(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return buildProcurementTemplate(topic, model, productCat);
}

function buildTechConceptSummary(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  const productName = model?.name || productCat?.name || t(topic.productFamily);
  return `
<p>${productName} يعتمد على ثلاثة عناصر أساسية: <strong>الحبيبات</strong> (أكسيد ألومنيوم، زركونيا، سيراميك) تحدد قدرة القطع، <strong>القاعدة</strong> (قماش، ورق، بوليمر) تحدد المرونة والثبات، <strong>الرابطة الإسفنجية</strong> تثبت الحبيبات وتقاوم الحرارة. درجة الغرِت وفق FEPA P تضمن الاتساق الدولي.</p>`;
}

function buildTechDeepDive(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return buildApplicationSection(topic, model, productCat, undefined, undefined);
}

function buildStandardsComparison(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return `
<h3>مقارنة منظومات معايير الغرِت</h3>
<table class="spec-table">
  <thead><tr><th>FEPA P (أوروبي)</th><th>ANSI (أمريكي)</th><th>JIS (ياباني)</th><th>ملاحظات</th></tr></thead>
  <tbody>
    <tr><td>P40</td><td>40</td><td>40</td><td>متطابقة تقريباً للدرجات الخشنة</td></tr>
    <tr><td>P80</td><td>80</td><td>80</td><td></td></tr>
    <tr><td>P120</td><td>120</td><td>120</td><td></td></tr>
    <tr><td>P240</td><td>240</td><td>240</td><td>تبدأ الاختلافات في الدرجات الناعمة</td></tr>
    <tr><td>P400</td><td>360</td><td>400</td><td>ANSI أدق برقم أقل</td></tr>
    <tr><td>P800</td><td>600</td><td>800</td><td></td></tr>
    <tr><td>P1200</td><td>800</td><td>1200</td><td>JIS أدق</td></tr>
  </tbody>
</table>
<p><strong>قاعدة:</strong> التزم بمعيار واحد (FEPA P موصى به دولياً) في كل مواصفة. لا تخلط معايير في طلب واحد.</p>`;
}

function buildParameterImpact(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return `
<h3>كيف تؤثر المعامل الرئيسية على الأداء</h3>
<table class="spec-table">
  <thead><tr><th>المعامل</th><th>زيادة القيمة</th><th>تقليل القيمة</th></tr></thead>
  <tbody>
    <tr><td>رقم الغرِت (أدق)</td><td>تشطيب أنعم، إزالة أبطأ</td><td>إزالة أسرع، خدوش أعمق</td></tr>
    <tr><td>ضغط التشغيل</td><td>قطع أسرع، حرارة أكثر، تآكل أسرع</td><td>قطع أبطأ، حرارة أقل، عمر أطول</td></tr>
    <tr><td>سرعة الماكينة</td><td>إزالة أسرع، خطر حرق القطعة</td><td>تحكم أفضل، إزالة أبطأ</td></tr>
    <tr><td>معدل التغذية</td><td>إنتاجية أعلى، تشطيب أخشن</td><td>تشطيب أنعم، وقت أطول</td></tr>
    <tr><td>صلادة الحبيبات</td><td>عمر أطول للمواد الصلبة</td><td>تكلفة أقل، تكسر أسرع</td></tr>
  </tbody>
</table>`;
}

function buildMythBusting(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return buildCommonMistakes(topic, model, productCat);
}

function buildSpecChecklist(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return buildSpecsSection(topic, model, productCat);
}

function buildProcessOverview(topic: TopicSpec, model: typeof models[0] | null, industry: typeof industries[0] | undefined): string {
  const industryName = industry?.name || '';
  return `
<h3>نظرة عامة على العملية - ${industryName}</h3>
<p>دورة الصنفرة القياسية تمر بـ 4 مراحل: التجهيز → الإزالة الخشنة → التسوية المتوسطة → التشطيب النهائي. كل مرحلة تتطلب غرِت محدد، ضبط معلمات الماكينة، وفحص جودة قبل الانتقال للمرحلة التالية.</p>`;
}

function buildGritProgressionTable(topic: TopicSpec, model: typeof models[0] | null, industry: typeof industries[0] | undefined): string {
  return buildGritSequenceTable(topic, model, undefined, industry);
}

function buildQualityControl(topic: TopicSpec, model: typeof models[0] | null, industry: typeof industries[0] | undefined): string {
  return `
<h3>نقاط التحكم الحرجة ومعايير الفحص</h3>
<table class="spec-table">
  <thead><tr><th>نقطة التحكم</th><th>المعيار</th><th>طريقة الفحص</th><th>التكرار</th></tr></thead>
  <tbody>
    <tr><td>خشونة السطح (Ra)</td><td>حسب مواصفة الرسم</td><td>مقياس خشونة محمول</td><td>كل 50 قطعة</td></tr>
    <tr><td>مظهر السطح</td><td>بدون خدوش عميقة/علامات</td><td>فحص بصري بإضاءة قياسية</td><td>كل قطعة</td></tr>
    <tr><td>أبعاد القطعة</td><td>ضمن التسامح المسموح</td><td>مقياس شريطي/ميكروميتر</td><td>أول/آخر/كل دفعة</td></tr>
    <tr><td>حالة الحزام/القرص</td><td>تآكل متساوٍ، بدون تلف</td><td>فحص بصري</td><td>كل تغيير غرِت</td></tr>
  </tbody>
</table>`;
}

function buildDefectTroubleshooting(topic: TopicSpec, model: typeof models[0] | null, industry: typeof industries[0] | undefined): string {
  return `
<h3>عيوب التصنيع الشائعة وطرق المعالجة</h3>
<table class="spec-table">
  <thead><tr><th>العيب</th><th>السبب المحتمل</th><th>الإجراء التصحيحي</th></tr></thead>
  <tbody>
    <tr><td>خدوش عميقة/غير متساوية</td><td>غرِت خشن جداً، ضغط زائد، حزام تالف</td><td>انزل لغرِت أنعم، خفف الضغط، استبدل الحزام</td></tr>
    <tr><td>لمعان/احتراق السطح</td><td>سرعة عالية، ضغط عالي، تبريد ضعيف</td><td>قلل RPM، خفف الضغط،حسن الشفط/التبريد</td></tr>
    <tr><td>تشطيب غير موحد</td><td>حزام مائل، بكرات مهترئة، تغذية غير منتظمة</td><td>عدّل المحاذاة، استبدل البكرات، ثبت معدل التغذية</td></tr>
    <tr><td>انسداد (Loading)</td><td>مادة لزجة، غرِت ناعم مبكراً، شفط ضعيف</td><td>نظف/استبدل، تسلسل غرِت صحيح، نظف الفلتر</td></tr>
  </tbody>
</table>`;
}

function buildMaterialAdjustments(topic: TopicSpec, model: typeof models[0] | null, industry: typeof industries[0] | undefined): string {
  return `
<h3>نقاط الضبط لمواد مختلفة</h3>
<table class="spec-table">
  <thead><tr><th>المادة</th><th>الحبيبات المفضلة</th><th>الغرِت الافتتاحي</th><th>الضغط/السرعة</th></tr></thead>
  <tbody>
    <tr><td>خشب ناعم</td><td>أكسيد ألومنيوم</td><td>80–100</td><td>ضغط خفيف، سرعة متوسطة</td></tr>
    <tr><td>خشب صلب</td><td>أكسيد ألومنيوم/زركونيا</td><td>60–80</td><td>ضغط متوسط، سرعة متوسطة</td></tr>
    <tr><td>فولاذ كربوني</td><td>زركونيا/سيراميك</td><td>40–60</td><td>ضغط متوسط-عالي، سرعة عالية</td></tr>
    <tr><td>ستانلس ستيل</td><td>زركونيا/سيراميك</td><td>60–80</td><td>ضغط خفيف-متوسط، تبريد جيد</td></tr>
    <tr><td>ألومنيوم</td><td>كربيد سيليكون (SiC)</td><td>80–120</td><td>ضغط خفيف، سرعة عالية</td></tr>
    <tr><td>طلاء/ورنيش</td><td>أكسيد ألومنيوم/ستيرات</td><td>80–120</td><td>ضغط خفيف، شفط قوي</td></tr>
  </tbody>
</table>`;
}

function buildSafetyTips(topic: TopicSpec, industry: typeof industries[0] | undefined): string {
  return buildSafetyCompliance(topic, industry, undefined);
}

function buildTroubleshootingTable(topic: TopicSpec, model: typeof models[0] | null): string {
  const productName = model?.name || t(topic.productFamily);
  return `
<h3>جدول سريع: العطل - السبب - الحل لـ ${productName}</h3>
<table class="spec-table">
  <thead><tr><th>العطل</th><th>السبب الرئيسي</th><th>الحل الفوري</th><th>الوقاية</th></tr></thead>
  <tbody>
    <tr><td>تآكل سريع</td><td>غرِت ناعم جداً / ضغط عالي</td><td>اختر غرِت أخرش / خفف الضغط</td><td>تسلسل غرِت صحيح</td></tr>
    <tr><td>انسداد (Loading)</td><td>مادة لزجة / شفط ضعيف</td><td>قرص شبكي / نظف الفلتر</td><td>شفط فعال، مبرد</td></tr>
    <tr><td>انحراف الحزام</td><td>بكرات غير محاذية / وصل خاطئ</td><td>عدّل المحاذاة / راجع الوصل</td><td>صيانة بكرات أسبوعية</td></tr>
    <tr><td>اهتزاز/ضجيج</td><td>حزام غير متوازن / بكرات تالفة</td><td>استبدل الحزام / البكرات</td><td>فحص بصري يومي</td></tr>
    <tr><td>حرقة القطعة</td><td>RPM عالي / ضغط عالي / تبريد معدوم</td><td>قلل السرعة/الضغط / أضف مبرد</td><td>ضبط معلمات حسب المادة</td></tr>
  </tbody>
</table>`;
}

function buildFailureClassification(topic: TopicSpec, model: typeof models[0] | null): string {
  return `
<h3>تصنيف مظاهر العطل ومنطق التشخيص</h3>
<ol class="numbered-list">
  <li><strong>أعطال التآكل:</strong> تآكل مبكر، تآكل غير متساوٍ، فقدان الحبيبات → تحقق من الغرِت، الضغط، نوع الحبيبات</li>
  <li><strong>أعطال الانسداد:</strong> Loading، سطح لامع، فقدان القطع → تحقق من الشفط، المادة، تسلسل الغرِت</li>
  <li><strong>أعطال الميكانيكية:</strong> انحراف، اهتزاز، تمزق، كسر → تحقق من البكرات، المحاذاة، الوصل، RPM</li>
  <li><strong>أعطال السطح:</strong> خدوش، حرق، موجة، تشطيب غير موحد → تحقق من تسلسل الغرِت، المعلمات، حالة الحزام</li>
  <li><strong>أعطال السلامة:</strong> غبار زائد، شرر، شظايا → تحقق من PPE، الشفط، واقيات الماكينة، حالة المنتج</li>
</ol>`;
}

function buildRootCauseAnalysis(topic: TopicSpec, model: typeof models[0] | null): string {
  return `
<h3>تحليل الأسباب الجذرية (أمثلة)</h3>
<table class="spec-table">
  <thead><tr><th>العطل</th><th>السبب المباشر</th><th>السبب الجذري (5 Why's)</th><th>الإجراء التصحيحي</th></tr></thead>
  <tbody>
    <tr><td>تآكل سريع</td><td>غرِت 120 لمرحلة إزالة</td><td>لم يحدد مرحلة العمل → لا يعرف تسلسل الغرِت → لا دليل متاح</td><td>وفر دليل تسلسل الغرِt، درّب المشغلين</td></tr>
    <tr><td>انحراف متكرر</td><td>بكرة توجيه مهترئة</td><td>لا صيانة دورية → لا قائمة تحقق → لا مسؤولية محددة</td><td>أضف للبكرات في الصيانة الأسبوعية، عين مسؤول</td></tr>
    <tr><td>انسداد مستمر</td><td>قرص غير مثقب لمادة لزجة</td><td>لم يطابق نوع القرص للمادة → لا مواصفة واضحة → افتراض خاطئ</td><td>أضف "نوع القرص" لنموذج RFQ، درّب المشتريات</td></tr>
  </tbody>
</table>`;
}

function buildRootCauseChecklist(topic: TopicSpec, model: typeof models[0] | null): string {
  return `
<h3>قائمة تحقق الأسباب الجذرية</h3>
<ul class="plain-links">
  <li>☐ هل الغرِت مطابق لمرحلة العمل؟</li>
  <li>☐ هل نوع الحبيبات مناسب لمادة القطعة؟</li>
  <li>☐ هل الضغط ضمن النطاق الموصى به (0.5–2 N/cm²)؟</li>
  <li>☐ هل RPM الماكينة ضمن حد المنتج؟</li>
  <li>☐ هل نظام الشفط يعمل بكفاءة؟ (تحقق فلاتر، تدفق هواء)</li>
  <li>☐ هل البكرات/القاعدة نظيفة وفي حالة جيدة؟</li>
  <li>☐ هل اتجاه الدوران/الوصل صحيح (للأحزمة)؟</li>
  <li>☐ هل المشغل مدرب على تسلسل الغرِت؟</li>
  <li>☐ هل البيئة (رطوبة/حرارة) تؤثر على القاعدة/الرابطة؟</li>
  <li>☐ هل الدفعة الحالية مطابقة للمواصفة المرجعية؟</li>
</ul>`;
}

function buildDistributionModel(gccCountry: typeof gccCountries[0] | undefined): string {
  if (!gccCountry || gccCountry.code === 'general-gcc') return '';
  return `
<h3>نموذج التوزيع في ${gccCountry.name}</h3>
<ul class="plain-links">
  <li><strong>المستوردون المباشرون:</strong> شركات كبيرة تشتري حاويات كاملة، توزع على الموزعين المحليين</li>
  <li><strong>الموزعون الصناعيون:</strong> يحملون مخزوناً، يخدمون الورش والمصانع، هامش 15–25%</li>
  <li><strong>الوكلاء الحصريون:</strong> نادر، يتطلب التزام كميات كبيرة، تغطية وطنية</li>
  <li><strong>التجارة الإلكترونية B2B:</strong> منصات مثل سوق، أمازون بيزنس، للطلبات الصغيرة</li>
</ul>
<p>موتاى تتعامل مباشرة مع المستوردين والموزعين الكبار. لا مانع من العمل عبر وكيل محلي إذا رغب المشتري.</p>`;
}

function buildPaymentTerms(gccCountry: typeof gccCountries[0] | undefined): string {
  if (!gccCountry || gccCountry.code === 'general-gcc') return '';
  return `
<h3>شروط الدفع والعملات في ${gccCountry.name}</h3>
<table class="spec-table">
  <thead><tr><th>الطريقة</th><th>الشائع</th><th>ملاحظات</th></tr></thead>
  <tbody>
    <tr><td>LC مستندي (اعتماد)</td><td>الأكثر أماناً</td><td>مطلوب للطلبات > $50k، بنوك الخليج تقبل</td></tr>
    <tr><td>TT مسبق 30%</td><td>شائع</td><td>باقي 70% قبل الشحن أو مقابل مستندات</td></tr>
    <tr><td>TT 100% مسبق</td><td>للطلبات الصغيرة</td><td>أقل من $10k، يبسط الإجراءات</td></tr>
    <tr><td>عملة الفاتورة</td><td>USD</td><td>ثابتة، تجنب تقلبات العملات المحلية</td></tr>
  </tbody>
</table>
<p>نوصي بـ LC للطلبات الأولى والكبرى، TT للطلبات المتكررة مع شركاء موثوقين.</p>`;
}

function buildMarketContext(topic: TopicSpec, industry: typeof industries[0] | undefined, gccCountry: typeof gccCountries[0] | undefined): string {
  const industryName = industry?.name || '';
  const countryName = gccCountry?.name || 'الخليج';
  return `
<h3>خلفية قطاع ${industryName} في ${countryName}</h3>
<p>القطاع مدفوع بـ: المشاريع الحكومية الضخمة (رؤية 2030 السعودية، مشاريع إكسبو الإمارات، كأس العالم قطر)، نمو التصنيع المحلي، واستبدال الواردات. الطلب على مواد التشطيب الصناعية ينمو 6–8% سنوياً.</p>`;
}

/**
 * 进口合规（地域寻源篇专用）：按目的国给出真实的监管机构与合规要点，
 * 替代原先误路由的 PPE 安全清单（该清单与进口法规主题无关，属灌水）。
 * 数据全部来自 prompts_ar_gulf.md 第 7 节限定的权威机构（SASO/ESMA/GSO/GSO 各国分支）。
 */
function buildImportCompliance(gccCountry: typeof gccCountries[0] | undefined): string {
  if (!gccCountry || gccCountry.code === 'general-gcc') return '';
  const info: Record<string, { regulator: string; cert: string; points: string[] }> = {
    'saudi-arabia': {
      regulator: 'SASO (الهيئة السعودية للمواصفات والمقاييس والجودة)',
      cert: 'شهادة مطابقة SASO (SALEEM/SABER)',
      points: [
        'تسجيل المنتج في منصة SABER قبل الشحن، مع إرفاق تقرير اختبار من مختبر معتمد',
        'ملصق المنتج بالعربية إلزامي، يتضمن العلامات التجارية وبيانات المستورد السعودي',
        'شهادة منشأ (COO) من الغرفة التجارية في مقاطعة هوبي، الصين، موثقة',
      ],
    },
    'uae': {
      regulator: 'ESMA (هيئة الإمارات للمواصفات والمقاييس)',
      cert: 'شهادة مطابقة ESMA (ECAS)',
      points: [
        'تسجيل المنتج في نظام ECAS قبل الاستيراد، مع إرفاق تقرير فحص من مختبر معتمد من MoIAT',
        'الملصق يجب أن يكون ثنائي اللغة (عربي/إنجليزي) مع رمز ECAS',
        'شهادة منشأ (COO) موثقة من الغرفة التجارية في هوبي',
      ],
    },
    'qatar': {
      regulator: 'Qatar Standards / وزارة التجارة والصناعة (MoCI)',
      cert: 'شهادة مطابقة مواصفات GSO',
      points: [
        'المنتجات الصناعية تخضع لمواصفات GSO الموحدة؛ الجمارك يتطلب شهادة مطابقة',
        'شهادة المنشأ (COO) معتمدة من الغرفة التجارية الصينية، وشهادة تحليل (COA) من المصنع',
        'الملصق بالعربية أو ثنائي اللغة، مع رقم الدفعة (Batch No.) ورمز الاستيراد',
      ],
    },
    'kuwait': {
      regulator: 'Kuwait Conformity Assessment (KOWSAR) / الهيئة العامة للصناعة',
      cert: 'شهادة مطابقة KOWSAR',
      points: [
        'المنتجات المقننة تخضع لبرنامج تقييم المطابقة KUCAS قبل الشحن',
        'تقرير اختبار من مختبر معتمد، وشهادة منشأ موثقة',
        'الملصق بالعربية مع بيانات المستورد الكويتي',
      ],
    },
    'bahrain': {
      regulator: 'Bahrain Standards & Metrology (BSMD)',
      cert: 'شهادة مطابقة وفق مواصفات GSO',
      points: [
        'المنتجات تخضع لمواصفات GSO/BSMD؛ الجمارك تطلب شهادة مطابقة عند التخليص',
        'شهادة المنشأ + تقرير تحليل من مختبر معتمد',
        'الملصق بالعربية، مع بيانات المستورد المحلي',
      ],
    },
    'oman': {
      regulator: 'DGSSM (المديرية العامة للمواصفات والمقاييس) - عُمان',
      cert: 'شهادة مطابقة Oman',
      points: [
        'المنتجات المقننة تخضع لطلب شهادة مطابقة عُمان',
        'شهادة المنشأ + COA، والملصق بالعربية',
        'تسجيل في نظام MoCI Oman قبل الاستيراد',
      ],
    },
  };
  const inf = info[gccCountry.code];
  if (!inf) return '';
  return `
<h3>الجهة المنظمة ومتطلبات الامتثال في ${gccCountry.name}</h3>
<p>الجهة المختصة: <strong>${inf.regulator}</strong>. الشهادة المطلوبة: <strong>${inf.cert}</strong>.</p>
<ul class="plain-links">
  ${inf.points.map(p => `<li>${p}</li>`).join('\n  ')}
</ul>
<p>نحن في MoTai نوفر شهادة مطابقة المصنع (COC) وشهادة تحليل (COA) لكل دفعة. <strong>الامتثال النهائي في بلد الوجهة مسؤولية المستورد</strong>؛ ونحن نتعاون بتقديم الوثائق المطلوبة.</p>`;
}

/**
 * 行业/市场篇的标准与合规解读：泛海湾版给出 GSO 统一框架，
 * 国家主版（qatar 等）给出该国监管机构的具体要求（复用地域寻源的合规数据）。
 */
function buildStandardsAnalysis(topic: TopicSpec, industry: typeof industries[0] | undefined, gccCountry: typeof gccCountries[0] | undefined): string {
  if (gccCountry && gccCountry.code !== 'general-gcc') {
    return buildImportCompliance(gccCountry);
  }
  return `
<h3>الإطار المعياري العام في الخليج (GSO)</h3>
<ul class="plain-links">
  <li><strong>FEPA P:</strong> نظام درجات الغرِت الأوروبي السائد، يُستخدم كمرجع أساسي في المواصفات الدولية</li>
  <li><strong>ISO 6344:</strong> تحليل حجم حبيبات الغرِت، يضمن اتساق الدقة عبر الموردين</li>
  <li><strong>GSO:</strong> المواصفات الخليجية الموحدة، تُطبق في جميع دول مجلس التعاون</li>
  <li><strong>OSHA 1910.215 / NIOSH:</strong> مرجعية دولية للسلامة المهنية في عمليات الصنفرة</li>
</ul>
<p>الخلاصة: اكتب أي مواصفة بمعايير FEPA P + GSO، وأضف متطلبات البلد الوجهة عند التعاقد.</p>`;
}

function buildMarketData(topic: TopicSpec, industry: typeof industries[0] | undefined, gccCountry: typeof gccCountries[0] | undefined): string {
  return `
<h3>بيانات السوق (مرجع عام)</h3>
<ul class="plain-links">
  <li>حجم سوق المواد الكاشطة في الخليج: ~$1.2B سنوياً (تقديرات 2023–2024)</li>
  <li>معدل النمو السنوي المركب (CAGR): 6–8% حتى 2028</li>
  <li>الحصة الأكبر: أحزمة وأقراص الصنفرة (~55%)، ثم فلب ديسك (~25%)</li>
  <li>المستوردون الرئيسيون: الصين، ألمانيا، إيطاليا، كوريا، الولايات المتحدة</li>
</ul>
<p><em>المصادر: تقارير فروست آند سوليفان، يورومونيتور، غرف التجارة الخليجية. الأرقام تقديرية وتختلف حسب المصدر.</em></p>`;
}

function buildTechTrends(topic: TopicSpec, industry: typeof industries[0] | undefined, gccCountry: typeof gccCountries[0] | undefined): string {
  return buildMarketTrends(topic, industry, gccCountry);
}

function buildProcurementImplications(topic: TopicSpec, industry: typeof industries[0] | undefined, gccCountry: typeof gccCountries[0] | undefined): string {
  return `
<h3>الانعكاس على قرارات المشتريات</h3>
<ul class="plain-links">
  <li>المعايير الأشد → اطلب شهادات مطابقة حديثة (COC/COA) مع كل دفعة</li>
  <li>الحبيبات عالية الأداء → احسب تكلفة المتر المربع لا سعر الوحدة</li>
  <li>الأتمتة → حدد تماسك الأبعاد في المواصفة (تحمل ±0.5 مم)</li>
  <li>الاستدامة → استفسر عن قواعد قابلة لإعادة التدوير، حبيبات منخفضة الانبعاثات</li>
</ul>`;
}

function buildOEMOverview(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return buildOEMOptions(topic, model, productCat);
}

function buildPackagingSpecs(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return `
<h3>مواصفات تصميم التغليف بالعلامة التجارية</h3>
<ul class="plain-links">
  <li><strong>الملفات:</strong> شعار فيكتور (AI/SVG/EPS)، رسومات تغليف بأبعاد دقيقة، ألوان بانتون</li>
  <li><strong>اللغات:</strong> عربي، إنجليزي، وأي لغات أسواق مستهدفة (نصوص معتمدة من العميل)</li>
  <li><strong>الطباعة:</strong> فليكسو/أوفست، عدد الألوان، مساحات الطباعة، حدود القطع</li>
  <li><strong>الباركود:</strong> GS1-128 أو EAN-13، ملف CSV ببيانات المنتج</li>
  <li><strong>المواد:</strong> كرتون مموج (أحمال)، أكياس PE (وحدات)، ملصقات مقاومة زيت/رطوبة</li>
</ul>`;
}

function buildMOQPricing(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return `
<h3>الحد الأدنى للكمية وشرائح الأسعار (إرشادي)</h3>
<table class="spec-table">
  <thead><tr><th>فئة المنتج</th><th>MOQ قياسي</th><th>MOQ مع OEM</th><th>شرائح الكمية النموذجية</th></tr></thead>
  <tbody>
    <tr><td>أحزمة صنفرة</td><td>500–1000 وحدة</td><td>2000–5000 وحدة</td><td>1000 / 5000 / 10000 / 50000</td></tr>
    <tr><td>أقراص صنفرة</td><td>2000–5000 وحدة</td><td>5000–10000 وحدة</td><td>5000 / 10000 / 50000 / 100000</td></tr>
    <tr><td>فلب ديسك</td><td>1000–2000 وحدة</td><td>3000–5000 وحدة</td><td>2000 / 5000 / 10000 / 20000</td></tr>
    <tr><td>إسفنج صنفرة</td><td>3000–5000 وحدة</td><td>5000–10000 وحدة</td><td>5000 / 10000 / 20000 / 50000</td></tr>
  </tbody>
</table>
<p><em>الأرقام إرشادية. MOQ النهائي يعتمد على المقاس، الغرِت، التخصيص، والتغليف. اطلب عرضاً دقيقاً.</em></p>`;
}

function buildSampleApproval(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return `
<h3>عملية تأكيد العينة</h3>
<ol class="numbered-list">
  <li>العميل يرسل: ملفات الشعار/التغليف + مواصفة المنتج الكاملة</li>
  <li>ننتج عينة أولية (5–10 وحدات) خلال 10–15 يوم عمل</li>
  <li>العميل يفحص: أبعاد، طباعة، ألوان، جودة صنفرة، تغليف</li>
  <li>تعديلات (إن وجدت) → عينة ثانية خلال 5–7 أيام</li>
  <li>توقيع "موافقة عينة" رسمي → بدء الإنتاج الكمي</li>
  <li>مهلة الإنتاج: تُحدد في عرض السعر حسب الكمية والتعقيد</li>
</ol>
<p>معايير القبول: مطابقة المواصفة التقنية ± التسامح، جودة طباعة مقبولة، لا عيوب مرئية.</p>`;
}

function buildQAStandards(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return `
<h3>معايير فحص الجودة والاستلام</h3>
<table class="spec-table">
  <thead><tr><th>معيار الفحص</th><th>طريقة الاختبار</th><th>معيار القبول</th></tr></thead>
  <tbody>
    <tr><td>الأبعاد</td><td>مقياس شريطي/ميكروميتر، عينة عشوائية 5%</td><td>± التسامح المحدد في المواصفة</td></tr>
    <tr><td>درجة الغرِت</td><td>محلل حبيبات (FEPA P) أو مرجع معتمد</td><td>ضمن نطاق FEPA للدرجة المعلنة</td></tr>
    <tr><td>المظهر السطحي</td><td>فحص بصري بإضاءة 1000 لوكس</td><td>لا خدوش، لا فقاعات، لا تلوث</td></tr>
    <tr><td>قوة الرابطة</td><td>اختبار قص/تقشير قياسي</td><td>≥ القيمة الدنيا للمواصفة</td></tr>
    <tr><td>الطباعة/التغليف</td><td>مطابقة عينة الموافقة الموقعة</td><td>متطابقة 100%</td></tr>
  </tbody>
</table>`;
}

function buildLogisticsCustoms(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return `
<h3>تنسيق اللوجستيات والجمارك</h3>
<ul class="plain-links">
  <li><strong>الشحن البحري:</strong> FCL للحاويات الكاملة، LCL للكميات الأقل. الميناء: نينغبو/شانغهاي → ميناء الخليج</li>
  <li><strong>المستندات:</strong> بوليصة شحن، فاتورة تجارية، قائمة تعبئة، شهادة منشأ، COC، COA، شهادة مطابقة محلية</li>
  <li><strong>التخليص:</strong> وكيل شحن المشتري يتولى. نقدم جميع المستندات قبل وصول السفينة بـ 7 أيام</li>
  <li><strong>التأمين:</strong> CIF: المشتري يؤمن. CFR/FOB: نؤمن حتى الميناء. نوصي بتأمين شامل</li>
  <li><strong>التسليم النهائي:</strong> إلى مستودع المشتري أو ميناء الوصول وفق INCOTERMS المتفق عليها</li>
</ul>`;
}

function buildPartnershipFramework(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return `
<h3>إطار مقترح للتعاون طويل الأمد</h3>
<ul class="plain-links">
  <li><strong>اتفاقية إطارية:</strong> 1–3 سنوات، كميات مقدرة، أسعار مراجعة نصف سنوية</li>
  <li><strong>تخطيط الطلب:</strong> توقعات ربع سنوية قبل 8 أسابيع، أوامر مؤكدة قبل 4 أسابيع</li>
  <li><strong>مخزون أمان:</strong> نحد 2–4 أسابيع استهلاك كمخزون جاهز للشحن الفوري</li>
  <li><strong>مراجعة الأداء:</strong> ربع سنوية: OTIF، جودة، استجابة، ابتكار</li>
  <li><strong>تطوير مشترك:</strong> منتجات جديدة، تحسين مواصفات، اختبارات مواد</li>
</ul>`;
}

function buildPainPoints(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined, industry: typeof industries[0] | undefined): string {
  const industryName = industry?.name || '';
  // 行业痛点优先用 site.ts 已验证的 challenges；无数据行业回落通用痛点
  const painItems = industry?.challenges?.length
    ? industry.challenges.map(ch => `<li><strong>${ch}:</strong> ${model?.name || productCat?.name || t(topic.productFamily)} بتسلسل غرِت موحد وعينات مرجعية → اتساق النتائج وتقليل إعادة العمل</li>`)
    : [
        '<li><strong>تشتت جودة التشطيب:</strong> تسلسل غرِت موحد + عينات مرجعية → اتساق بين الدفعات</li>',
        '<li><tt>توقف الماكينة المتكرر:</strong> أحزمة/أقراص بعمر أطول + صيانة وقائية → توفر أعلى</li>',
        '<li><strong>اختيار الغرِت الخاطئ:</strong> دليل تسلسل + استشارة فنية → قرار صحيح من المرة الأولى</li>',
        '<li><strong>تكلفة الوحدة المرتفعة:</strong> حساب TCO (سعر + عمر + توقف) → قرار اقتصادي حقيقي</li>',
      ];
  return `
<h3>نقاط الألم في ${industryName} وحلول ${model?.name || productCat?.name || t(topic.productFamily)}</h3>
<ul class="plain-links">
  ${painItems.join('\n  ')}
</ul>`;
}

function buildProductCombo(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined, industry: typeof industries[0] | undefined): string {
  return buildApplicationSection(topic, model, productCat, industry, undefined);
}

function buildProcessParams(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return `
<h3>إعدادات المعامل التشغيلية المقترحة</h3>
<table class="spec-table">
  <thead><tr><th>المعلمة</th><th>النطاق المقترح</th><th>تنبيه</th></tr></thead>
  <tbody>
    <tr><td>السرعة (حزام)</td><td>15–30 م/ث</td><td>لا تتجاوز حد المنتج</td></tr>
    <tr><td>السرعة (قرص)</td><td>وفق قطر القرص و RPM الماكينة</td><td>تحقق من الملصق</td></tr>
    <tr><td>الضغط</td><td>0.5–2 N/cm²</td><td>ضغط زائد = تآكل + حرارة</td></tr>
    <tr><td>معدل التغذية</td><td>3–8 م/دقيقة</td><td>حسب المادة والنتيجة</td></tr>
  </tbody>
</table>`;
}

function buildSampleEvaluation(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return `
<h3>بطاقة تقييم العينة</h3>
<table class="spec-table">
  <thead><tr><th>المعيار</th><th>الوزن</th><th>طريقة التقييم</th><th>الدرجة المستهدفة</th></tr></thead>
  <tbody>
    <tr><td>مطابقة المواصفة التقنية</td><td>30%</td><td>قياس أبعاد، غرِت، مادة</td><td>100% مطابقة</td></tr>
    <tr><td>أداء القطع/التشطيب</td><td>25%</td><td>اختبار على قطعة تمثيلية</td><td>≥ المعيار المرجعي</td></tr>
    <tr><td>العمر الافتراضي</td><td>20%</td><td>تشغيل حتى التآكل الكامل</td><td>≥ 90% عمر المرجع</td></tr>
    <tr><td>اتساق الدفعة</td><td>15%</td><td>فحص 5 قطع من مواقع مختلفة</td><td>CV ≤ 5%</td></tr>
    <tr><td>التغليف/الملصقات</td><td>10%</td><td>فحص بصري، مسح باركود</td><td>صفر أخطاء</td></tr>
  </tbody>
</table>`;
}

function buildSupplierMatrix(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return `
<h3>مصفوفة تقييم الموردين</h3>
<table class="spec-table">
  <thead><tr><th>المعيار</th><th>الوزن</th><th>مصدر التقييم</th></tr></thead>
  <tbody>
    <tr><td>السعر الشامل (CIF/CFR)</td><td>25%</td><td>العروض الرسمية</td></tr>
    <tr><td>الجودة (نسبة العيوب، اتساق)</td><td>25%</td><td>عينات، مراجع، شهادات</td></tr>
    <tr><td>مهلة التوريد والموثوقية (OTIF)</td><td>20%</td><td>سجل تاريخي، مراجع</td></tr>
    <tr><td>مرونة OEM/تخصيص</td><td>10%</td><td>قدرات مصنعية، أمثلة سابقة</td></tr>
    <tr><td>الشهادات والامتثال</td><td>10%</td><td>ISO 9001، COC، COA، محلية</td></tr>
    <tr><td>الخدمة الفنية والدعم</td><td>10%</td><td>استجابة، خبرة، لغة</td></tr>
  </tbody>
</table>`;
}

function buildQuoteComparison(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return `
<h3>نقاط المقارنة الجوهرية في العروض</h3>
<ul class="plain-links">
  <li><strong>السعر الأساسي:</strong> لكل وحدة، بالعملة المتفق عليها، يشمل/لا يشمل التغليف</li>
  <li><strong>الشحن والتأمين:</strong> CIF (للميناء)، CFR، FOB، أو EXW — قارن على أساس موحد</li>
  <li><strong>شروط الدفع:</strong> LC/TT، نسب المقدمة، آجال، عملة الفاتورة</li>
  <li><strong>مهلة التوريد:</strong> من اعتماد المواصفة/العينة إلى التسليم في الميناء/المستودع</li>
  <li><strong>الحد الأدنى للطلب:</strong> MOQ لكل منتج/غرِت، مرونة خلط الأصناف</li>
  <li><strong>الضمان والجودة:</strong> سياسة الإرجاع، استبدال الدفعات المعيبة، شهادات مع كل شحنة</li>
  <li><strong>دعم OEM:</strong> تكلفة القوالب، لوحات الطباعة، حد أدنى للتخصيص</li>
</ul>`;
}

function buildContractTerms(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return `
<h3>بنود العقود وشروط التسليم الأساسية</h3>
<ul class="plain-links">
  <li><strong>INCOTERMS:</strong> حدد بوضوح (CIF، CFR، FOB، EXW) — يحدد مسؤولية الشحن والتأمين</li>
  <li><strong>جدول التسليم:</strong> تواريخ/أشهر، كميات لكل دفعة، مرونة ±10%</li>
  <li><strong>شروط الدفع:</strong> LC غير قابل للإلغاء، TT 30/70، عملة، بنك مستفيد</li>
  <li><strong>فحص الجودة:</strong> في المصنع (قبل الشحن) و/أو عند الوصول، معايير القبول، إجراءات الرفض</li>
  <li><strong>جزاءات التأخر:</strong> 0.5–1% من قيمة الدفعة لكل أسبوع تأخير، سقف 5–10%</li>
  <li><strong>قوة قاهرة:</strong> تعريف، إشعار، تمديد آجال، حق إنهاء</li>
  <li><strong>السرية/الملكية الفكرية:</strong> رسومات، شعارات، مواصفات — ملكية العميل، عدم إفشاء</li>
  <li><strong>القانون الحاكم والاختصاص:</strong> قانون الصين / دولة المشتري، تحكيم (CIETAC / محلي)</li>
</ul>`;
}

function buildCommonMistakes(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  const productName = model?.name || productCat?.name || t(topic.productFamily);
  return `
<h3>أخطاء شائعة وكيفية تجنبها</h3>
<table class="spec-table">
  <thead><tr><th>الخطأ</th><th>النتيجة</th><th>التصحيح</th></tr></thead>
  <tbody>
    <tr><td>اختيار الغرِت بالحدس لا بمرحلة العمل</td><td>إما إزالة بطيئة أو خدوش عميقة</td><td>اتبع التسلسل: خشن → متوسط → ناعم</td></tr>
    <tr><td>تجاهل توافق الماكينة (المقاس/التثبيت)</td><td>منتج لا يركب أو يتلف الماكينة</td><td>أرسل طراز الماكينة وطريقة الوصل قبل الطلب</td></tr>
    <tr><td>ضغط زائد "للإنجاز أسرع"</td><td>تآكل متسارع، حرارة، تشوه القطعة</td><td>دع الحبيبات تعمل، ضغط معتدل ثابت</td></tr>
    <tr><td>إهمال سحب الغبار</td><td>انسداد (Loading)، عمر قصير، بيئة غير صحية</td><td>نظف الفلاتر يومياً، تحقق من تدفق الهواء</td></tr>
    <tr><td>خلط معايير الغرِت (FEPA/ANSI/JIS)</td><td>درجات غير متطابقة بين الدفعات</td><td>التزم بمعيار واحد (FEPA P) في كل المواصفات</td></tr>
    <tr><td>طلب كمية كبيرة دون عينة</td><td>مخاطر عدم مطابقة للجودة/الأبعاد</td><td>اطلب عينة، افحص، وقع موافقة، ثم اطلب الكمي</td></tr>
    <tr><td>عدم تحديد OEM/التغليف مبكراً</td><td>تأخير الإنتاج، تكاليف تعديل عالية</td><td>أرفق ملفات العلامة مع RFQ الأولي</td></tr>
  </tbody>
</table>`;
}

function buildProductPositioning(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  const productName = model?.name || productCat?.name || t(topic.productFamily);
  return `
<h3>التموضع الأساسي لـ ${productName}</h3>
<p>${model?.summary || productCat?.description || 'منتج صناعي للتشطيب السطحي، مصمم لإزالة المادة، التسوية، واللمسات النهائية في تطبيقات الخشب والمعادن.'}</p>
<p><strong>السيناريوهات المثالية:</strong> ${model?.useCases?.join('، ') || getMainApplication(topic.productFamily)}</p>
<p><strong>القيود:</strong> ${model?.notes?.join('؛ ') || 'يحتاج مواصفات ماكينة دقيقة، عينة للتطبيقات الحرجة.'}</p>`;
}

function buildFullSpecsTable(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return buildSpecsSection(topic, model, productCat);
}

function buildDesignPrinciples(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return `
<h3>مبادئ التصميم والخصائص الأداءية</h3>
<ul class="plain-links">
  <li><strong>الحبيبات:</strong> ${getGrainTypes(topic.productFamily).join(' / ')} — تُختار حسب صلادة المادة ومعدل الإزالة المطلوب</li>
  <li><strong>القاعدة:</strong> ${model?.backing || 'قماش/ورق/بوليمر'} — توازن بين المرونة (للانحناءات) والثبات (للأسطح المستوية)</li>
  <li><strong>الرابطة:</strong> إسبنجية (Resin) عالية الحرارة — تحافظ على الحبيبات تحت أحمال قطع عالية</li>
  <li><strong>الهيكل:</strong> ${topic.productFamily === 'abrasive-belts' ? 'حزام موصول (مستقيم/مائل/متداخل)' : 'قرص موحد/مثقب/شبكي'} — مصمم لتوزيع ضغط متساوٍ</li>
</ul>`;
}

function buildCompatibilityGuide(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return buildCompatibilityChecklist(topic, model, productCat);
}

function buildCustomizationOptions(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return buildOEMOptions(topic, model, productCat);
}

function buildOrderingInfo(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return `
<h3>معلومات الطلب: MOQ، مهلة التوريد، التغليف</h3>
<table class="spec-table">
  <thead><tr><th>البند</th><th>التفاصيل</th></tr></thead>
  <tbody>
    <tr><td>MOQ</td><td>يُحدد حسب المقاس، الغرِت، التخصيص (راجع قسم الجملة/OEM)</td></tr>
    <tr><td>مهلة الإنتاج</td><td>تُحدد في عرض السعر بعد اعتماد المواصفة والعينة الموقعة</td></tr>
    <tr><td>الشحن البحري</td><td>25–35 يوماً إلى موانئ الخليج</td></tr>
    <tr><td>التغليف القياسي</td><td>كرتون مموج، وحدات/لفة حسب المنتج، ملصق تعريف</td></tr>
    <tr><td>تغليف OEM</td><td>حسب موافقة العميل، تكلفة إضافية، مهلة +5–7 أيام</td></tr>
    <tr><td>شهادات مع الشحنة</td><td>COC قياسية، COA عند الطلب، SASO/ESMA/GSO حسب الوجهة</td></tr>
  </tbody>
</table>`;
}

function buildTop3FAQ(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  const productName = model?.name || productCat?.name || t(topic.productFamily);
  return `
<h3>أهم 3 أسئلة - إجابات مختصرة</h3>
<dl class="faq-list">
  <dt>كيف أختار الغرِت المناسب لـ ${productName}؟</dt>
  <dd>مرحلة العمل تحدد: إزالة 40–80، تشطيب 100–180، نهائي 240+. المادة تحدد نوع الحبيبات.</dd>
  <dt>ما هو الحد الأدنى للطلب (MOQ)؟</dt>
  <dd>يُحدد بالمواصفة: المنتج القياسي أقل، OEM/تخصيص أعلى. اطلب العرض للرقم الدقيق.</dd>
  <dt>كم مدة التوريد الإجمالية؟</dt>
  <dd>تُحدد المدة في عرض السعر بعد اعتماد المواصفة والعينة: مدة الإنتاج + الشحن (بحري أو جوي) وجهة الشحن. الرقم الدقيق في العرض.</dd>
</dl>`;
}

function buildDecisionReferenceTable(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  return buildDecisionGuide(topic, model, productCat, undefined);
}

// ========== 各类内容构建函数 ==========

// 对比表 B 列（替代产品）的真实规格，取自同站 site.ts 产品族数据，避免「غير محدد」占位行
function altSize(familySlug: string): string {
  const alt = { 'abrasive-belts': 'sanding-discs', 'flap-discs': 'abrasive-belts', 'sanding-discs': 'abrasive-belts', 'hook-loop': 'sanding-discs', 'sanding-sponges': 'sanding-discs' }[familySlug] || 'sanding-discs';
  const cat = productCategories.find(c => c.slug === alt);
  const dim = cat?.specs?.find(s => /أقطار|أبعاد/i.test(s[0]))?.[1];
  return dim || 'متعدد الأقطار';
}
function altBacking(familySlug: string): string {
  const alt = { 'abrasive-belts': 'sanding-discs', 'flap-discs': 'abrasive-belts', 'sanding-discs': 'abrasive-belts', 'hook-loop': 'sanding-discs', 'sanding-sponges': 'sanding-discs' }[familySlug] || 'sanding-discs';
  const cat = productCategories.find(c => c.slug === alt);
  return cat?.specs?.find(s => /قاعدة|نوع/i.test(s[0]))?.[1] || 'حسب المنتج';
}
function altAttachment(familySlug: string): string {
  const alt = { 'abrasive-belts': 'sanding-discs', 'flap-discs': 'abrasive-belts', 'sanding-discs': 'abrasive-belts', 'hook-loop': 'sanding-discs', 'sanding-sponges': 'sanding-discs' }[familySlug] || 'sanding-discs';
  if (alt === 'sanding-discs') return 'هوك آند لوب / PSA / شبكي';
  if (alt === 'abrasive-belts') return 'طريقة الوصل حسب الماكينة';
  return 'حسب المنتج';
}
function altGritRange(familySlug: string): string {
  const alt = { 'abrasive-belts': 'sanding-discs', 'flap-discs': 'abrasive-belts', 'sanding-discs': 'abrasive-belts', 'hook-loop': 'sanding-discs', 'sanding-sponges': 'sanding-discs' }[familySlug] || 'sanding-discs';
  const cat = productCategories.find(c => c.slug === alt);
  const g = cat?.specs?.find(s => /حبيبات|غرِت/i.test(s[0]))?.[1];
  return g || 'حسب الطلب';
}
function getAltApplication(familySlug: string): string {
  const alt = { 'abrasive-belts': 'sanding-discs', 'flap-discs': 'abrasive-belts', 'sanding-discs': 'abrasive-belts', 'hook-loop': 'sanding-discs', 'sanding-sponges': 'sanding-discs' }[familySlug] || 'sanding-discs';
  const cat = productCategories.find(c => c.slug === alt);
  return cat?.applications?.join('، ') || 'تطبيقات مكملة';
}

function buildComparisonTable(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  const productName = model?.name || productCat?.name || getProductFamilyNameAr(topic.productFamily);
  const altProduct = topic.articleType === 'product-comparison' ? getAlternativeProduct(topic.productFamily) : productName;

  return `
<table class="spec-table">
  <thead>
    <tr><th>المعلمة</th><th>${productName}</th><th>${altProduct}</th><th>ملاحظات</th></tr>
  </thead>
  <tbody>
    <tr><td>النوع</td><td>${productName}</td><td>${altProduct}</td><td>اختلاف في الشكل والاستخدام</td></tr>
    <tr><td>مقاس شائع</td><td>${model?.sizeAr || 'متعدد'}</td><td>${altSize(topic.productFamily)}</td><td>يُختار حسب الماكينة</td></tr>
    <tr><td>نطاق الغرِت</td><td>${model?.gritRange.join(' – ') || '40–800'}</td><td>${altGritRange(topic.productFamily)}</td><td>يعتمد على مرحلة العمل</td></tr>
    <tr><td>القاعدة</td><td>${model?.backing || 'قماش/ورق/بوليمر'}</td><td>${altBacking(topic.productFamily)}</td><td>مرونة vs ثبات</td></tr>
    <tr><td>نظام التثبيت</td><td>${model?.attachment || 'يُحدد مع الماكينة'}</td><td>${altAttachment(topic.productFamily)}</td><td>توافق الماكينة حاسم</td></tr>
    <tr><td>التطبيق الرئيسي</td><td>${getMainApplication(topic.productFamily)}</td><td>${getAltApplication(topic.productFamily)}</td><td>قد تتداخل في بعض المراحل</td></tr>
    <tr><td>الكمية الدنيا (MOQ)</td><td>يُحدد في العرض</td><td>يُحدد في العرض</td><td>حسب التخصيص والتغليف</td></tr>
  </tbody>
</table>

<p>القرار: اختر ${productName} عندما تكون الماكينة حزام/قرص متوافقة والمساحة تسمح. ${altProduct} للأماكن الضيقة أو الماكينات غير المتوافقة.</p>`;
}

function buildDecisionGuide(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined, industry: typeof industries[0] | undefined): string {
  const productName = model?.name || productCat?.name || getProductFamilyNameAr(topic.productFamily);
  const industryName = industry?.name || '';

  return `
<div class="decision-flow">
  <h3>خطوات التحديد (3 خطوات)</h3>
  <ol class="numbered-list">
    <li><strong>مادة القطعة:</strong> ${getWorkpieceMaterials(topic.industry).join(' / ')}</li>
    <li><strong>مرحلة العمل:</strong> إزالة (غرِت 40–80) → تشطيب متوسط (100–180) → لمسة نهائية (240–400+)</li>
    <li><strong>توافق الماكينة:</strong> مقاس الحزام/القرص، نظام التثبيت (هوك آند لوب / PSA / شبكي)، اتجاه الدوران</li>
  </ol>

  <h3>مصفوفة الاختيار السريع</h3>
  <table class="spec-table">
    <thead><tr><td>المادة</td><td>مرحلة</td><td>الغرِت المقترح</td><td>النوع المفضل</td></tr></thead>
    <tbody>
      <tr><td>خشب ناعم</td><td>إزالة</td><td>60–80</td><td>${productName}</td></tr>
      <tr><td>خشب صلب</td><td>تشطيب</td><td>120–180</td><td>${productName}</td></tr>
      <tr><td>فولاذ/ستانلس</td><td>إزالة صدأ</td><td>40–60</td><td>${productName} (حبيبات زركونيا/سيراميك)</td></tr>
      <tr><td>ألومنيوم</td><td>تنعيم</td><td>180–240</td><td>${productName} (أكسيد ألومنيوم)</td></tr>
      <tr><td>طلاء قديم</td><td>إزالة</td><td>80–100</td><td>${productName}</td></tr>
    </tbody>
  </table>
</div>`;
}

function buildSpecsSection(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  const productName = model?.name || productCat?.name || getProductFamilyNameAr(topic.productFamily);

  return `
<h3>المعايير المرجعية</h3>
<p>درجات الغرِت تتبع <strong>FEPA P</strong> (الأوروبية) وهي المعيار الدولي السائد. المقابل ANSI (الأمريكية) و JIS (اليابانية) موجودة لكن لا تخلط بينهما في مواصفة واحدة.</p>

<h3>جدول المواصفات الكاملة</h3>
<table class="spec-table">
  <thead><tr><th>المعلمة</th><th>القيمة / النطاق</th><th>ملاحظات</th></tr></thead>
  <tbody>
    <tr><td>المنتج</td><td>${productName}</td><td></td></tr>
    <tr><td>المقاس</td><td>${model?.sizeAr || productCat?.specs?.find(s => s[0].includes('أبعاد'))?.[1] || 'متعدد المقاسات'}</td><td>يُحدد بالملّيمتر بدقة</td></tr>
    <tr><td>نطاق الغرِت</td><td>${model?.gritRange.join('، ') || 'حسب الطلب'}</td><td>FEPA P قياسي</td></tr>
    <tr><td>نوع الحبيبات</td><td>${getGrainTypes(topic.productFamily).join(' / ')}</td><td>يُختار حسب المادة</td></tr>
    <tr><td>القاعدة (Backing)</td><td>${model?.backing || 'قماش، ورق، أو بوليمر'}</td><td>مرونة، ثبات، مقاومة رطوبة</td></tr>
    <tr><td>الرابطة (Bond)</td><td>إسفنجية (Resin)</td><td>مقاومة حرارة عالية</td></tr>
    <tr><td>نظام التثبيت</td><td>${model?.attachment || 'هوك آند لوب / PSA / شبكي'}</td><td>يجب مطابقة الماكينة</td></tr>
    <tr><td>السرعة القصوى</td><td>وفق ملصق المنتج</td><td>لا تتجاوز RPM الماكينة</td></tr>
    <tr><td>السلامة</td><td>PPE إلزامي، سحب غبار</td><td>OSHA/NIOSH + محلي</td></tr>
  </tbody>
</table>`;
}

function buildApplicationSection(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined, industry: typeof industries[0] | undefined, gccCountry: typeof gccCountries[0] | undefined): string {
  const productName = model?.name || productCat?.name || getProductFamilyNameAr(topic.productFamily);
  const industryName = industry?.name || '';
  const countryName = gccCountry?.name || '';

  return `
<h3>دورة العمل في ${industryName}${countryName ? ` (${countryName})` : ''}</h3>
<ol class="numbered-list">
  <li><strong>التجهيز:</strong> تنظيف السطح، إزالة الصدأ/الطلاء القديم، فحص العيوب</li>
  <li><strong>الإزالة السريعة:</strong> ${productName} بغرِت 40–80، ضغط معتدل، سرعة موصى بها</li>
  <li><strong>التسوية المتوسطة:</strong> غرِت 100–180، تخفيف الضغط، تمريرات متقاطعة</li>
  <li><strong>التشطيب النهائي:</strong> غرِت 240–400 (أو أعلى للدهان)، حركة منتظمة</li>
  <li><strong>التنظيف والفحص:</strong> إزالة الغبار، فحص خشونة السطح (Ra/Rz)، تجهيز للخطوة التالية</li>
</ol>

<h3>تسلسل الغرِت المقترح</h3>
<table class="spec-table">
  <thead><tr><th>المرحلة</th><th>الغرِت</th><th>الهدف</th><th>ملاحظات</th></tr></thead>
  <tbody>
    <tr><td>إزالة مادة/صدأ/طلاء</td><td>40 – 80</td><td>إنتاجية عالية</td><td>زركونيا/سيراميك للمعدن</td></tr>
    <tr><td>تشطيب متوسط</td><td>100 – 180</td><td>تسوية آثار المرحلة السابقة</td><td>أكسيد ألومنيوم عام</td></tr>
    <tr><td>تشطيب ناعم</td><td>240 – 400</td><td>تحضير للدهان/الطلاء</td><td>تجنب اللمعان المفرط</td></tr>
    <tr><td>لمسة نهائية</td><td>600 – 1500+</td><td>أسطح مرئية/دقيقة</td><td>للأثاث، السيارات، دقة</td></tr>
  </tbody>
</table>
${gccCountry?.industrialClusters?.length ? `
<h3>مراكز الطلب في ${countryName}</h3>
<p>${countryName} تتركز فيه الطلبات الصناعية أساسًا في مناطق: ${gccCountry.industrialClusters.join('، ')}. تُنسق الكميات ومواعيد التوريد وفق أقرب ميناء لهذه المناطق، مع مراعاة ظروف التخزين لكل موقع.</p>` : ''}`;
}

function buildProcessSteps(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined, industry: typeof industries[0] | undefined): string {
  const productName = model?.name || productCat?.name || t(topic.productFamily);
  const industryName = industry?.name || '';

  return `
<h3>إجراء تشغيل قياسي (SOP) - ${industryName}</h3>
<ol class="numbered-list">
  <li><strong>فحص الماكينة:</strong> نظافة البكرات، اتجاه الدوران، حالة وسادة التثبيت، نظام الشفط</li>
  <li><strong>تركيب ${productName}:</strong> مطابقة المقاس، تثبيت صحيح، فحص محاذاة الحزام/القرص</li>
  <li><strong>اختبار تشغيل:</strong> 30 ثانية بدون قطعة، مراقبة اهتزاز/صوت/انحراف</li>
  <li><strong>ضبط المعلمات:</strong> السرعة (RPM)، الضغط (N/cm²)، معدل التغذية (m/min)</li>
  <li><strong>الصنفرة التسلسلية:</strong> اتبع جدول الغرِت، نظف السطح بين كل درجة</li>
  <li><strong>مراقبة الجودة:</strong> فحص بصري + مقياس خشونة كل 50 قطعة أو كل دفعة</li>
  <li><strong>تغيير الغرِت:</strong> أوقف الماكينة، أزل القديم، نظف القاعدة، ثبت الجديد، اختبر</li>
  <li><strong>إيقاف وتنظيف:</strong> أزل ${productName}، نظف الماكينة، خزن في مكان جاف</li>
</ol>

<h3>معلمات تشغيل مرجعية</h3>
<table class="spec-table">
  <thead><tr><th>المعلمة</th><th>النطاق المقترح</th><th>تنبيه</th></tr></thead>
  <tbody>
    <tr><td>السرعة (حزام)</td><td>15–30 م/ث</td><td>لا تتجاوز حد المنتج</td></tr>
    <tr><td>السرعة (قرص)</td><td>وفق قطر القرص و RPM الماكينة</td><td>تحقق من الملصق</td></tr>
    <tr><td>الضغط</td><td>0.5–2 N/cm²</td><td>ضغط زائد = تآكل + حرارة</td></tr>
    <tr><td>معدل التغذية</td><td>3–8 م/دقيقة</td><td>حسب المادة والنتيجة</td></tr>
  </tbody>
</table>`;
}

function buildSafetyCompliance(topic: TopicSpec, industry: typeof industries[0] | undefined, gccCountry: typeof gccCountries[0] | undefined): string {
  const countryName = gccCountry?.name || '';
  const countryCode = gccCountry?.code || '';

  let standards = 'FEPA، ISO 6344، ISO 15636، OSHA 1910.215، NIOSH';
  if (countryCode === 'saudi-arabia') standards += '، SASO';
  if (countryCode === 'uae') standards += '، ESMA';
  if (countryCode !== 'general-gcc') standards += '، GSO';

  return `
<h3>متطلبات السلامة (PPE إلزامي)</h3>
<ul class="plain-links">
  <li>نظارات واقية / وجهية (EN 166 / ANSI Z87.1)</li>
  <li>كمامة تنفس (N95 / FFP2 mínimo، أعلى للغبار الدقيق)</li>
  <li>قفازات مقاومة للقطع (EN 388)</li>
  <li>واقي سمع (EN 352) للماكينات الصاخبة</li>
  <li>ملابس عمل طويلة، لا مجوهرات، شعر مربوط</li>
</ul>

<h3>سحب الغبار والتهوية</h3>
<ul class="plain-links">
  <li>نظام شفط مركزي أو محلي عند كل ماكينة</li>
  <li>فلترة HEPA للغبار الدقيق (خاصة السيراميك/الزركونيا)</li>
  <li>معدل تبديل الهواء: ≥ 6 مر/ساعة في ورش الصنفرة</li>
</ul>

<h3>حدود السرعة والامتثال</h3>
<ul class="plain-links">
  <li>لا تتجاوز <strong>الحد الأقصى RPM</strong> المطبوع على المنتج</li>
  <li>تفقد المنتج قبل كل استخدام: شقوق، تلف، تآكل غير متساوٍ</li>
  <li>المعايير المطبقة: ${standards}</li>
  ${countryCode !== 'general-gcc' ? `<li><strong>تنبيه:</strong> اللوائح في ${countryName} قد تفرض متطلبات إضافية. راجع الجهة المحلية (${getLocalRegulator(countryCode)}) قبل التشغيل.</li>` : ''}
</ul>

<p class="disclaimer">المعلومات أعلاه للإرشاد فقط. المرجع النهائي: ملصق المنتج، ورقة بيانات التقنية، دليل الماكينة، واللوائح المحلية السارية.</p>`;
}

function buildCostOptimization(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  const productName = model?.name || productCat?.name || getProductFamilyNameAr(topic.productFamily);

  return `
<h3>نقاط التحكم في التكلفة الإجمالية (TCO)</h3>
<table class="spec-table">
  <thead><tr><th>العامل</th><th>التأثير على التكلفة</th><th>إجراء تحسين</th></tr></thead>
  <tbody>
    <tr><td>اختيار الغرِت الصحيح</td><td>تجنب إعادة العمل + عمر أطول</td><td>اختبار 2–3 درجات قبل الطلب الكمي</td></tr>
    <tr><td>نوع الحبيبات</td><td>سيراميك/زركوريا أغلى لكن تدوم 2–3×</td><td>احسب تكلفة المتر المربع لا سعر الوحدة</td></tr>
    <tr><td>القاعدة المناسبة</td><td>قماش مرن = أقل كسر على الانحناءات</td><td>مطابقة القاعدة لشكل القطعة</td></tr>
    <tr><td>نظام الشفط</td><td>يقلل الانسداد → يطيل العمر 30–50%</td><td>استثمر في شفط فعال</td></tr>
    <tr><td>الصيانة الوقائية</td><td>بكرات نظيفة = حزام مستقيم = تآكل متساوٍ</td><td>جدول تنظيف يومي/أسبوعي</td></tr>
    <tr><td>الكمية والتغليف</td><td>طلب كمي = سعر وحدة أقل + شحن محسن</td><td>تجميع الطلبات الشهرية/الربع سنوية</td></tr>
  </tbody>
</table>

<p>النصيحة: اطلب <strong>عرض سعر متدرج</strong> (كميات 100، 500، 1000، 5000 وحدة) للمقارنة الحقيقية.</p>`;
}

function buildProcurementTemplate(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  const gccCountryName = () => {
    const c = gccCountries.find(g => g.code === topic.gccCountry);
    return c && c.code !== 'general-gcc' ? `${c.industrialClusters[0]} (${c.name})` : '';
  };
  const productName = model?.name || productCat?.name || getProductFamilyNameAr(topic.productFamily);

  return `
<h3>نموذج مواصفة طلب عرض سعر (RFQ) - ${productName}</h3>
<p>انسخ الجدول، املأ البيانات، وأرسل عبر نموذج الاستفسار.</p>

<table class="spec-table">
  <thead><tr><th>الحقل</th><th>مثال / تنسيق</th><th>إلزامي؟</th></tr></thead>
  <tbody>
    <tr><td>اسم المنتج / العائلة</td><td>${productName}</td><td>نعم</td></tr>
    <tr><td>المقاس (مم / إنش)</td><td>${model?.sizeAr || '533 × 75 مم / 5 إنش'}</td><td>نعم</td></tr>
    <tr><td>درجة الغرِت (FEPA)</td><td>${model?.gritRange?.slice(0, 3).join('، ') || '80، 120، 240'}</td><td>نعم</td></tr>
    <tr><td>نوع الحبيبات</td><td>أكسيد ألومنيوم / زركونيا / سيراميك</td><td>يفضل</td></tr>
    <tr><td>القاعدة (Backing)</td><td>قماش X / ورق Y / بوليمر Z</td><td>يفضل</td></tr>
    <tr><td>نظام التثبيت</td><td>هوك آند لوب / PSA / شبكي</td><td>نعم</td></tr>
    <tr><td>الكمية التقديرية</td><td>5000 وحدة / شهر</td><td>نعم</td></tr>
    <tr><td>تكرار الطلب</td><td>شهري / ربع سنوي / سنوي</td><td>يفضل</td></tr>
    <tr><td>التطبيق / المادة</td><td>ستانلس ستيل، إزالة لحام</td><td>نعم</td></tr>
    <tr><td>طراز الماكينة</td><td>${model?.attachment || 'Timesavers 1300 / ماكينة حزام قياسية'}</td><td>نعم</td></tr>
    <tr><td>طريقة الوصل (للأحزمة)</td><td>مستقيم / مائل / متداخل</td><td>للأحزمة فقط</td></tr>
    <tr><td>التغليف</td><td>صندوق كرتون / لفة / حزمة مخصصة</td><td>يفضل</td></tr>
    <tr><td>OEM / علامة تجارية</td><td>نعم / لا، ملف شعار مرفق</td><td>إذا مطبق</td></tr>
    <tr><td>وجهة الشحن (الميناء/المدينة)</td><td>${gccCountryName() || 'جدة / جبل علي / الدوحة'}</td><td>نعم</td></tr>
    <tr><td>شروط الدفع المفضلة</td><td>LC / TT 30% مقدم</td><td>يفضل</td></tr>
    <tr><td>شهادات مطلوبة</td><td>COC / COA / SASO / ESMA</td><td>إذا مطبق</td></tr>
  </tbody>
</table>`;
}

function buildOEMOptions(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  const productName = model?.name || productCat?.name || getProductFamilyNameAr(topic.productFamily);

  return `
<h3>مصفوفة خيارات OEM - ${productName}</h3>
<table class="spec-table">
  <thead><tr><th>عنصر التخصيص</th><th>الخيارات</th><th>تأثير على MOQ</th><th>ملاحظات</th></tr></thead>
  <tbody>
    <tr><td>الشعار على المنتج</td><td>طباعة حبر / ليزر / نقش</td><td>+10–20%</td><td>ملف فيكتور (AI/SVG/EPS) إلزامي</td></tr>
    <tr><td>اللون</td><td>أحمر (قياسي) / أزرق / أخضر / مخصص</td><td>+5–15%</td><td>كود بانتون مطلوب</td></tr>
    <tr><td>التغليف الخارجي</td><td>صندوق بني / ملون / مطبوع</td><td>+0–10%</td><td>رسومات تغليف بأبعاد دقيقة</td></tr>
    <tr><td>التغليف الداخلي</td><td>أكياس PE / صناديق فردية / لفات</td><td>+0–5%</td><td>حسب الكمية والنقل</td></tr>
    <tr><td>الملصقات/الباركود</td><td>GS1 / مخصص / بدون</td><td>+0%</td><td>تزويد ملف CSV للبيانات</td></tr>
    <tr><td>اللغات على العبوة</td><td>عربي، إنجليزي، أخرى</td><td>+0%</td><td>نصوص معتمدة من العميل</td></tr>
    <tr><td>شهادات مخصصة</td><td>COC ببيانات العميل / COA لكل دفعة</td><td>+5% / دفعة</td><td>يُتفق في العقد</td></tr>
  </tbody>
</table>

<h3>عملية تأكيد العينة</h3>
<ol class="numbered-list">
  <li>العميل يرسل ملفات الشعار/التغليف + مواصفة المنتج</li>
  <li>ننتج عينة أولية (5–10 وحدات) خلال 10–15 يوم عمل</li>
  <li>العميل يفحص: أبعاد، طباعة، ألوان، جودة صنفرة</li>
  <li>تعديلات (إن وجدت) → عينة ثانية خلال 5–7 أيام</li>
  <li>توقيع "موافقة عينة" → بدء الإنتاج الكمي</li>
  <li>مهلة الإنتاج: تُحدد في عرض السعر حسب الكمية والتعقيد</li>
</ol>`;
}

function buildLogisticsPorts(gccCountry: typeof gccCountries[0] | undefined): string {
  if (!gccCountry || gccCountry.code === 'general-gcc') return '';

  const ports: Record<string, string[]> = {
    'saudi-arabia': ['جدة الإسلامي', 'الملك عبدالعزيز (الدمام)', 'ينبع التجاري', 'جيزان'],
    'uae': ['جبل علي (الأكبر)', 'خليفة (أبوظبي)', 'الحمرية (الشارقة)', 'الفجيرة'],
    'qatar': ['حمد (الرئيسي)', 'الدوحة القديم', 'رأس لفان (الغاز)'],
    'kuwait': ['الشويخ (الرئيسي)', 'الأحمدي (النفط)', 'الدوحة (الصغير)'],
    'bahrain': ['خليفة بن سلمان (الرئيسي)', 'سترة (الصناعي)'],
    'oman': ['صلالة (الرئيسي/التحويل)', 'صحار (الصناعي)', 'الدقم (الجديد)', 'مسقط (القديم)'],
  };

  const countryPorts = ports[gccCountry.code] || [];

  return `
<h3>الموانئ الرئيسية في ${gccCountry.name}</h3>
<ul class="plain-links">
  ${countryPorts.map(p => `<li>${p}</li>`).join('')}
</ul>

<h3>مهل الشحن البحري التقديرية (من الصين)</h3>
<table class="spec-table">
  <thead><tr><th>الميناء</th><th>أيام الإبحار</th><th>التخليص + التسليم</th><th>الإجمالي</th></tr></thead>
  <tbody>
    ${countryPorts.map(p => `<tr><td>${p}</td><td>20–28</td><td>5–7</td><td>25–35</td></tr>`).join('')}
  </tbody>
</table>

<p><strong>الشحن الجوي:</strong> 3–5 أيام + 1–2 يوم تخليص. التكلفة 4–6× البحري. للحالات العاجلة فقط.</p>

<p><strong>المستندات المطلوبة:</strong> بوليصة شحن، فاتورة تجارية، قائمة تعبئة، شهادة المنشأ، شهادة مطابقة (SASO/ESMA/GSO)، بوليصة تأمين.</p>`;
}

function buildMarketTrends(topic: TopicSpec, industry: typeof industries[0] | undefined, gccCountry: typeof gccCountries[0] | undefined): string {
  const industryName = industry?.name || '';
  const countryName = gccCountry?.name || '';

  return `
<h3>محركات السوق في ${industryName}${countryName ? ` (${countryName})` : ''}</h3>
<ul class="plain-links">
  <li><strong>تحديث المعايير:</strong> FEPA P 2023، ISO 6344:2022 تفرض اتساقاً أدق للغرِت</li>
  <li><strong>الصحة والسلامة:</strong> SASO/ESMA/GSO تشدد على حدود الغبار القابل للتنفس، PPE إلزامي</li>
  <li><strong>الأتمتة:</strong> خطوط صنفرة روبوتية تحتاج أحزمة/أقراص بتماسك أبعاد عالي</li>
  <li><strong>الاستدامة:</strong> طلب متزايد لقواعد قابلة لإعادة التدوير، حبيبات أقل انبعاثاً</li>
</ul>

<h3>اتجاهات المنتج</h3>
<table class="spec-table">
  <thead><tr><th>الاتجاه</th><th>التأثير على الشراء</th><th>المنتجات المعنية</th></tr></thead>
  <tbody>
    <tr><td>حبيبات سيراميك/زركونيا</td><td>سعر أعلى، عمر 2–3×، تكلفة متر مربع أقل</td><td>أحزمة، أقراص، فلب ديسك</td></tr>
    <tr><td>قواعد بوليمرية مقاومة رطوبة</td><td>استقرار أبعاد في بيئات رطبة/ساحلية</td><td>أحزمة كبيرة، أقراص</td></tr>
    <tr><td>أقراص شبكية متعددة الثقوب</td><td>شفط أفضل، أقل انسداد، تشطيب موحد</td><td>أقراص 5/6 إنش</td></tr>
    <tr><td>نظام هوك آند لوب محسن</td><td>تغيير أسرع، ثبات أعلى، عمر قاعدة أطول</td><td>جميع الأقطار</td></tr>
  </tbody>
</table>

<p>التوصية: في طلبات التوريد طويلة الأمد، اطلب <strong>خريطة طريق المنتج</strong> من المورد لتجنب التقادم.</p>`;
}

function buildPreventiveMaintenance(topic: TopicSpec, model: typeof models[0] | null): string {
  return `
<h3>جدول صيانة وقائية - معدات الصنفرة</h3>
<table class="spec-table">
  <thead><tr><th>التكرار</th><th>الإجراء</th><th>الأداة/المعيار</th></tr></thead>
  <tbody>
    <tr><td>يومي (بداية الوردية)</td><td>فحص بصري للحزام/القرص، نظافة البكرات، اختبار شفط</td><td>قائمة تحقق موقعة</td></tr>
    <tr><td>أسبوعي</td><td>تنظيف بكرات التوجيه/الشد، فحص محاذاة، تزييت محامل</td><td>دليل الماكينة</td></tr>
    <tr><td>شهري</td><td>فحص وسادة التثبيت (هوك آند لوب/PSA)، معايرة RPM، فلترة الهواء</td><td>مقياس RPM، مقياس تدفق</td></tr>
    <tr><td>ربع سنوي</td><td>استبدال وسادة التثبيت، فحص نظام الشفط كاملاً، معايرة الضغط</td><td>قطع غيار أصلية</td></tr>
    <tr><td>سنوي</td><td>صيانة شاملة بواسطة فني معتمد، توثيق، شهادة سلامة</td><td>مزود الخدمة المعتمد</td></tr>
  </tbody>
</table>

<p>سجل الصيانة يمدد عمر الماكينة ويقلل التوقف غير المخطط بنسبة 40–60% (بيانات مصنعي معدات صنفرة).</p>`;
}

function buildSupportEscalation(): string {
  return `
<h3>متى تتصعد للدعم الفني؟</h3>
<ul class="plain-links">
  <li>عطل متكرر بنفس النمط بعد تطبيق الحلول القياسية</li>
  <li>منتج جديد لا يتوافق مع المواصفة المتعاقد عليها</li>
  <li>انحراف أداء > 20% عن الدفعة المرجعية</li>
  <li>حاجة لتعديل مواصفة (غرِت، قاعدة، أبعاد) أثناء التعاقد</li>
</ul>

<h3>قنوات الدعم</h3>
<ul class="plain-links">
  <li>البريد الإلكتروني: <a href="mailto:motai-01@motaiabrasive.com">motai-01@motaiabrasive.com</a></li>
  <li>واتساب: <a href="https://wa.me/8618118635597" rel="nofollow noopener" target="_blank">+86 181 1863 5597</a></li>
  <li>نموذج الاستفسار: <a href="/quote">صفحة طلب عرض السعر</a></li>
</ul>

<p>أرفق دائماً: صور العطل، رقم الدفعة، المواصفة، ظروف التشغيل (ماكينة، مادة، معلمات).</p>`;
}

function buildCulturalNotes(gccCountry: typeof gccCountries[0] | undefined): string {
  if (!gccCountry || gccCountry.code === 'general-gcc') return '';

  const notes: Record<string, string[]> = {
    'saudi-arabia': ['أسبوع العمل: الأحد–الخميس', 'اللغة الرسمية: العربية، الإنجليزية في الأعمال', 'تحية: "السلام عليكم"، مصافحة', 'القرارات: هرمية، صاحب القرار النهائي هو المفتاح', 'رمضان: ساعات عمل مخفضة، تجنب الاجتماعات ظهراً'],
    'uae': ['أسبوع العمل: الاثنين–الجمعة (حكومي)، الأحد–الخميس (كثير من الخاص)', 'بيئة متعددة الثقافات، الإنجليزية لغة الأعمال', 'بطاقات العمل: تبادلها بيمين، اقرأها قبل وضعها', 'المناطق الحرة: قوانين مختلفة، تحقق من الجهة المنظمة'],
    'qatar': ['أسبوع العمل: الأحد–الخميس', 'قطرنة: أفضلية للمنتجات/الخدمات المحلية في المناقصات الحكومية', 'اللغة: العربية رسمية، الإنجليزية شائعة', 'العلاقات الشخصية مهمة جداً في بناء الثقة'],
    'kuwait': ['أسبوع العمل: الأحد–الخميس', 'القطاع الخاص يغلق ظهر الجمعة', 'التفاوض: صبور، يبنى على الثقة طويلة المدى', 'القرارات قد تحتاج موافقات متعددة'],
    'bahrain': ['أسبوع العمل: الأحد–الخميس', 'بيئة أعمال منفتحة، إجراءات مبسطة', 'اللغة: عربية/إنجليزية', 'الشبكات الشخصية (الواسطة) فعالة جداً'],
    'oman': ['أسبوع العمل: الأحد–الخميس', 'التعمين: نسبة توطين إلزامية في الشركات', 'القرارات: تشاركية، استشارة واسعة', 'احترام التسلسل الهرمي والسن'],
  };

  const countryNotes = notes[gccCountry.code] || [];

  return `
<h3>ملاحظات ثقافية وتجارية - ${gccCountry.name}</h3>
<ul class="plain-links">
  ${countryNotes.map(n => `<li>${n}</li>`).join('')}
</ul>

<p>هذه ملاحظات عامة. كل شركة وثقافة مؤسسية تختلف. ابنِ العلاقة على الوضوح، الالتزام بالمواعيد، والوفاء بالوعود.</p>`;
}

function buildDisclaimer(gccCountry: typeof gccCountries[0] | undefined): string {
  const countryName = gccCountry?.name || 'الخليج العربي';

  return `
<div class="disclaimer" style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:1rem;margin:1.5rem 0;">
  <h3>إخلاء مسؤولية مهم</h3>
  <ul>
    <li>موتاى <strong>لا تملك مخزوناً محلياً</strong>، ولا مكتباً، ولا كياناً قانونياً، ولا موزعاً معتمداً حصرياً في ${countryName}.</li>
    <li>جميع الشحنات <strong>تصدر من مصنعنا في الصين</strong> (هوبي، شيانينغ) وفق شروط INCOTERTS المتفق عليها.</li>
    <li>مهل التوريد، الأسعار، MOQ، والشهادات <strong>تخضع للعرض التجاري النهائي</strong> بعد مراجعة المواصفة الكاملة.</li>
    <li>الامتثال لـ SASO/ESMA/GSO <strong>مسؤولية المستورد</strong>؛ نحن نوفر شهادات المصنع (COC/COA) وفق المواصفة.</li>
    <li>أي إشارة إلى "موزع محلي" أو "تسليم من المخزن في ${countryName}" <strong>غير صحيحة</strong> ما لم تصدر كتابياً من موتاى.</li>
  </ul>
</div>`;
}

function buildGlossaryCard(topic: TopicSpec): string {
  const terms = [
    { term: 'درجة الغرِت (Grit)', def: 'رقم معياري (FEPA P) يدل على حجم الحبيبات. رقم أقل = أخشن، رقم أعلى = أنعم' },
    { term: 'القاعدة (Backing)', def: 'المادة الحاملة للحبيبات: قماش (مرن)، ورق (ثابت)، بوليمر (مقاوم رطوبة)' },
    { term: 'الرابطة (Resin Bond)', def: 'المادة اللاصقة التي تثبت الحبيبات على القاعدة. إسبنجية تتحمل الحرارة' },
    { term: 'هوك آند لوب (Hook & Loop)', def: 'نظام تثبيت بخطاف وحلقة (فيلكرو) يسمح بتغيير القرص سريعاً' },
    { term: 'لصق ذاتي (PSA)', def: 'قرص بوجه لاصق حساس للضغط، تركيب مرة واحدة على قاعدة لاصقة' },
    { term: 'شبكي (Mesh)', def: 'قرص/حزام بفتحات لتفريغ الغبار، يقلل الانسداد ويحسن التشطيب' },
    { term: 'الحد الأدنى للكمية (MOQ)', def: 'أقل كمية طلب يقبلها المورد في أمر إنتاج واحد' },
    { term: 'مدة التوريد (Lead Time)', def: 'الوقت من اعتماد المواصفة النهائية حتى تسليم البضاعة في الميناء/المستودع' },
    { term: 'OEM / العلامة الخاصة', def: 'إنتاج المنتج بشعار العميل وتغليفه، بموجب مواصفة واتفاقية مبرمة' },
  ];

  return `
<div class="info-box glossary-card">
  <h3>بطاقة مصطلحات سريعة</h3>
  <dl>
    ${terms.map(t => `<dt>${t.term}</dt><dd>${t.def}</dd>`).join('')}
  </dl>
</div>`;
}

function buildInquiryTemplate(topic: TopicSpec): string {
  return `
<div class="info-box inquiry-template">
  <h3>نموذج طلب عرض سعر (نسخ، ملء، إرسال)</h3>
  <pre style="background:#1e293b;color:#e2e8f0;padding:1rem;border-radius:8px;overflow-x:auto;font-family:monospace;font-size:0.85rem;line-height:1.6;">منتج: [اسم المنتج/العائلة]
مقاس: [مثال: 533×75 مم أو 5 إنش]
غرِت: [مثال: 80، 120، 240]
حبيبات: [أكسيد ألومنيوم / زركونيا / سيراميك / غير محدد]
قاعدة: [قماش / ورق / بوليمر / غير محدد]
تثبيت: [هوك آند لوب / PSA / شبكي / غير محدد]
كمية: [وحدات / شهر أو طلب واحد]
تكرار: [شهري / ربع سنوي / سنوي / لمرة واحدة]
تطبيق: [مثال: ستانلس ستيل، إزالة لحام، تشطيب نهائي]
ماكينة: [طراز الماكينة + طريقة الوصل للأحزمة]
تغليف: [قياسي / OEM - أرفق ملفات الشعار]
شحن إلى: [الميناء / المدينة / الدولة]
دفع: [LC / TT / شروط أخرى]
شهادات: [COC / COA / SASO / ESMA / GSO / غير مطلوب]
ملاحظات: [أي متطلبات خاصة]</pre>
  <p><a href="/quote" class="button button--primary">إرسال عبر النموذج الإلكتروني</a></p>
</div>`;
}

function buildContactInfo(): string {
  return `
<div class="contact-info">
  <h3>تواصل معنا</h3>
  <dl class="spec-dl">
    <div><dt>البريد الإلكتروني</dt><dd><a href="mailto:motai-01@motaiabrasive.com">motai-01@motaiabrasive.com</a></dd></div>
    <div><dt>واتساب</dt><dd><a href="https://wa.me/8618118635597" rel="nofollow noopener" target="_blank">+86 181 1863 5597</a></dd></div>
    <div><dt>الهاتف</dt><dd>+86 181 1863 5597</dd></div>
    <div><dt>العنوان</dt><dd>رقم 88، شارع يولي، مدينة جونشوي، مقاطعة تونغتشنغ، شياننغ، هوبي، الصين</dd></div>
    <div><dt>ساعات الاستجابة</dt><dd>أيام العمل: 24 ساعة | عطلة نهاية الأسبوع: 48 ساعة</dd></div>
  </dl>
</div>`;
}

function buildFAQSection(
  topic: TopicSpec,
  model: typeof models[0] | null,
  productCat: typeof productCategories[0] | undefined,
  industry: typeof industries[0] | undefined,
  gccCountry: typeof gccCountries[0] | undefined
): string {
  const faqs = buildFAQ(topic, model, productCat, industry, gccCountry);

  if (faqs.length === 0) return '';

  let html = '<h2>الأسئلة الشائعة</h2>\n<dl class="faq-list">';
  faqs.forEach(faq => {
    html += `<dt>${faq.q}</dt><dd>${faq.a}</dd>`;
  });
  html += '</dl>';
  return html;
}

function buildCTASection(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  const cta = buildCTA(topic, model, productCat);
  const targetUrl = cta.targetUrl || '/quote';

  return `
<div class="cta-band" style="background:#1e3a5f;color:#fff;padding:2rem;border-radius:12px;margin:2rem 0;text-align:center;">
  <h3>${cta.text}</h3>
  <a href="${targetUrl}" class="button button--primary" style="background:#fff;color:#1e3a5f;border:none;padding:0.75rem 1.5rem;border-radius:6px;font-weight:600;text-decoration:none;display:inline-block;margin-top:1rem;">${cta.type === 'hard' ? 'اطلب عرض سعر الآن' : 'تواصل مع فريقنا الفني'}</a>
</div>`;
}

// ========== وظائف مساعدة ==========

function buildInternalLinks(
  topic: TopicSpec,
  model: typeof models[0] | null,
  productCat: typeof productCategories[0] | undefined,
  industry: typeof industries[0] | undefined
) {
  const links = [];

  // 1. منتج/عائلة منتج
  if (productCat) {
    links.push({
      url: `/products/${topic.productFamily}`,
      anchorText: productCat.name,
      description: `صفحة عائلة ${productCat.name} مع المواصفات الكاملة وخيارات التخصيص`,
    });
  }

  // 2. صناعة/تطبيق
  if (industry) {
    links.push({
      url: `/industries/${topic.industry}`,
      anchorText: industry.name,
      description: `حلول ${industry.name} الكاملة: منتجات، تحديات، ودراسات حالة`,
    });
  }

  // 3. طلب عرض سعر
  links.push({
    url: '/quote',
    anchorText: 'طلب عرض سعر جملة',
    description: 'نموذج استفسار موحد لتحديد المواصفة والحصول على عرض خلال 24 ساعة',
  });

  // 4. موارد إضافية
  links.push({
    url: '/resources/abrasive-grit-guide',
    anchorText: 'دليل اختيار درجات الحبيبات',
    description: 'جدول مرجعي يربط درجة الغرِت بمهمة التشطيب الأساسية',
  });

  links.push({
    url: '/resources/oem-packaging-guide',
    anchorText: 'دليل تجهيز طلب OEM',
    description: 'خطوات إعداد ملف العلامة التجارية والتغليف لتسريع الاعتماد',
  });

  return links.slice(0, 5);
}

function buildExternalLinks(
  topic: TopicSpec,
  industry: typeof industries[0] | undefined,
  gccCountry: typeof gccCountries[0] | undefined
) {
  const links = [];
  const year = new Date().getFullYear();

  // معايير دولية
  links.push({
    url: 'https://www.fepa-abrasives.org',
    anchorText: 'FEPA - Federation of European Producers of Abrasives',
    source: 'FEPA',
    year,
  });

  links.push({
    url: 'https://www.iso.org/standard/74568.html',
    anchorText: 'ISO 6344:2022 - Abrasive grain size analysis',
    source: 'ISO',
    year: 2022,
  });

  // معايير خليجية
  if (gccCountry && gccCountry.code !== 'general-gcc') {
    const regulators: Record<string, { url: string; name: string }> = {
      'saudi-arabia': { url: 'https://www.saso.gov.sa', name: 'SASO - Saudi Standards, Metrology and Quality Organization' },
      'uae': { url: 'https://www.esma.gov.ae', name: 'ESMA - Emirates Authority for Standardization and Metrology' },
      'qatar': { url: 'https://www.moc.gov.qa', name: 'Qatar Standards (MoC)' },
      'kuwait': { url: 'https://www.kowsar.kw', name: 'KOWSAR - Kuwait Institute for Scientific Research' },
      'bahrain': { url: 'https://www.bahrain.bh', name: 'Bahrain Standards' },
      'oman': { url: 'https://www.dgssm.gov.om', name: 'DGSSM - Oman Directorate General of Specifications and Measurements' },
    };
    const reg = regulators[gccCountry.code];
    if (reg) {
      links.push({
        url: reg.url,
        anchorText: reg.name,
        source: reg.name.split(' - ')[0],
        year,
      });
    }
  }

  // سلامة مهنية
  links.push({
    url: 'https://www.osha.gov/abrasive-wheels',
    anchorText: 'OSHA - Abrasive Wheels and Tools Safety',
    source: 'OSHA',
    year,
  });

  return links.slice(0, 4);
}

function buildFAQ(
  topic: TopicSpec,
  model: typeof models[0] | null,
  productCat: typeof productCategories[0] | undefined,
  industry: typeof industries[0] | undefined,
  gccCountry: typeof gccCountries[0] | undefined
) {
  const productName = model?.name || productCat?.name || getProductFamilyNameAr(topic.productFamily);
  const industryName = industry?.name || '';
  const countryName = gccCountry?.name || '';

  const baseFAQs = [
    {
      q: `ما الفرق بين ${productName} والمنتجات المشابهة؟`,
      a: `الفرق في الشكل (حزام/قرص/إسفنج)، نظام التثبيت، ونطاق الغرِت. ${productName} مصمم لـ ${getMainApplication(topic.productFamily)}. للتفاصيل راجع جدول المقارنة أعلاه.`,
    },
    {
      q: `كيف أحدد درجة الغرِت المناسبة لـ ${industryName}؟`,
      a: `يعتمد على مرحلة العمل: إزالة (40–80)، تشطيب متوسط (100–180)، لمسة نهائية (240–400+). المادة تهم أيضاً: معدن صلب → زركونيا/سيراميك، خشب/عام → أكسيد ألومنيوم.`,
    },
    {
      q: `ما المعلومات المطلوبة لطلب عرض سعر دقيق؟`,
      a: `المنتج، المقاس، الغرِت، الحبيبات، القاعدة، التثبيت، الكمية، التطبيق، الماكينة، وجهة الشحن، شروط الدفع، شهادات مطلوبة. النموذج الكامل في قسم "نموذج طلب عرض سعر".`,
    },
    {
      q: `ما هو الحد الأدنى لكمية الطلب (MOQ)؟`,
      a: `يُحدد لكل مواصفة على حدة حسب المنتج، التخصيص، والتغليف. بشكل عام: المنتجات القياسية MOQ أقل، OEM/تخصيص أعلى. اطلب العرض للحصول على الرقم الدقيق.`,
    },
    {
      q: `كم تستغرق مدة التوريد (Lead Time)؟`,
      a: `تُحدد المدة في عرض السعر بعد اعتماد المواصفة والعينة، وتشمل الإنتاج ثم الشحن (بحري إلى ${countryName || 'الخليج'} أو جوي حسب المتطلبات). الرقم الدقيق يُرفق مع العرض.`,
    },
    {
      q: `هل تدعمون توريد OEM / علامة تجارية خاصة؟`,
      a: `نعم. نحتاج: ملف شعار فيكتور، رسومات تغليف، لغات الأسواق، مواصفات طباعة. العملية: عينة → موافقة → إنتاج كمي. التفاصيل في قسم "دليل الجملة و OEM".`,
    },
    {
      q: `هل يمكنكم توفير شهادات SASO / ESMA / GSO؟`,
      a: `نوفر شهادة مطابقة المصنع (COC) وشهادة تحليل (COA) وفق مواصفة المنتج. اعتماد SASO/ESMA/GSO في بلد الاستيراد مسؤولية المستورد، ونحن نتعاون بتقديم الوثائق المطلوبة.`,
    },
  ];

  // إضافة FAQ خاص بالنوع
  const typeFAQs: Record<string, Array<{q: string, a: string}>> = {
    'gcc-regional-sourcing': [
      { q: `هل لديكم مخزن أو مكتب في ${countryName}؟`, a: `لا. جميع الشحنات تصدر من مصنعنا في الصين (هوبي، شيانينغ). لا نملك مخزوناً محلياً، مكتباً، أو موزعاً حصرياً في ${countryName}.` },
      { q: `ما الميناء الأفضل للاستيراد إلى ${countryName}؟`, a: `الميناء الرئيسي: ${getMainPort(gccCountry?.code)}. ننسق مع وكيل الشحن لتخليص فعّال.` },
    ],
    'troubleshooting': [
      { q: `الحزام ينحرف باستمرار، ما الحل؟`, a: `افحص: محاذاة البكرات، اتجاه الوصل، تآكل البكرات، نظافة الأسطح. 90% من حالات الانحراف تحل بمحاذاة صحيحة وبكرات نظيفة.` },
      { q: `القرص يسد (Loading) بسرعة، ماذا أفعل؟`, a: `جرّب: 1) قرص شبكي للشفط الأفضل 2) تقليل الضغط 3) مبرد/ماء إن أمكن 4) درجة غرِت أخشن للمرحلة الأولى 5) تنظيف فلتر الشفط.` },
    ],
    'process-tutorial': [
      { q: `هل يجب تنظيف السطح بين كل درجة غرِت؟`, a: `نعم، ضروري. بقايا الغرِت الخشن تخدش السطح عند الانتقال للدرجة الأنعم. استخدم هواء مضغوط أو ممسحة نظيفة جافة.` },
    ],
  };

  const extraFAQs = typeFAQs[topic.articleType] || [];

  // 行业专属 FAQ（site.ts industries.faq，7 行业全覆盖）：让 FAQ 随行业变化
  const industryFAQs = industry?.faq?.map(f => ({ q: f.q, a: f.a })) || [];

  // 型号专属 FAQ（来自 models.ts 的已验证数据）：让 FAQ 随型号变化
  const modelFAQs = model?.faq?.slice(0, 2).map(f => ({ q: f.q, a: f.a })) || [];

  // 种子滑窗：baseFAQs 7 条中取 4 条（窗口起点随 slug 变化）→ 同类型文章 FAQ 组合不同
  const fSeed = seedOf(topic.slug, 1_000_000);
  const win = fSeed % baseFAQs.length;
  const baseWindow = [0, 1, 2, 3].map(i => baseFAQs[(win + i) % baseFAQs.length]);

  return [...modelFAQs, ...industryFAQs, ...baseWindow, ...extraFAQs].slice(0, 8);
}

function buildSpecsTable(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined) {
  if (!model) return undefined;

  return [
    { المعلمة: 'المنتج', القيمة: model?.name || productCat?.name || getProductFamilyNameAr(topic.productFamily) },
    { المعلمة: 'المقاس', القيمة: model.sizeAr },
    { المعلمة: 'نطاق الغرِت', القيمة: model.gritRange.join(' – ') },
    { المعلمة: 'النوع', القيمة: model.type === 'belt' ? 'حزام' : 'قرص' },
    { المعلمة: 'القاعدة', القيمة: model.backing },
    { المعلمة: 'التثبيت', القيمة: model.attachment },
    { المعلمة: 'التطبيقات', القيمة: model.useCases.join('، ') },
  ];
}

function buildInfoBoxes(
  topic: TopicSpec,
  model: typeof models[0] | null,
  productCat: typeof productCategories[0] | undefined,
  industry: typeof industries[0] | undefined,
  gccCountry: typeof gccCountries[0] | undefined
) {
  const boxes = [];
  const productName = model?.name || productCat?.name || getProductFamilyNameAr(topic.productFamily);

  // Quick Answer
  boxes.push({
    type: 'quick-answer' as const,
    title: 'إجابة سريعة',
    content: [
      `المنتج: ${productName}`,
      `الغرِت الشائع: ${getCommonGritRange(topic.productFamily)}`,
      `التطبيق الرئيسي: ${getMainApplication(topic.productFamily)}`,
      `نظام التثبيت: ${model?.attachment || 'هوك آند لوب / PSA / شبكي'}`,
    ],
  });

  // Spec Checklist
  boxes.push({
    type: 'spec-checklist' as const,
    title: 'قائمة مواصفات للتحقق قبل الطلب',
    content: [
      '☐ المنتج والعائلة',
      '☐ المقاس الدقيق (مم/إنش)',
      '☐ درجة/درجات الغرِت (FEPA P)',
      '☐ نوع الحبيبات (Al₂O₃ / ZrO₂ / سيراميك / SiC)',
      '☐ القاعدة (قماش / ورق / بوليمر)',
      '☐ نظام التثبيت (هوك آند لوب / PSA / شبكي)',
      '☐ الكمية والتكرار',
      '☐ التطبيق / مادة القطعة',
      '☐ طراز الماكينة + طريقة الوصل',
      '☐ وجهة الشحن (الميناء/المدينة)',
      '☐ متطلبات OEM / تغليف',
      '☐ شهادات مطلوبة (COC/COA/SASO/ESMA/GSO)',
    ],
  });

  // Inquiry Checklist
  boxes.push({
    type: 'inquiry-checklist' as const,
    title: 'نموذج استفسار جاهز للنسخ',
    content: [
      `منتج: ${productName}`,
      `مقاس: [املأ]`,
      `غرِت: [املأ]`,
      `كمية: [وحدات/فترة]`,
      `تطبيق: [مادة + مرحلة]`,
      `ماكينة: [طراز + تثبيت]`,
      `شحن إلى: [ميناء/مدينة]`,
      `دفع: [LC/TT/أخرى]`,
    ],
  });

  return boxes.slice(0, 3);
}

function buildInlineInfoBoxes(topic: TopicSpec, sectionIdx: number): string {
  // إدراج معلوماتي في بداية المقال أو بعد أول H2
  if (sectionIdx === 0) {
    return `
<div class="info-box quick-answer" style="background:#eff6ff;border-right:4px solid #3b82f6;padding:1rem;margin:1.5rem 0;border-radius:0 8px 8px 0;">
  <strong>الخلاصة السريعة:</strong> هذا المقال يغطي ${topic.title}. النقاط الجوهرية في جدول المواصفات، قائمة التحقق، ونموذج الاستفسار أدناه.
</div>`;
  }
  return '';
}

function buildVoiceSearchQueries(
  topic: TopicSpec,
  model: typeof models[0] | null,
  productCat: typeof productCategories[0] | undefined,
  industry: typeof industries[0] | undefined,
  gccCountry: typeof gccCountries[0] | undefined
): string[] {
  const productName = model?.name || productCat?.name || getProductFamilyNameAr(topic.productFamily);
  const industryName = industry?.name || '';
  const countryName = gccCountry?.name || '';

  return [
    `ما أفضل ${productName} لـ ${industryName}؟`,
    `كيف أختار درجة الغرِت لـ ${productName}؟`,
    `كم سعر ${productName} بالجملة في ${countryName || 'الخليج'}؟`,
    `أين أجد مورد ${productName} موثوق؟`,
    `ما مواصفات ${productName} للـ ${industryName}؟`,
  ];
}

function buildCTA(
  topic: TopicSpec,
  model: typeof models[0] | null,
  productCat: typeof productCategories[0] | undefined
) {
  const productName = model?.name || productCat?.name || getProductFamilyNameAr(topic.productFamily);
  const isHard = ['product-spec-detail', 'procurement-guide', 'wholesale-oem-guide', 'gcc-regional-sourcing', 'buying-guide', 'product-comparison', 'faq-buyers-guide'].includes(topic.articleType);
  const cv = seedOf(topic.slug, 1_000_000);
  const pick = <T,>(arr: T[]) => pickBySeed(arr, cv, arr.length) ?? arr[0];

  if (isHard) {
    return {
      type: 'hard' as const,
      text: pick([
        `اطلب عرض سعر جملة لـ ${productName}. أرفق النوع، الأبعاد، درجة الغرِت، القاعدة/التثبيت، الكمية، التطبيق، وجهة الشحن، ومتطلبات OEM إن وجدت.`,
        `لطلب جملة على ${productName}: حدد المقاس، الغرِت، نظام التثبيت، الكمية التقديرية، وجهة الشحن. سيراجع الفريق المواصفة ويرد بعرض سعر.`,
        `جهز ملف المواصفة لـ ${productName} (الأبعاد، الغرِت، التثبيت، الكمية، وجهة الشحن) واطلب عرض الجملة — يتضمن خيارات OEM والتغليف عند الحاجة.`,
      ]),
      targetUrl: '/quote',
    };
  } else {
    return {
      type: 'soft' as const,
      text: pick([
        `هل لديك استفسار فني عن ${productName}؟ شاركنا مادة القطعة، مرحلة العمل، والماكينة لنوصي بالمواصفة الأنسب.`,
        `اسأل فنيًا عن ${productName}: أرسل المادة، مرحلة التشغيل، ونوع الماكينة، وسنحدد الغرّت والقاعدة المناسبة دون افتراض.`,
        `محتار في اختيار ${productName}؟ صِفتنا فنية: أرسَل تطبيقك (المادة + الماكينة + المرحلة) ونقترح المواصفة مع تسلسل الغرِت.`,
      ]),
      targetUrl: '/quote',
    };
  }
}

function buildMetaDescription(topic: TopicSpec, model: typeof models[0] | null, productCat: typeof productCategories[0] | undefined): string {
  const productName = model?.name || productCat?.name || t(topic.productFamily);
  const industryName = industrySegments.find(i => i.code === topic.industry)?.name || '';
  const countryName = gccCountries.find(c => c.code === topic.gccCountry)?.name || '';

  let desc = `${topic.title}. مواصفات ${productName}`;

  if (industryName) desc += ` لتطبيقات ${industryName}`;
  if (countryName && countryName !== 'الخليج العربي') desc += ` في ${countryName}`;

  desc += `. درجات الغرِت، القاعدة، التثبيت، MOQ، مهلة التوريد، وخطوات الطلب.`;

  return desc.slice(0, 160);
}

// ========== دوال مساعدة بيانات ==========

function getAlternativeProduct(productFamily: string): string {
  const map: Record<string, string> = {
    'abrasive-belts': 'أقراص الصنفرة',
    'flap-discs': 'أحزمة الصنفرة',
    'sanding-discs': 'أحزمة الصنفرة',
    'hook-loop': 'أقراص لاصق PSA',
    'sanding-sponges': 'أقراص الصنفرة',
  };
  return map[productFamily] || 'المنتج البديل';
}

function getMainApplication(productFamily: string): string {
  const map: Record<string, string> = {
    'abrasive-belts': 'تشطيب الحواف والألواح (خشب/معدن) بماكينات الحزام',
    'flap-discs': 'إزالة الصدأ، اللحام، وتشطيب المعادن بالزاوية',
    'sanding-discs': 'تشطيب الأسطح المستوية، تجهيز للدهان',
    'hook-loop': 'تغيير سريع للدرجات على الأسطح المستوية',
    'sanding-sponges': 'الحواف، المنحنيات، والتشطيب اليدوي الدقيق',
  };
  return map[productFamily] || 'تطبيقات صناعية عامة';
}

function getWorkpieceMaterials(industryCode: string): string[] {
  const map: Record<string, string[]> = {
    'woodworking': ['خشب ناعم', 'خشب صلب', 'MDF', 'خشب رقائقي', 'باركيه'],
    'metalworking': ['فولاذ كربوني', 'ستانلس ستيل', 'ألومنيوم', 'حديد زهر', 'تيتانيوم'],
    'automotive': ['صفائح فولاذ', 'ألومنيوم', 'بلاستيك مقوى', 'معادن مطلية'],
    'shipbuilding': ['ألواح فولاذ بحرية', 'ستانلس ستيل', 'ألومنيوم بحري'],
    'oil-gas': ['أنابيب كربونية', 'ستانلس ستيل', 'سبائك نيكيل', 'صلب عالي القوة'],
    'construction': ['خشب', 'لوح جصي', 'أسمنت', 'حجر', 'بلاط'],
    'general': ['متنوع'],
  };
  return map[industryCode] || ['متنوع'];
}

function getGrainTypes(productFamily: string): string[] {
  const map: Record<string, string[]> = {
    'abrasive-belts': ['أكسيد الألومنيوم', 'زركونيا ألومينا', 'سيراميك', 'كربيد السيليكون (SiC)'],
    'flap-discs': ['أكسيد الألومنيوم', 'زركونيا ألومينا', 'سيراميك'],
    'sanding-discs': ['أكسيد الألومنيوم', 'كربيد السيليكون (SiC)', 'زركونيا ألومينا'],
    'hook-loop': ['أكسيد الألومنيوم', 'كربيد السيليكون (SiC)'],
    'sanding-sponges': ['أكسيد الألومنيوم', 'كربيد السيليكون (SiC)'],
  };
  return map[productFamily] || ['أكسيد الألومنيوم'];
}

function getCommonGritRange(productFamily: string): string {
  const map: Record<string, string> = {
    'abrasive-belts': '40–800',
    'flap-discs': '40–320',
    'sanding-discs': '60–5000',
    'hook-loop': '60–5000',
    'sanding-sponges': '60–3000',
  };
  return map[productFamily] || '60–800';
}

function getProductFamilyNameAr(productFamily: string): string {
  const map: Record<string, string> = {
    'abrasive-belts': 'أحزمة الصنفرة',
    'flap-discs': 'أقراص كوت (Flap Discs)',
    'sanding-discs': 'أقراص الصنفرة',
    'hook-loop': 'أقراص هوك آند لوب',
    'sanding-sponges': 'إسفنجيات صنفرة',
  };
  return map[productFamily] || productFamily;
}

function getMainPort(countryCode: string | undefined): string {
  const ports: Record<string, string> = {
    'saudi-arabia': 'جدة الإسلامي / الملك عبدالعزيز (الدمام)',
    'uae': 'جبل علي',
    'qatar': 'حمد',
    'kuwait': 'الشويخ',
    'bahrain': 'خليفة بن سلمان',
    'oman': 'صلالة / صحار',
  };
  return ports[countryCode || ''] || 'الميناء الرئيسي';
}

function getLocalRegulator(countryCode: string): string {
  const regulators: Record<string, string> = {
    'saudi-arabia': 'SASO',
    'uae': 'ESMA',
    'qatar': 'Qatar Standards (MoC)',
    'kuwait': 'KOWSAR',
    'bahrain': 'Bahrain Standards',
    'oman': 'DGSSM',
  };
  return regulators[countryCode] || 'الجهة المحلية للمعايير';
}

// ========== دالة رئيسية للاختبار ==========

export function generateSampleArticles(count: number = 10): GeneratedArticle[] {
  const samples = topicMatrix.slice(0, count);
  return samples.map(topic => generateArticle(topic));
}