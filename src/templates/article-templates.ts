/**
 * 13 种文章类型的模板系统
 * 每个模板包含：结构大纲、必含模块、变量插槽、术语约束
 */

export interface ArticleTemplate {
  type: string;
  name: string;
  description: string;
  structure: string[]; // H2 级大纲
  requiredModules: string[]; // 必含模块：BLUF, 直接回答块, 表格, 信息块, FAQ, CTA
  variableSlots: string[]; // 可插入变量
  terminologyConstraints: string[]; // 术语表强制词
  minWordCount: number;
  maxWordCount: number;
  ctaType: 'hard' | 'soft';
  buyerJourneyStage: 'understanding' | 'evaluation' | 'comparison' | 'sourcing';
}

export const articleTemplates: Record<string, ArticleTemplate> = {
  'product-comparison': {
    type: 'product-comparison',
    name: '产品对比',
    description: '两种产品/方案的深度对比，帮助买家按工艺选型',
    structure: [
      'إجابة مباشرة: متى تختار أ ومتى تختار ب',
      'جدول الفروقات الجوهرية',
      'شجرة قرار سيناريوهات التطبيق',
      'تحليل معمق لمعايير المواصفات',
      'أخطاء شائعة في الاختيار وكيفية تجنبها',
      'قائمة تحقق قبل اعتماد الطلب',
      'الأسئلة الشائعة',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'comparison-table', 'decision-tree', 'spec-table', 'common-mistakes', 'inquiry-checklist', 'FAQ', 'CTA'],
    variableSlots: ['productA', 'productB', 'application', 'material', 'gritRange', 'machineType', 'attachmentSystem'],
    terminologyConstraints: ['أحزمة الصنفرة', 'أقراص الصنفرة', 'درجة الغرِت', 'القاعدة', 'نظام التثبيت', 'مواصفات FEPA'],
    minWordCount: 1200,
    maxWordCount: 2000,
    ctaType: 'hard',
    buyerJourneyStage: 'comparison',
  },

  'multi-product-comparison': {
    type: 'multi-product-comparison',
    name: '多产品横向对比',
    description: '同类产品不同变体（背板、结合剂、孔型、固定方式）的矩阵对比',
    structure: [
      'إجابة مباشرة: الفرق الجوهري في جملة واحدة',
      'مصفوفة مقارنة متعددة الأبعاد',
      'تفصيل كل متغير لظروف التشغيل المناسبة',
      'تحليل مقايضة الأداء والتكلفة',
      'جدول توافق الماكينات',
      'توصيات للشراء بالجملة',
      'الأسئلة الشائعة',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'comparison-table', 'spec-table', 'compatibility-table', 'procurement-advice', 'FAQ', 'CTA'],
    variableSlots: ['productFamily', 'variants', 'backingTypes', 'bondTypes', 'holePatterns', 'attachmentSystems', 'machineModels'],
    terminologyConstraints: ['قاعدة القماش أو الورق', 'رابطة إسفنجية', 'شبكة معدنية', 'هوك آند لوب', 'لصق ذاتي (PSA)'],
    minWordCount: 1500,
    maxWordCount: 2500,
    ctaType: 'hard',
    buyerJourneyStage: 'comparison',
  },

  'buying-guide': {
    type: 'buying-guide',
    name: '选购指南',
    description: '按工艺、材质、机器、预算维度的选型决策指南',
    structure: [
      'إجابة مباشرة: ثلاث خطوات لتحديد المواصفة',
      'مخطط تدفق قرار الاختيار (نسخة نصية)',
      'جدول المقاييس الرئيسية',
      'تسلسل الغرِت المقترح حسب المادة/العملية',
      'قائمة تحقق توافق الماكينة',
      'معايير تقييم العينة',
      'قائمة المعلومات المطلوبة قبل طلب العرض',
      'الأسئلة الشائعة',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'decision-flow', 'spec-table', 'grit-sequence-table', 'compatibility-checklist', 'sample-evaluation', 'inquiry-checklist', 'FAQ', 'CTA'],
    variableSlots: ['productFamily', 'workpieceMaterials', 'processSteps', 'machineTypes', 'budgetRanges', 'gritProgressions'],
    terminologyConstraints: ['درجة الغرِت', 'مراحل التشطيب', 'إزالة المادة', 'التشطيب المتوسط', 'اللمسة النهائية', 'حد أدنى لكمية الطلب'],
    minWordCount: 1800,
    maxWordCount: 2500,
    ctaType: 'hard',
    buyerJourneyStage: 'evaluation',
  },

  'technical-guide': {
    type: 'technical-guide',
    name: '技术科普',
    description: '磨料颗粒、目数体系、背板、结合剂、孔型、固定方式的原理深度解析',
    structure: [
      'إجابة مباشرة: المفهوم الجوهري في 3 جمل',
      'تحليل معمق للمبادئ التقنية',
      'مقارنة منظومات المعايير (FEPA/ANSI/JIS)',
      'كيف تؤثر المعامل على الأداء',
      'تفنيد المفاهيم التقنية الخاطئة الشائعة',
      'جدول مواصفات مرجعي سريع',
      'الأسئلة الشائعة',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'technical-deep-dive', 'standards-table', 'parameter-impact', 'myth-busting', 'spec-checklist', 'FAQ', 'CTA'],
    variableSlots: ['technicalTopic', 'grainTypes', 'standards', 'parameters', 'performanceMetrics'],
    terminologyConstraints: ['حبيبات الماس الصناعي', 'كربيد السيليكون (SiC)', 'مواصفات FEPA', 'المعايير الدولية ISO', 'رابطة إسفنجية', 'قاعدة القماش أو الورق'],
    minWordCount: 1200,
    maxWordCount: 2000,
    ctaType: 'soft',
    buyerJourneyStage: 'understanding',
  },

  'application-guide': {
    type: 'application-guide',
    name: '应用指南',
    description: '针对特定行业/工况（钢结构、造船、油气、木工、汽车）的完整工艺方案',
    structure: [
      'إجابة مباشرة: نقاط الألم والحلول الأساسية في القطاع',
      'تفصيل العمليات الصناعية النموذجية',
      'تركيبة المنتجات المقترحة وتسلسل الغرِت',
      'إعدادات المعامل التشغيلية المقترحة',
      'نقاط السلامة والامتثال (SASO/ESMA/GSO)',
      'مقترحات تحسين التكلفة',
      'نموذج مواصفة المشتريات',
      'الأسئلة الشائعة',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'process-breakdown', 'product-recommendation-table', 'grit-sequence-table', 'safety-compliance', 'cost-optimization', 'procurement-template', 'FAQ', 'CTA'],
    variableSlots: ['industry', 'workpieceMaterials', 'processSteps', 'recommendedProducts', 'gritProgressions', 'safetyStandards', 'gccCountry'],
    terminologyConstraints: ['تهيئة الأسطح', 'إزالة الشavings والحواف', 'تصنيع المعادن', 'حوض سفن', 'صيانة سفن', 'قطاع النفط والغاز', 'معدات الوقاية الشخصية', 'مواصفات FEPA'],
    minWordCount: 1500,
    maxWordCount: 2500,
    ctaType: 'hard',
    buyerJourneyStage: 'evaluation',
  },

  'process-tutorial': {
    type: 'process-tutorial',
    name: '工序/工艺教程',
    description: '分步骤的打磨序列、目数递进、去毛刺、表面制备操作指导',
    structure: [
      'إجابة مباشرة: نظرة عامة على سير العملية القياسية',
      'دليل تشغيل تفصيلي خطوة بخطوة (مع المعامل)',
      'مبادئ وجدول تسلسل الغرِت التصاعدي',
      'نقاط التحكم الحرجة ومعايير فحص الجودة',
      'عيوب التصنيع الشائعة وطرق معالجتها',
      'نقاط الضبط لمواد مختلفة',
      'تنبيهات السلامة أثناء التشغيل',
      'الأسئلة الشائعة',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'step-by-step', 'grit-progression-table', 'quality-control', 'defect-troubleshooting', 'material-adjustments', 'safety', 'FAQ', 'CTA'],
    variableSlots: ['processName', 'steps', 'gritProgressions', 'machineSettings', 'qualityCriteria', 'defectTypes', 'materials'],
    terminologyConstraints: ['مراحل التشطيب', 'درجة الغرِت', 'إزالة المادة', 'التشطيب المتوسط', 'اللمسة النهائية', 'تهيئة الأسطح', 'معدات الوقاية الشخصية'],
    minWordCount: 1200,
    maxWordCount: 2000,
    ctaType: 'soft',
    buyerJourneyStage: 'understanding',
  },

  'troubleshooting': {
    type: 'troubleshooting',
    name: '故障排查',
    description: '磨损过快、堵塞、砂带跑偏、除尘不良等问题的诊断与对策',
    structure: [
      'إجابة مباشرة: جدول سريع العطل-السبب-الحل',
      'تصنيف مظاهر العطل ومنطق التشخيص',
      'تحليل معمق لكل عطل على حدة',
      'قائمة تحقق الأسباب الجذرية',
      'مقترحات الصيانة الوقائية',
      'متى تتصعد للدعم الفني للمورد',
      'الأسئلة الشائعة',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'troubleshooting-table', 'root-cause-analysis', 'preventive-maintenance', 'support-escalation', 'FAQ', 'CTA'],
    variableSlots: ['productFamily', 'failureModes', 'rootCauses', 'correctiveActions', 'preventiveMeasures', 'machineTypes'],
    terminologyConstraints: ['تحميل الغبار', 'انحراف الحزام', 'تآكل سريع', 'سحب الغبار', 'قاعدة القماش أو الورق', 'رابطة إسفنجية'],
    minWordCount: 1000,
    maxWordCount: 1800,
    ctaType: 'soft',
    buyerJourneyStage: 'evaluation',
  },

  'product-spec-detail': {
    type: 'product-spec-detail',
    name: '单产品/规格详解',
    description: '某产品族、尺寸、目数段、背板类型的全参数详解',
    structure: [
      'إجابة مباشرة: التموضع الأساسي والنطاق التطبيقي للمواصفة',
      'جدول المواصفات الكامل',
      'مبادئ التصميم والخصائص الأداءية',
      'الماكينات المتوافقة ونقاط التركيب',
      'خيارات التخصيص (الغرِت، الأبعاد، القاعدة، العلامة)',
      'معلومات الطلب: MOQ، مهلة التوريد، التغليف',
      'الأسئلة الشائعة',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'full-spec-table', 'design-principles', 'compatibility-guide', 'customization-options', 'ordering-info', 'FAQ', 'CTA'],
    variableSlots: ['productModel', 'specs', 'compatibleMachines', 'customizationOptions', 'moq', 'leadTime', 'packagingOptions'],
    terminologyConstraints: ['حد أدنى لكمية الطلب', 'مدة التوريد', 'من المصنع مباشرة', 'توريد تحت العلامة التجارية (OEM)', 'درجة الغرِت', 'القاعدة'],
    minWordCount: 1000,
    maxWordCount: 1800,
    ctaType: 'hard',
    buyerJourneyStage: 'sourcing',
  },

  'procurement-guide': {
    type: 'procurement-guide',
    name: '采购与寻源指南',
    description: 'B2B 如何规格化需求、评估样品、比价、比较供应商',
    structure: [
      'إجابة مباشرة: منهجية المشتريات الاحترافية في 5 خطوات',
      'نموذج توحيد المواصفات التقنية',
      'بطاقة تقييم العينات',
      'مصفوفة تقييم الموردين',
      'نقاط المقارنة الجوهرية في العروض',
      'بنود العقود وشروط التسليم الأساسية',
      'فخاخ المشتريات الشائعة وكيفية تجنبها',
      'الأسئلة الشائعة',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'specification-template', 'sample-evaluation-card', 'supplier-evaluation-matrix', 'quote-comparison', 'contract-terms', 'procurement-pitfalls', 'FAQ', 'CTA'],
    variableSlots: ['productFamily', 'evaluationCriteria', 'supplierTypes', 'contractTerms', 'incoterms', 'paymentTerms'],
    terminologyConstraints: ['عرض سعر / طلب عروض', 'مورد جملة', 'موزعون صناعيون', 'حد أدنى لكمية الطلب', 'مدة التوريد', 'طلب عينات', 'شهادة المطابقة', 'شهادة التحليل'],
    minWordCount: 1800,
    maxWordCount: 2500,
    ctaType: 'hard',
    buyerJourneyStage: 'sourcing',
  },

  'wholesale-oem-guide': {
    type: 'wholesale-oem-guide',
    name: '批发 / OEM 指南',
    description: '自有品牌、包装、批量采购、样品确认、供应商评估',
    structure: [
      'إجابة مباشرة: نظرة عامة على سير عمل OEM/الجملة',
      'مصفوفة خيارات تخصيص OEM',
      'مواصفات تصميم التغليف بالعلامة التجارية',
      'الحد الأدنى للكمية وشرائح الأسعار',
      'عملية ومعايير تأكيد العينة',
      'معايير فحص الجودة والاستلام',
      'تنسيق اللوجستيات والجمارك',
      'إطار مقترح للتعاون طويل الأمد',
      'الأسئلة الشائعة',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'oem-options-table', 'packaging-specs', 'moq-pricing-tiers', 'sample-approval-process', 'qa-standards', 'logistics-customs', 'partnership-framework', 'FAQ', 'CTA'],
    variableSlots: ['productFamily', 'customizationOptions', 'packagingTypes', 'moqTiers', 'sampleProcess', 'qaParameters', 'shippingTerms', 'gccCountry'],
    terminologyConstraints: ['توريد تحت العلامة التجارية (OEM)', 'مورد جملة', 'حد أدنى لكمية الطلب', 'مدة التوريد', 'طلب عينات', 'شهادة المطابقة', 'التغليف', 'العلامة التجارية'],
    minWordCount: 1800,
    maxWordCount: 2500,
    ctaType: 'hard',
    buyerJourneyStage: 'sourcing',
  },

  'industry-market': {
    type: 'industry-market',
    name: '行业与市场',
    description: '标准、安全规范、市场动态——需可靠当期信源',
    structure: [
      'إجابة مباشرة: النقاط الجوهرية في الاتجاهات/تغييرات المعايير',
      'خلفية القطاع وعوامل الدفع',
      'قراءة تحديثات المعايير الرئيسية (FEPA/ISO/SASO/ESMA/GSO)',
      'بيانات حجم السوق والنمو (باقتباس مصادر موثوقة)',
      'الاتجاهات التقنية واتجاهات ابتكار المنتج',
      'الانعكاس على قرارات المشتريات',
      'الأسئلة الشائعة',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'industry-context', 'standards-analysis', 'market-data', 'technology-trends', 'procurement-implications', 'FAQ', 'CTA'],
    variableSlots: ['industry', 'standardsUpdates', 'marketData', 'technologyTrends', 'regulatoryChanges', 'gccCountry'],
    terminologyConstraints: ['مواصفات FEPA', 'المعايير الدولية ISO', 'SASO', 'ESMA', 'GSO', 'معدات الوقاية الشخصية', 'تهيئة الأسطح'],
    minWordCount: 1500,
    maxWordCount: 2500,
    ctaType: 'soft',
    buyerJourneyStage: 'understanding',
  },

  'gcc-regional-sourcing': {
    type: 'gcc-regional-sourcing',
    name: 'GCC 地域寻源篇',
    description: '面向沙特/阿联酋/卡塔尔/科威特/巴林/阿曼的供给与物流考量',
    structure: [
      'إجابة مباشرة: 3 اعتبارات جوهرية للاستيراد إلى هذا البلد',
      'نظرة على السوق والتجمعات الصناعية الرئيسية',
      'لوائح الاستيراد ومتطلبات الامتثال (SASO/ESMA/GSO)',
      'مسارات اللوجستيات، الموانئ، وأجل التخليص',
      'نموذج الموزعين/الوكلاء المحليين',
      'أسعار الصرف، طرق الدفع، وشروط التجارة',
      'نقاط ثقافية وتجارية في التواصل',
      'إخلاء مسؤولية: ما لا نلتزم به محلياً',
      'الأسئلة الشائعة',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'market-overview', 'regulatory-compliance', 'logistics-ports', 'distribution-model', 'payment-terms', 'cultural-notes', 'disclaimer', 'FAQ', 'CTA'],
    variableSlots: ['gccCountry', 'industrialClusters', 'regulations', 'ports', 'leadTimes', 'distributors', 'paymentMethods', 'culturalTips'],
    terminologyConstraints: ['السعودية', 'الإمارات', 'قطر', 'الكويت', 'البحرين', 'عُمان', 'SASO', 'ESMA', 'GSO', 'مدة التوريد', 'مورد جملة', 'موزعون صناعيون'],
    minWordCount: 1500,
    maxWordCount: 2200,
    ctaType: 'hard',
    buyerJourneyStage: 'sourcing',
  },

  'faq-buyers-guide': {
    type: 'faq-buyers-guide',
    name: 'FAQ / 买家资源',
    description: '工业买家真实问题簇，按主题聚类的 Q&A 合集',
    structure: [
      'إجابة مباشرة: أهم 3 أسئلة بجواب مختصر',
      'الأسئلة الشائعة مجمعة حسب المحور (منتج/مواصفات/مشتريات/تقني/لوجستيات/ما بعد البيع)',
      'جدول مرجعي للقرارات الرئيسية',
      'نموذج طلب عرض سعر: تحميل/دليل استخدام',
      'بطاقة مصطلحات سريعة',
      'قنوات التواصل والتزام الاستجابة',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'themed-faq', 'decision-reference-table', 'inquiry-template', 'glossary-card', 'contact-info', 'CTA'],
    variableSlots: ['faqGroups', 'decisionCriteria', 'inquiryTemplateFields', 'glossaryTerms', 'contactChannels'],
    terminologyConstraints: ['عرض سعر / طلب عروض', 'حد أدنى لكمية الطلب', 'مدة التوريد', 'طلب عينات', 'درجة الغرِت', 'قاعدة القماش أو الورق', 'نظام التثبيت', 'توريد تحت العلامة التجارية (OEM)'],
    minWordCount: 1200,
    maxWordCount: 2000,
    ctaType: 'hard',
    buyerJourneyStage: 'comparison',
  },
};

export function getTemplate(type: string): ArticleTemplate | undefined {
  return articleTemplates[type];
}

export function getAllTemplateTypes(): string[] {
  return Object.keys(articleTemplates);
}